/**
 * Seed script.
 *
 * Safety is the first concern here, not convenience. This script writes to the
 * database MONGO_URI points at, so before it touches anything it:
 *
 *   1. refuses to run unless the database is named `caprae_lead_intelligence`
 *   2. prints the resolved host and database name it is about to write to
 *   3. only ever clears the three collections this project owns
 *
 * It never calls dropDatabase(), never drops a collection, and never issues an
 * unscoped deleteMany against anything it did not create.
 */

import mongoose from 'mongoose';
import { env, EXPECTED_DB_NAME } from '../config/env.js';
import { connectDatabase, assertProjectDatabase, databaseNameFromUri } from '../config/db.js';
import { Company } from '../models/Company.js';
import { BuyBox } from '../models/BuyBox.js';
import { SavedLead } from '../models/SavedLead.js';
import { buildDemoCompanies } from './companyData.js';
import { deduplicateCompanies } from '../services/dedupeService.js';
import { DEFAULT_BUY_BOX } from '../config/scoring.config.js';

/** Collections this project is allowed to clear. Nothing else is touched. */
const OWNED_MODELS = [
  { model: Company, name: 'companies' },
  { model: BuyBox, name: 'buyboxes' },
  { model: SavedLead, name: 'savedleads' },
];

async function seed() {
  // --- Guard 1: the URI must name this project's database -----------------
  const targetDb = databaseNameFromUri(env.mongoUri);
  assertProjectDatabase();

  const safeUri = env.mongoUri.replace(/\/\/[^@]*@/, '//***:***@');
  console.log('─'.repeat(70));
  console.log('Caprae Lead Intelligence — database seed');
  console.log('─'.repeat(70));
  console.log(`  target URI : ${safeUri}`);
  console.log(`  database   : ${targetDb}`);
  console.log(`  collections: ${OWNED_MODELS.map((m) => m.name).join(', ')}`);
  console.log('─'.repeat(70));

  const connection = await connectDatabase();

  // --- Guard 2: re-check after connecting, against what the driver resolved -
  if (connection.name !== EXPECTED_DB_NAME) {
    throw new Error(
      `Connected to "${connection.name}" but expected "${EXPECTED_DB_NAME}". Aborting without writing.`
    );
  }

  // --- Clear only this project's collections -------------------------------
  for (const { model, name } of OWNED_MODELS) {
    const removed = await model.deleteMany({});
    console.log(`  cleared ${name}: ${removed.deletedCount} documents`);
  }

  // --- Build, deduplicate, insert ------------------------------------------
  const companies = buildDemoCompanies();
  const { companies: flagged, stats } = deduplicateCompanies(companies);

  await Company.insertMany(flagged, { ordered: false });
  await Company.syncIndexes();

  await BuyBox.create({ ...DEFAULT_BUY_BOX, isActive: true });

  // --- Report ---------------------------------------------------------------
  const industries = await Company.distinct('industry');
  const withoutRevenue = await Company.countDocuments({ revenueEstimate: null });
  const unreachable = await Company.countDocuments({ websiteStatus: 'unreachable' });

  console.log('─'.repeat(70));
  console.log(`  inserted           : ${flagged.length} companies`);
  console.log(`  industries         : ${industries.length}`);
  console.log(`  duplicate groups   : ${stats.groupCount}`);
  console.log(`  probable duplicates: ${stats.duplicateCount}`);
  console.log(`  missing revenue    : ${withoutRevenue}`);
  console.log(`  unreachable sites  : ${unreachable}`);
  console.log(`  active Buy Box     : ${DEFAULT_BUY_BOX.name}`);
  console.log('─'.repeat(70));
  console.log('  Seed complete. Start the API with: npm run dev');
  console.log('');
}

seed()
  .then(async () => {
    await mongoose.connection.close();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('\n  Seed failed:', error.message, '\n');
    if (mongoose.connection.readyState === 1) await mongoose.connection.close();
    process.exit(1);
  });
