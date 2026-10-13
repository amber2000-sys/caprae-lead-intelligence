/**
 * Minimal RFC 4180 CSV serialiser.
 *
 * Written by hand rather than pulled in as a dependency: the requirement is a
 * flat export of known columns, and a 30-line function is easier to reason
 * about (and to defend) than another package in the tree.
 */

/**
 * Quote a single field. Values containing a comma, quote, newline or leading /
 * trailing whitespace are wrapped in quotes with internal quotes doubled.
 */
export function escapeCsvValue(value) {
  if (value === null || value === undefined) return '';

  let str = String(value);

  // Neutralise spreadsheet formula injection: a leading =, +, - or @ in Excel
  // or Sheets is interpreted as a formula, which is a real attack vector for
  // exported data that originated outside our system.
  if (/^[=+\-@\t\r]/.test(str)) str = `'${str}`;

  if (/[",\n\r]/.test(str) || str !== str.trim()) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Build a CSV document.
 *
 * @param {Array<{key: string, header: string, format?: (row: object) => unknown}>} columns
 * @param {object[]} rows
 */
export function toCsv(columns, rows) {
  const header = columns.map((col) => escapeCsvValue(col.header)).join(',');

  const body = rows.map((row) =>
    columns
      .map((col) => {
        const value = col.format ? col.format(row) : row[col.key];
        return escapeCsvValue(value);
      })
      .join(',')
  );

  // CRLF line endings and a UTF-8 BOM keep Excel on Windows happy, which is
  // where an exported acquisition pipeline is most likely to be opened.
  return `﻿${[header, ...body].join('\r\n')}\r\n`;
}
