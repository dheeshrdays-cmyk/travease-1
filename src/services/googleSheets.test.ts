import test from 'node:test';
import assert from 'node:assert/strict';
import { extractSpreadsheetId } from './googleSheets';

test('extractSpreadsheetId extracts ID from standard Google Sheets URL', () => {
  const url = 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0';
  assert.equal(extractSpreadsheetId(url), '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');
});

test('extractSpreadsheetId extracts ID from URL with query parameters', () => {
  const url = 'https://docs.google.com/spreadsheets/d/1_aBcDeF-GhIjKlMnOpQrStUvWxYz012345/edit?usp=sharing';
  assert.equal(extractSpreadsheetId(url), '1_aBcDeF-GhIjKlMnOpQrStUvWxYz012345');
});

test('extractSpreadsheetId preserves direct raw spreadsheet ID with whitespace trimmed', () => {
  const rawId = '  1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms  ';
  assert.equal(extractSpreadsheetId(rawId), '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');
});
