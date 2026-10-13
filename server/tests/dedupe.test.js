import test from 'node:test';
import assert from 'node:assert/strict';
import { deduplicateCompanies, findDuplicateGroups } from '../src/services/dedupeService.js';

const US = { country: 'United States' };

test('detects duplicates that differ only in URL formatting', () => {
  const { companies, stats } = deduplicateCompanies([
    { _id: 'a', companyName: 'ABC Software', domain: 'abcsoftware.com', location: US },
    { _id: 'b', companyName: 'ABC Software Inc.', domain: 'https://www.abcsoftware.com', location: US },
  ]);

  assert.equal(stats.groupCount, 1);
  assert.equal(stats.duplicateCount, 1);
  assert.equal(companies.find((c) => c._id === 'a').duplicateStatus, 'primary');
  assert.equal(companies.find((c) => c._id === 'b').duplicateStatus, 'probable_duplicate');
  assert.equal(companies[0].duplicateGroupId, companies[1].duplicateGroupId);
});

test('detects duplicates by normalised name when domains differ', () => {
  const { stats } = deduplicateCompanies([
    { _id: 'a', companyName: 'Ironwood Mechanical Services', domain: 'ironwoodmech.com', location: US },
    { _id: 'b', companyName: 'Ironwood Mechanical Services LLC', domain: 'ironwood-mechanical.net', location: US },
  ]);
  assert.equal(stats.groupCount, 1);
  assert.equal(stats.duplicateCount, 1);
});

test('same name in different countries is NOT a duplicate', () => {
  const { stats } = deduplicateCompanies([
    { _id: 'a', companyName: 'Apex Plumbing', domain: 'apexplumbing.com', location: { country: 'United States' } },
    { _id: 'b', companyName: 'Apex Plumbing', domain: 'apexplumbing.ca', location: { country: 'Canada' } },
  ]);
  assert.equal(stats.groupCount, 0);
  assert.equal(stats.duplicateCount, 0);
});

test('shared website-builder hosts are not treated as a domain match', () => {
  // Two unrelated businesses both on wixsite.com must stay separate records.
  const { stats } = deduplicateCompanies([
    { _id: 'a', companyName: 'Larkspur Home Crew', domain: 'larkspurhome.wixsite.com', location: US },
    { _id: 'b', companyName: 'Thornton Pest Pro', domain: 'thorntonpest.wixsite.com', location: US },
  ]);
  assert.equal(stats.duplicateCount, 0);
});

test('nothing is deleted — every input record is returned', () => {
  const input = [
    { _id: 'a', companyName: 'ABC', domain: 'abc.com', location: US },
    { _id: 'b', companyName: 'ABC Inc', domain: 'www.abc.com', location: US },
    { _id: 'c', companyName: 'Zephyr', domain: 'zephyr.io', location: US },
  ];
  const { companies } = deduplicateCompanies(input);
  assert.equal(companies.length, 3);
  assert.equal(companies.find((c) => c._id === 'c').duplicateStatus, 'unique');
});

test('the oldest record becomes primary', () => {
  const { companies } = deduplicateCompanies([
    { _id: 'new', companyName: 'ABC', domain: 'abc.com', location: US, createdAt: '2026-05-01' },
    { _id: 'old', companyName: 'ABC Inc', domain: 'abc.com', location: US, createdAt: '2024-01-01' },
  ]);
  assert.equal(companies.find((c) => c._id === 'old').duplicateStatus, 'primary');
  assert.equal(companies.find((c) => c._id === 'new').duplicateStatus, 'probable_duplicate');
});

test('three-way duplicates land in a single group', () => {
  const { groups } = findDuplicateGroups([
    { _id: 1, companyName: 'ABC', domain: 'abc.com', location: US },
    { _id: 2, companyName: 'ABC Inc', domain: 'www.abc.com', location: US },
    { _id: 3, companyName: 'ABC LLC', domain: 'https://abc.com/home', location: US },
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].members.length, 3);
});

test('a duplicate carries a human-readable reason', () => {
  const { companies } = deduplicateCompanies([
    { _id: 'a', companyName: 'ABC Software', domain: 'abc.com', location: US },
    { _id: 'b', companyName: 'ABC Software Inc', domain: 'www.abc.com', location: US },
  ]);
  const dup = companies.find((c) => c.duplicateStatus === 'probable_duplicate');
  assert.match(dup.duplicateMatchReason, /abc\.com/);
  assert.match(dup.duplicateMatchReason, /ABC Software/);
});
