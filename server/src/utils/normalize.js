/**
 * Normalisation helpers used by deduplication and search.
 *
 * These are pure functions with no database or framework dependency, which is
 * what makes the deduplication logic unit-testable in isolation.
 */

/** Legal-entity suffixes stripped before comparing company names. */
const LEGAL_SUFFIXES = [
  'incorporated', 'inc', 'corporation', 'corp', 'company', 'co',
  'limited', 'ltd', 'llc', 'llp', 'lp', 'plc', 'gmbh', 'bv', 'nv',
  'sa', 'ag', 'pty', 'holdings', 'holding', 'group', 'enterprises',
  'enterprise', 'international', 'intl',
];

/** Hosts that are shared platforms, never a company's own identity. */
const SHARED_HOSTS = new Set([
  'wixsite.com', 'squarespace.com', 'wordpress.com', 'weebly.com',
  'blogspot.com', 'godaddysites.com', 'business.site',
]);

/**
 * Reduce any URL or host string to a bare, comparable domain.
 *
 *   https://www.Example.com/about?x=1  ->  example.com
 *   http://example.com/               ->  example.com
 *   WWW.EXAMPLE.COM                   ->  example.com
 *
 * Returns '' for anything unusable, so callers can treat a missing domain and
 * an unparseable one identically.
 */
export function normalizeDomain(input) {
  if (typeof input !== 'string') return '';

  let value = input.trim().toLowerCase();
  if (!value) return '';

  value = value.replace(/^[a-z][a-z0-9+.-]*:\/\//, ''); // strip scheme
  value = value.replace(/^[^/@]*@/, '');                // strip userinfo
  value = value.split(/[/?#]/)[0];                      // strip path/query/fragment
  value = value.replace(/:\d+$/, '');                   // strip port
  value = value.replace(/^www\./, '');                  // strip leading www.
  value = value.replace(/\.$/, '');                     // strip trailing dot

  // A domain must contain at least one dot and only legal host characters.
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(value)) return '';

  return value;
}

/**
 * Reduce a company name to a comparison key: lowercase, no punctuation,
 * no legal suffix, single-spaced.
 *
 *   "ABC Software, Inc."  ->  "abc software"
 *   "A.B.C. Software LLC" ->  "abc software"
 */
export function normalizeCompanyName(input) {
  if (typeof input !== 'string') return '';

  let value = input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')  // strip accents
    .replace(/&/g, ' and ')
    // Periods and apostrophes are abbreviation marks inside a name, not word
    // separators: "A.B.C." is "abc", not "a b c". Everything else splits words.
    .replace(/['.\u2019]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')     // remaining punctuation -> space
    .replace(/\s+/g, ' ')
    .trim();

  // Repeatedly strip trailing legal suffixes ("Foo Holdings Ltd" -> "foo").
  let changed = true;
  while (changed) {
    changed = false;
    for (const suffix of LEGAL_SUFFIXES) {
      if (value.endsWith(` ${suffix}`)) {
        value = value.slice(0, -(suffix.length + 1)).trim();
        changed = true;
      }
    }
  }

  return value;
}

/** True when a domain is a shared website-builder host rather than an owned domain. */
export function isSharedHost(domain) {
  const normalized = normalizeDomain(domain);
  if (!normalized) return false;
  return [...SHARED_HOSTS].some(
    (host) => normalized === host || normalized.endsWith(`.${host}`)
  );
}

/** Loose syntactic email check — deliberately not an RFC 5322 implementation. */
export function isValidEmailSyntax(input) {
  if (typeof input !== 'string') return false;
  const value = input.trim();
  if (!value || value.length > 254) return false;
  return /^[^\s@,;]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(value);
}

/** Collapse any string to a trimmed, single-spaced form. '' for non-strings. */
export function cleanString(input) {
  if (typeof input !== 'string') return '';
  return input.replace(/\s+/g, ' ').trim();
}

/** Lowercase comparison key for enum-ish fields (industry, business model). */
export function comparisonKey(input) {
  return cleanString(input).toLowerCase();
}
