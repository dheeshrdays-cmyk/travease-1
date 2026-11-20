import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeManualToken,
  buildDomainInfo,
  isTokenAuthError,
  parseAuthErrorWithDomain,
} from './googleAuthHelpers.ts';
import { getSpreadsheetMetadata, SheetsApiError } from './googleSheets.ts';

test('sanitizeManualToken strips Bearer prefix, quotes, and surrounding whitespace', () => {
  assert.equal(sanitizeManualToken('  Bearer ya29.a0AfH6SM  '), 'ya29.a0AfH6SM');
  assert.equal(sanitizeManualToken('"ya29.token123"'), 'ya29.token123');
  assert.equal(sanitizeManualToken("'bearer ya29.abc'"), 'ya29.abc');
});

test('isTokenAuthError recognizes Google 401 invalid authentication credentials error', () => {
  const exactError = new SheetsApiError(
    'Request had invalid authentication credentials. Expected OAuth 2 access token, login cookie or other valid authentication credential. See https://developers.google.com/identity/sign-in/web/devconsole-project.',
    401,
    'UNAUTHENTICATED'
  );
  assert.equal(isTokenAuthError(exactError), true);
  assert.equal(
    isTokenAuthError(
      new Error(
        'Request had invalid authentication credentials. Expected OAuth 2 access token, login cookie or other valid authentication credential.'
      )
    ),
    true
  );
  assert.equal(isTokenAuthError(new Error('Network timeout')), false);
});

test('parseAuthErrorWithDomain handles 401 invalid credentials and invokes token clear callback', () => {
  let cleared = false;
  const domainInfo = buildDomainInfo({ hostname: 'travease.vercel.app' });
  const parsed = parseAuthErrorWithDomain(
    new SheetsApiError(
      'Request had invalid authentication credentials. Expected OAuth 2 access token, login cookie or other valid authentication credential.',
      401,
      'UNAUTHENTICATED'
    ),
    domainInfo,
    () => {
      cleared = true;
    }
  );

  assert.equal(cleared, true);
  assert.equal(parsed.code, 'auth/invalid-credentials');
  assert.equal(parsed.isTokenError, true);
  assert.match(parsed.title, /Expired or Invalid/i);
});

test('parseAuthErrorWithDomain handles insufficient OAuth scopes and unauthorized domain', () => {
  const domainInfo = buildDomainInfo({ hostname: 'travease.vercel.app' });

  const scopeErr = parseAuthErrorWithDomain(
    new SheetsApiError('Request had insufficient authentication scopes.', 403, 'PERMISSION_DENIED'),
    domainInfo
  );
  assert.equal(scopeErr.code, 'sheets/insufficient-scopes');
  assert.equal(scopeErr.isTokenError, true);

  const domainErr = parseAuthErrorWithDomain(
    { code: 'auth/unauthorized-domain', message: 'Firebase: Error (auth/unauthorized-domain).' },
    domainInfo
  );
  assert.equal(domainErr.code, 'auth/unauthorized-domain');
  assert.equal(domainErr.isDomainError, true);
});

test('getSpreadsheetMetadata rejects empty access token before making network call', async () => {
  await assert.rejects(
    () => getSpreadsheetMetadata('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms', '   '),
    (err: any) => err instanceof SheetsApiError && err.status === 401 && err.apiStatus === 'UNAUTHENTICATED'
  );
});
