import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeDomain, normalizeCompanyName, isSharedHost, isValidEmailSyntax,
} from '../src/utils/normalize.js';

test('normalizeDomain reduces every URL form to a bare domain', () => {
  const variants = [
    'https://www.example.com/',
    'http://example.com',
    'www.example.com',
    'EXAMPLE.COM',
    'https://example.com/about?utm_source=x#top',
    'https://user:pass@www.example.com:8443/path',
  ];
  for (const variant of variants) {
    assert.equal(normalizeDomain(variant), 'example.com', `failed for: ${variant}`);
  }
});

test('normalizeDomain rejects values that are not hostnames', () => {
  for (const input of ['', '   ', 'not a domain', 'localhost', 'http://', null, undefined, 42]) {
    assert.equal(normalizeDomain(input), '');
  }
});

test('normalizeDomain keeps distinct subdomains distinct', () => {
  // Only a leading "www." is stripped — "shop.example.com" is a different host.
  assert.equal(normalizeDomain('shop.example.com'), 'shop.example.com');
  assert.notEqual(normalizeDomain('shop.example.com'), normalizeDomain('example.com'));
});

test('normalizeCompanyName strips legal suffixes and punctuation', () => {
  assert.equal(normalizeCompanyName('ABC Software, Inc.'), 'abc software');
  assert.equal(normalizeCompanyName('A.B.C. Software LLC'), 'abc software');
  assert.equal(normalizeCompanyName('ABC Software'), 'abc software');
  assert.equal(normalizeCompanyName('  ABC   Software   Ltd  '), 'abc software');
});

test('normalizeCompanyName strips stacked suffixes', () => {
  assert.equal(normalizeCompanyName('Foo Holdings Ltd'), 'foo');
  assert.equal(normalizeCompanyName('Foo Group Inc'), 'foo');
});

test('normalizeCompanyName expands ampersands so "A&B" matches "A and B"', () => {
  assert.equal(normalizeCompanyName('Smith & Sons'), normalizeCompanyName('Smith and Sons'));
});

test('isSharedHost flags website-builder domains', () => {
  assert.equal(isSharedHost('acme.wixsite.com'), true);
  assert.equal(isSharedHost('https://foo.squarespace.com/'), true);
  assert.equal(isSharedHost('acme.com'), false);
});

test('isValidEmailSyntax accepts normal addresses and rejects malformed ones', () => {
  assert.equal(isValidEmailSyntax('info@example.com'), true);
  assert.equal(isValidEmailSyntax('first.last+tag@sub.example.co.uk'), true);
  for (const bad of ['', 'info@', '@example.com', 'info example.com', 'a@b', 'a@b.c,d@e.f']) {
    assert.equal(isValidEmailSyntax(bad), false, `should reject: ${bad}`);
  }
});
