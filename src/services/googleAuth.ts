import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  type User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  sanitizeManualToken,
  buildDomainInfo,
  isTokenAuthError,
  parseAuthErrorWithDomain,
  type AuthErrorDetails,
} from './googleAuthHelpers';

export { sanitizeManualToken, isTokenAuthError, type AuthErrorDetails };

// Reuse existing Firebase app instance if already initialized
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

function createGoogleProvider(forceConsent: boolean = false): GoogleAuthProvider {
  const p = new GoogleAuthProvider();
  WORKSPACE_SCOPES.forEach((scope) => p.addScope(scope));
  p.setCustomParameters({
    include_granted_scopes: 'true',
    prompt: forceConsent ? 'consent select_account' : 'select_account',
  });
  return p;
}

// Global declaration for Google Identity Services (GIS)
declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: {
              access_token?: string;
              expires_in?: number | string;
              scope?: string;
              error?: string;
              error_description?: string;
            }) => void;
            error_callback?: (err: any) => void;
          }) => {
            requestAccessToken: (options?: { prompt?: string }) => void;
          };
        };
      };
    };
  }
}

// In-memory token management (strictly not in localStorage per security requirements)
let isSigningIn = false;
let cachedAccessToken: string | null = null;
let tokenExpiresAt: number | null = null;
let currentUser: User | null = null;

// Buffer before nominal expiry so we never send a token right at the 3600s cliff
const TOKEN_EXPIRY_BUFFER_MS = 60 * 1000;
const DEFAULT_TOKEN_TTL_MS = 50 * 60 * 1000;

export const clearAccessToken = (): void => {
  cachedAccessToken = null;
  tokenExpiresAt = null;
};

export const isTokenExpired = (): boolean => {
  if (!cachedAccessToken) return true;
  if (tokenExpiresAt !== null && Date.now() >= tokenExpiresAt - TOKEN_EXPIRY_BUFFER_MS) {
    return true;
  }
  return false;
};

export const getCachedAccessTokenSync = (): string | null => {
  if (isTokenExpired()) {
    clearAccessToken();
    return null;
  }
  return cachedAccessToken;
};

export const setManualAccessToken = (rawToken: string): void => {
  const cleaned = sanitizeManualToken(rawToken);
  if (!cleaned) {
    throw new Error('Please paste a valid OAuth 2 access token.');
  }
  if (/\s/.test(cleaned)) {
    throw new Error('Access token cannot contain spaces or line breaks.');
  }
  if (cleaned.startsWith('AIza')) {
    throw new Error(
      'That looks like a Firebase API key, not a Google OAuth 2 access token (which usually starts with ya29.).'
    );
  }
  cachedAccessToken = cleaned;
  tokenExpiresAt = Date.now() + DEFAULT_TOKEN_TTL_MS;
  if (!currentUser) {
    currentUser = {
      displayName: 'Manual Google Token',
      email: 'Custom Access Token',
      uid: 'manual-token-user',
    } as any;
  }
};

/**
 * Returns diagnostic metadata about the current running domain and Firebase project.
 */
export const getCurrentDomainInfo = () => {
  return buildDomainInfo({
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
    oAuthClientId: firebaseConfig.oAuthClientId,
  });
};

/**
 * Parses raw Firebase Auth or Google API errors into user-friendly actionable instructions.
 */
export const parseAuthError = (err: any): AuthErrorDetails => {
  return parseAuthErrorWithDomain(err, getCurrentDomainInfo(), clearAccessToken);
};

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    currentUser = user;
    if (user) {
      const validToken = getCachedAccessTokenSync();
      if (validToken) {
        if (onAuthSuccess) onAuthSuccess(user, validToken);
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      clearAccessToken();
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Fallback OAuth using Google Identity Services (GIS) Token Client.
 * Bypasses Firebase Auth domain restrictions and acquires a direct Google OAuth 2 access token.
 */
export const signInWithGoogleIdentityServices = (
  forceConsent: boolean = true
): Promise<{ accessToken: string }> => {
  return new Promise((resolve, reject) => {
    const clientId = firebaseConfig.oAuthClientId;
    if (!clientId) {
      reject(new Error('OAuth Client ID is not configured in firebase-applet-config.json.'));
      return;
    }

    const initClient = () => {
      if (!window.google?.accounts?.oauth2) {
        reject(new Error('Google Identity Services library failed to load in browser.'));
        return;
      }

      try {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: WORKSPACE_SCOPES.join(' '),
          callback: (response) => {
            if (response.error) {
              console.error('GIS OAuth Error:', response);
              reject(new Error(response.error_description || response.error));
              return;
            }
            if (response.access_token) {
              cachedAccessToken = response.access_token;
              const expiresInSec = Number(response.expires_in);
              tokenExpiresAt =
                !Number.isNaN(expiresInSec) && expiresInSec > 0
                  ? Date.now() + expiresInSec * 1000
                  : Date.now() + DEFAULT_TOKEN_TTL_MS;

              if (!currentUser) {
                currentUser = {
                  displayName: 'Google Workspace User',
                  email: 'Authorized via Google OAuth Client',
                  uid: 'gis-user',
                } as any;
              }
              resolve({ accessToken: response.access_token });
            } else {
              reject(new Error('No access token received from Google Identity Services.'));
            }
          },
          error_callback: (err) => {
            console.error('GIS Error Callback:', err);
            reject(err);
          },
        });

        tokenClient.requestAccessToken({ prompt: forceConsent ? 'consent' : '' });
      } catch (e) {
        reject(e);
      }
    };

    if (window.google?.accounts?.oauth2) {
      initClient();
    } else {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => initClient();
      script.onerror = () => reject(new Error('Could not load Google Identity Services script.'));
      document.head.appendChild(script);
    }
  });
};

/**
 * Primary sign-in function. Tries Firebase Auth first, and if an unauthorized domain error occurs,
 * gracefully attempts Google Identity Services token client.
 */
export const googleSignIn = async (
  preferGis: boolean = false,
  forceConsent: boolean = false
): Promise<{ user: User; accessToken: string } | null> => {
  if (preferGis) {
    const gisRes = await signInWithGoogleIdentityServices(forceConsent);
    return { user: currentUser as User, accessToken: gisRes.accessToken };
  }

  try {
    isSigningIn = true;
    const provider = createGoogleProvider(forceConsent);
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      const gisRes = await signInWithGoogleIdentityServices(true);
      currentUser = result.user;
      return { user: result.user, accessToken: gisRes.accessToken };
    }

    cachedAccessToken = credential.accessToken;
    tokenExpiresAt = Date.now() + DEFAULT_TOKEN_TTL_MS;
    currentUser = result.user;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign-In Error (Firebase Auth):', error);

    if (
      error?.code === 'auth/unauthorized-domain' ||
      error?.message?.includes('unauthorized-domain')
    ) {
      console.warn('Firebase domain authorization blocked; attempting Google Identity Services fallback...');
      try {
        const gisRes = await signInWithGoogleIdentityServices(true);
        return { user: currentUser as User, accessToken: gisRes.accessToken };
      } catch (gisError) {
        console.error('GIS fallback also failed:', gisError);
        throw error;
      }
    }

    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return getCachedAccessTokenSync();
};

export const getCurrentUser = (): User | null => {
  return currentUser;
};

export const logout = async (): Promise<void> => {
  await signOut(auth);
  clearAccessToken();
  currentUser = null;
};
