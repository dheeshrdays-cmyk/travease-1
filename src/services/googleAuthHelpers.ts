export interface AuthErrorDetails {
  code: string;
  title: string;
  message: string;
  domain?: string;
  resolutionGuide: string[];
  consoleUrl?: string;
  actionLabel?: string;
  isDomainError?: boolean;
  isTokenError?: boolean;
}

export interface DomainConfigInput {
  projectId?: string;
  authDomain?: string;
  oAuthClientId?: string;
  hostname?: string;
}

export const sanitizeManualToken = (rawToken: string): string => {
  return rawToken
    .trim()
    .replace(/^["']+|["']+$/g, '')
    .trim()
    .replace(/^Bearer\s+/i, '')
    .replace(/^["']+|["']+$/g, '')
    .trim();
};

export const buildDomainInfo = (cfg: DomainConfigInput = {}) => {
  const hostname =
    cfg.hostname ?? (typeof window !== 'undefined' ? window.location.hostname : 'localhost');
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  const isVercel = hostname.endsWith('.vercel.app');
  const projectId = cfg.projectId || 'gen-lang-client-0922233729';

  return {
    hostname,
    isLocalhost,
    isVercel,
    projectId,
    authDomain: cfg.authDomain || `${projectId}.firebaseapp.com`,
    oAuthClientId: cfg.oAuthClientId || '',
    firebaseConsoleAuthUrl: `https://console.firebase.google.com/project/${projectId}/authentication/settings`,
    firebaseConsoleProvidersUrl: `https://console.firebase.google.com/project/${projectId}/authentication/providers`,
    cloudConsoleApisUrl: `https://console.cloud.google.com/apis/library/sheets.googleapis.com?project=${projectId}`,
  };
};

export const isTokenAuthError = (err: any): boolean => {
  const status = err?.status;
  const apiStatus = err?.apiStatus || '';
  const rawMsg = (err?.message || String(err || '')).toLowerCase();
  return (
    status === 401 ||
    apiStatus === 'UNAUTHENTICATED' ||
    rawMsg.includes('invalid authentication credentials') ||
    rawMsg.includes('expected oauth 2 access token') ||
    rawMsg.includes('invalid credentials') ||
    rawMsg.includes('unauthenticated') ||
    rawMsg.includes('missing oauth 2 access token')
  );
};

export const parseAuthErrorWithDomain = (
  err: any,
  domainInfo: ReturnType<typeof buildDomainInfo>,
  onTokenInvalid?: () => void
): AuthErrorDetails => {
  const rawCode = err?.code || '';
  const rawMsg = err?.message || String(err || '');
  const lowerMsg = rawMsg.toLowerCase();

  // 0. 401 / Invalid or Expired OAuth 2 Access Token
  if (isTokenAuthError(err)) {
    if (onTokenInvalid) onTokenInvalid();
    return {
      code: 'auth/invalid-credentials',
      title: 'Google OAuth 2 Token Expired or Invalid',
      isTokenError: true,
      message:
        'Google Sheets rejected the OAuth 2 access token (tokens expire after 1 hour or when a session resets). Please re-authorize your Google account to obtain a fresh access token.',
      resolutionGuide: [
        '1. Click "Re-authorize with Google" below to get a fresh OAuth 2 access token.',
        '2. In the Google sign-in popup, make sure permissions for Google Sheets and Google Drive are granted.',
        '3. If Firebase popup returns an invalid credential on your domain, click "Try Direct Google OAuth (GIS)".',
      ],
    };
  }

  // 0b. Insufficient OAuth Scopes (403 ACCESS_TOKEN_SCOPE_INSUFFICIENT)
  if (
    lowerMsg.includes('insufficient authentication scopes') ||
    lowerMsg.includes('access_token_scope_insufficient') ||
    lowerMsg.includes('insufficient permission')
  ) {
    if (onTokenInvalid) onTokenInvalid();
    return {
      code: 'sheets/insufficient-scopes',
      title: 'Google Sheets Permissions Not Granted',
      isTokenError: true,
      message:
        'Your Google account signed in, but Google Sheets & Google Drive permissions were not checked on the consent screen.',
      resolutionGuide: [
        '1. Click "Re-authorize with Google" below.',
        '2. On the Google consent screen, make sure all checkboxes for Google Sheets and Google Drive are ticked.',
        '3. Click "Continue" and retry synchronization.',
      ],
    };
  }

  // 1. Unauthorized Domain
  if (
    rawCode === 'auth/unauthorized-domain' ||
    rawMsg.includes('unauthorized-domain') ||
    rawMsg.includes('authorized domain')
  ) {
    return {
      code: 'auth/unauthorized-domain',
      title: 'Domain Not Authorized in Firebase',
      domain: domainInfo.hostname,
      isDomainError: true,
      message: `Firebase Authentication blocked sign-in because your current domain "${domainInfo.hostname}" is not on the Firebase Authorized Domains allowlist.`,
      resolutionGuide: [
        '1. Open Firebase Console Settings using the button below.',
        '2. Scroll down to the "Authorized domains" section and click "Add domain".',
        `3. Enter "${domainInfo.isVercel ? 'vercel.app' : domainInfo.hostname}" (adding "vercel.app" covers all Vercel preview and production URLs).`,
        '4. Click "Done" / "Save", then come back here and click "Try Sync Again".',
      ],
      consoleUrl: domainInfo.firebaseConsoleAuthUrl,
      actionLabel: 'Open Firebase Authorized Domains Settings',
    };
  }

  // 2. Google Sign-In Provider Disabled
  if (
    rawCode === 'auth/operation-not-allowed' ||
    rawCode === 'auth/configuration-not-found' ||
    rawMsg.includes('operation-not-allowed')
  ) {
    return {
      code: 'auth/operation-not-allowed',
      title: 'Google Sign-In Provider Not Enabled in Firebase',
      message: `Google Sign-In is not enabled as an Authentication provider in Firebase Console for project "${domainInfo.projectId}".`,
      resolutionGuide: [
        '1. Click the button below to open Firebase Authentication Sign-in methods.',
        '2. Click "Google" under Additional providers or Sign-in providers.',
        '3. Toggle "Enable" to ON, select your project support email, and click "Save".',
        '4. Return to TravEase and click "Sign in with Google" again.',
      ],
      consoleUrl: domainInfo.firebaseConsoleProvidersUrl,
      actionLabel: 'Enable Google Sign-in in Firebase Console',
    };
  }

  // 3. Popup Blocked
  if (
    rawCode === 'auth/popup-blocked' ||
    rawMsg.includes('popup-blocked') ||
    rawMsg.includes('blocked by the browser')
  ) {
    return {
      code: 'auth/popup-blocked',
      title: 'Sign-in Popup Blocked by Browser',
      message: 'Your browser prevented the Google Sign-in popup from opening.',
      resolutionGuide: [
        'Check the URL/address bar of your browser for a "Popup blocked" icon.',
        'Choose "Always allow popups from this site".',
        'Click the "Sign in with Google" button directly.',
      ],
    };
  }

  // 4. Popup Closed by User
  if (rawCode === 'auth/popup-closed-by-user' || rawMsg.includes('popup-closed-by-user')) {
    return {
      code: 'auth/popup-closed-by-user',
      title: 'Sign-in Cancelled',
      message: 'The Google sign-in window was closed before completing authorization.',
      resolutionGuide: [
        'Click "Sign in with Google" and complete the prompt to grant Sheets & Drive sync access.',
      ],
    };
  }

  // 5. Google Sheets API Not Enabled or 403 Forbidden
  if (
    rawMsg.includes('Google Sheets API has not been used') ||
    rawMsg.includes('API has not been used') ||
    err?.status === 403 ||
    rawMsg.includes('403')
  ) {
    return {
      code: 'sheets/api-disabled',
      title: 'Google Sheets API Not Enabled or Access Denied',
      message: `Google Sheets API access was denied (${rawMsg}). Ensure Google Sheets API is enabled in Google Cloud Project (${domainInfo.projectId}) and you have Editor access to the spreadsheet.`,
      resolutionGuide: [
        '1. Click the link below to open Google Cloud Console.',
        '2. Click the blue "Enable" button for "Google Sheets API".',
        '3. Also ensure "Google Drive API" is enabled.',
        '4. Retry your spreadsheet synchronization.',
      ],
      consoleUrl: domainInfo.cloudConsoleApisUrl,
      actionLabel: 'Enable Google Sheets API on Cloud Console',
    };
  }

  return {
    code: rawCode || 'auth/unknown',
    title: 'Google Authentication Error',
    message: rawMsg || 'An unexpected error occurred during Google synchronization.',
    resolutionGuide: [
      'Ensure you are signed in with the Google account that has access to the spreadsheet.',
      'If deployed on a custom domain or Vercel, verify that the domain is added to Firebase Authorized domains.',
      'Try "Try Direct Google OAuth (GIS)" if Firebase Auth popup credentials fail.',
    ],
    consoleUrl: domainInfo.firebaseConsoleAuthUrl,
    actionLabel: 'Check Firebase Auth Settings',
  };
};
