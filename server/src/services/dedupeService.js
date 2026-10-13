/**
 * Deduplication.
 *
 * Lead data arrives from multiple sources and the same business shows up as
 * "ABC Software" / abcsoftware.com and "ABC Software Inc." / https://www.abcsoftware.com.
 * Exact string comparison misses both cases, so matching is done on normalised
 * keys instead.
 *
 * Deliberate product decision: this never deletes. The oldest record in a group
 * is marked `primary` and the rest `probable_duplicate`, with the matching
 * reason recorded. Silent deletion of a record a searcher may have already
 * acted on is a far worse failure than showing them a flagged duplicate, and
 * "probable" is an honest description of what a heuristic can actually claim.
 */

import { normalizeDomain, normalizeCompanyName, isSharedHost } from '../utils/normalize.js';

/**
 * Group companies that probably refer to the same business.
 *
 * Matching precedence:
 *   1. Identical normalised domain — the strongest available signal, because a
 *      domain is owned. Shared website-builder hosts are excluded, since
 *      thousands of unrelated businesses share wixsite.com.
 *   2. Identical normalised company name AND the same country — a weaker signal
 *      used only when a domain match is unavailable. Country is required
 *      because "Apex Plumbing" in Texas and in Ontario are different companies.
 *
 * @param {object[]} companies Plain objects with at least domain, companyName, location.
 * @returns {{ groups: Array, assignments: Map<any, object> }}
 */
export function findDuplicateGroups(companies = []) {
  const byDomain = new Map();
  const byName = new Map();

  for (const company of companies) {
    const domain = normalizeDomain(company.domain);
    if (domain && !isSharedHost(domain)) {
      if (!byDomain.has(domain)) byDomain.set(domain, []);
      byDomain.get(domain).push(company);
    }

    const name = normalizeCompanyName(company.companyName);
    const country = (company.location?.country || '').toLowerCase().trim();
    if (name) {
      const key = `${name}::${country}`;
      if (!byName.has(key)) byName.set(key, []);
      byName.get(key).push(company);
    }
  }

  const groups = [];
  const seen = new Set();
  const idOf = (c) => String(c._id ?? c.id ?? c.domain ?? c.companyName);

  const addGroup = (members, matchedOn, reasonFor) => {
    if (members.length < 2) return;
    // Skip if every member already belongs to a group found by a stronger rule.
    if (members.every((m) => seen.has(idOf(m)))) return;

    const fresh = members.filter((m) => !seen.has(idOf(m)));
    if (fresh.length < 2) return;

    fresh.forEach((m) => seen.add(idOf(m)));
    groups.push({
      groupId: `dup_${matchedOn}_${groups.length + 1}`,
      matchedOn,
      members: fresh,
      reason: reasonFor(fresh),
    });
  };

  for (const [domain, members] of byDomain) {
    addGroup(members, 'domain', () => `Shares the normalised domain ${domain}`);
  }
  for (const [key, members] of byName) {
    const [name] = key.split('::');
    addGroup(members, 'name', () => `Same normalised company name "${name}" in the same country`);
  }

  // Resolve each group into per-record assignments.
  const assignments = new Map();
  for (const group of groups) {
    // The earliest-created record wins as primary; it is the one a user is most
    // likely to have already seen or saved.
    const ordered = [...group.members].sort((a, b) => {
      const aTime = new Date(a.createdAt || 0).getTime();
      const bTime = new Date(b.createdAt || 0).getTime();
      if (aTime !== bTime) return aTime - bTime;
      return String(a.companyName).localeCompare(String(b.companyName));
    });

    ordered.forEach((member, index) => {
      assignments.set(idOf(member), {
        duplicateGroupId: group.groupId,
        duplicateStatus: index === 0 ? 'primary' : 'probable_duplicate',
        duplicateMatchReason:
          index === 0
            ? `Primary record for ${ordered.length} matching entries. ${group.reason}.`
            : `${group.reason}. Primary record: ${ordered[0].companyName}.`,
      });
    });
  }

  return { groups, assignments };
}

/**
 * Apply duplicate detection to a list of companies, returning a new list.
 * Records with no match are explicitly set to `unique` rather than left alone,
 * so a re-run after data changes clears stale flags.
 */
export function deduplicateCompanies(companies = []) {
  const { groups, assignments } = findDuplicateGroups(companies);
  const idOf = (c) => String(c._id ?? c.id ?? c.domain ?? c.companyName);

  const result = companies.map((company) => {
    const assignment = assignments.get(idOf(company));
    return {
      ...company,
      duplicateGroupId: assignment?.duplicateGroupId ?? null,
      duplicateStatus: assignment?.duplicateStatus ?? 'unique',
      duplicateMatchReason: assignment?.duplicateMatchReason ?? '',
    };
  });

  return {
    companies: result,
    stats: {
      groupCount: groups.length,
      duplicateCount: result.filter((c) => c.duplicateStatus === 'probable_duplicate').length,
      primaryCount: result.filter((c) => c.duplicateStatus === 'primary').length,
      uniqueCount: result.filter((c) => c.duplicateStatus === 'unique').length,
    },
  };
}
