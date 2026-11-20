import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  X,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Link as LinkIcon,
  PlusCircle,
  Unlink,
  LogOut,
  ShieldCheck,
  Cloud,
  Layers,
  ArrowRight,
  Copy,
  Check,
  Key,
  Globe,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Download,
  Upload,
  FolderSearch,
  Laptop,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
  getCurrentUser,
  parseAuthError,
  getCurrentDomainInfo,
  setManualAccessToken,
  clearAccessToken,
  isTokenAuthError,
  type AuthErrorDetails,
} from '../../services/googleAuth';
import {
  createTravEaseSpreadsheet,
  getSpreadsheetMetadata,
  syncAllToGoogleSheets,
  pullAllFromGoogleSheets,
  listTravEaseSpreadsheets,
  extractSpreadsheetId,
  type DriveSpreadsheetFile,
  type CloudSyncPayload,
  type SpreadsheetMetadata,
} from '../../services/googleSheets';
import type { User } from 'firebase/auth';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({ isOpen, onClose }) => {
  const {
    vouchers,
    advances,
    advanceVoucherMappings,
    disbursements,
    settlements,
    settlementVoucherMappings,
    vendorPayments,
    recoveries,
    recoveryPaymentMappings,
    projects,
    teamMembers,
    notifications,
    activities,
    linkedSpreadsheetId,
    linkedSpreadsheetTitle,
    linkedSpreadsheetUrl,
    lastSyncedAt,
    setLinkedSpreadsheet,
    clearLinkedSpreadsheet,
    updateLastSyncedAt,
    loadCloudData,
    logActivity,
  } = useApp();

  const domainInfo = getCurrentDomainInfo();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isScanningDrive, setIsScanningDrive] = useState(false);

  const [driveSpreadsheets, setDriveSpreadsheets] = useState<DriveSpreadsheetFile[]>([]);
  const [driveScanned, setDriveScanned] = useState(false);

  const [inputUrlOrId, setInputUrlOrId] = useState('');
  const [newSheetTitle, setNewSheetTitle] = useState('TravEase Travel & Expense Tracker');
  const [mode, setMode] = useState<'create' | 'link'>('create');

  const [errorMessage, setErrorMessage] = useState('');
  const [authErrorDetails, setAuthErrorDetails] = useState<AuthErrorDetails | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [showConfirmSync, setShowConfirmSync] = useState(false);
  const [pendingCloudPull, setPendingCloudPull] = useState<{
    payload: CloudSyncPayload;
    source: 'sync_store' | 'parsed_tabs';
    meta: SpreadsheetMetadata;
  } | null>(null);

  const [copiedDomain, setCopiedDomain] = useState(false);
  const [showDomainHelp, setShowDomainHelp] = useState(false);
  const [showManualToken, setShowManualToken] = useState(false);
  const [manualTokenInput, setManualTokenInput] = useState('');

  const scanDriveSheets = async (tokenOverride?: string) => {
    setIsScanningDrive(true);
    try {
      const files = tokenOverride
        ? await listTravEaseSpreadsheets(tokenOverride)
        : await runWithValidToken((token) => listTravEaseSpreadsheets(token));
      setDriveSpreadsheets(files);
      setDriveScanned(true);
      // If user has existing sheets on Drive and hasn't linked a sheet on this device yet, default to Link tab
      if (files.length > 0 && !linkedSpreadsheetId) {
        setMode('link');
      }
    } catch (err: any) {
      // Non-fatal during background scan; surface auth errors if token failed
      console.warn('Drive scan notice:', err);
      if (isTokenAuthError(err)) {
        const parsed = parseAuthError(err);
        setHasToken(false);
        setAuthErrorDetails(parsed);
        setErrorMessage(parsed.message);
      }
    } finally {
      setIsScanningDrive(false);
    }
  };

  // Initialize auth state
  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setHasToken(!!token);
        if (token && !driveScanned) {
          scanDriveSheets(token);
        }
      },
      () => {
        setCurrentUser(getCurrentUser());
        getAccessToken().then((t) => setHasToken(!!t));
      }
    );

    // Initial check
    setCurrentUser(getCurrentUser());
    getAccessToken().then((t) => {
      setHasToken(!!t);
      if (t && !driveScanned) {
        scanDriveSheets(t);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyDomain = (domainToCopy?: string) => {
    const text = domainToCopy || domainInfo.hostname;
    navigator.clipboard.writeText(text);
    setCopiedDomain(true);
    setTimeout(() => setCopiedDomain(false), 3000);
  };

  const handleSignIn = async (preferGis: boolean = false, forceConsent: boolean = false) => {
    setIsSigningIn(true);
    setErrorMessage('');
    setAuthErrorDetails(null);
    try {
      const res = await googleSignIn(preferGis, forceConsent);
      if (res) {
        setCurrentUser(res.user);
        setHasToken(true);
        setSuccessMessage(`Signed in as ${res.user.displayName || res.user.email || 'Google User'}`);
        await scanDriveSheets(res.accessToken);
      }
    } catch (err: any) {
      console.error('Sign-in failed:', err);
      const parsed = parseAuthError(err);
      setAuthErrorDetails(parsed);
      setErrorMessage(parsed.message);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleApplyManualToken = async () => {
    try {
      setManualAccessToken(manualTokenInput);
      const token = await getAccessToken();
      setHasToken(true);
      setCurrentUser({
        displayName: 'Direct OAuth Access Token',
        email: 'Manual Access Token User',
        uid: 'manual-token-user',
      } as any);
      setSuccessMessage('Access token applied! Scanning your Google Drive for TravEase sheets...');
      setErrorMessage('');
      setAuthErrorDetails(null);
      setShowManualToken(false);
      if (token) {
        await scanDriveSheets(token);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid access token format.');
    }
  };

  const handleSignOut = async () => {
    setErrorMessage('');
    setAuthErrorDetails(null);
    try {
      await logout();
      setCurrentUser(null);
      setHasToken(false);
      setDriveSpreadsheets([]);
      setDriveScanned(false);
      setSuccessMessage('Signed out of Google account');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to sign out');
    }
  };

  /**
   * Executes a Google Sheets API operation with automatic 401 token refresh & retry once.
   */
  const runWithValidToken = async <T,>(operation: (token: string) => Promise<T>): Promise<T> => {
    let token = await getAccessToken();
    if (!token) {
      const res = await googleSignIn(false, false);
      token = res?.accessToken || null;
      if (res) {
        setCurrentUser(res.user);
        setHasToken(true);
      }
    }

    if (!token) {
      throw new Error('Please sign in with Google to authorize spreadsheet access.');
    }

    try {
      return await operation(token);
    } catch (err: any) {
      if (isTokenAuthError(err)) {
        // Clear stale/expired token and attempt one fresh sign-in with consent
        clearAccessToken();
        setHasToken(false);
        const refreshed = await googleSignIn(false, true);
        if (!refreshed?.accessToken) {
          throw err;
        }
        setCurrentUser(refreshed.user);
        setHasToken(true);
        return await operation(refreshed.accessToken);
      }
      throw err;
    }
  };

  const handleCreateSheet = async () => {
    setErrorMessage('');
    setAuthErrorDetails(null);
    setSuccessMessage('');
    setIsCreating(true);

    try {
      const { meta, syncRes } = await runWithValidToken(async (token) => {
        const createdMeta = await createTravEaseSpreadsheet(newSheetTitle, token);
        setLinkedSpreadsheet(createdMeta);

        const synced = await syncAllToGoogleSheets(createdMeta.id, token, {
          vouchers,
          advances,
          advanceVoucherMappings,
          disbursements,
          settlements,
          settlementVoucherMappings,
          vendorPayments,
          recoveries,
          recoveryPaymentMappings,
          projects,
          teamMembers,
          notifications,
          activities,
        });
        return { meta: createdMeta, syncRes: synced };
      });

      updateLastSyncedAt(syncRes.timestamp);
      setSuccessMessage(`Successfully created and synchronized "${meta.title}" in your Google Drive!`);
      logActivity('Record Updated', {
        remarks: `Created new Google Spreadsheet: ${meta.title} (${meta.id})`,
      });
    } catch (err: any) {
      console.error('Create sheet failed:', err);
      const parsed = parseAuthError(err);
      if (parsed.isTokenError) setHasToken(false);
      setAuthErrorDetails(parsed);
      setErrorMessage(parsed.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleConnectExisting = async (sheetIdOverride?: string, alsoPull: boolean = false) => {
    setErrorMessage('');
    setAuthErrorDetails(null);
    setSuccessMessage('');

    const sheetId = sheetIdOverride || extractSpreadsheetId(inputUrlOrId);
    if (!sheetId) {
      setErrorMessage('Please enter a valid Google Sheet URL or Spreadsheet ID.');
      return;
    }

    setIsConnecting(true);
    try {
      if (alsoPull) {
        const result = await runWithValidToken((token) => pullAllFromGoogleSheets(sheetId, token));
        setPendingCloudPull(result);
      } else {
        const meta = await runWithValidToken((token) => getSpreadsheetMetadata(sheetId, token));
        setLinkedSpreadsheet(meta);
        setSuccessMessage(
          `Connected to "${meta.title}". Use "Load from Sheet" to fetch cloud data or "Sync Now" to push local data.`
        );
        logActivity('Record Updated', {
          remarks: `Connected existing Google Spreadsheet: ${meta.title} (${meta.id})`,
        });
      }
    } catch (err: any) {
      console.error('Connect sheet failed:', err);
      const parsed = parseAuthError(err);
      if (parsed.isTokenError) setHasToken(false);
      setAuthErrorDetails(parsed);
      setErrorMessage(parsed.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleRequestPullFromSheet = async (targetSheetId?: string) => {
    const idToPull = targetSheetId || linkedSpreadsheetId;
    if (!idToPull) return;

    setErrorMessage('');
    setAuthErrorDetails(null);
    setSuccessMessage('');
    setIsPulling(true);

    try {
      const result = await runWithValidToken((token) => pullAllFromGoogleSheets(idToPull, token));
      setPendingCloudPull(result);
    } catch (err: any) {
      console.error('Pull from sheet failed:', err);
      const parsed = parseAuthError(err);
      if (parsed.isTokenError) setHasToken(false);
      setAuthErrorDetails(parsed);
      setErrorMessage(parsed.message);
    } finally {
      setIsPulling(false);
    }
  };

  const handleConfirmCloudPull = () => {
    if (!pendingCloudPull) return;
    const { payload, meta, source } = pendingCloudPull;
    loadCloudData(payload.data, meta, payload.syncedAtDisplay || new Date().toLocaleString('en-IN'));
    setPendingCloudPull(null);
    setSuccessMessage(
      `Loaded ${payload.data.vouchers.length} vouchers, ${payload.data.advances.length} advances, ${payload.data.teamMembers.length} team members from "${meta.title}" (${source === 'sync_store' ? 'Full Cloud Sync' : 'Spreadsheet Tabs'}).`
    );
  };

  const handleExecuteSync = async () => {
    setShowConfirmSync(false);
    if (!linkedSpreadsheetId) return;

    setErrorMessage('');
    setAuthErrorDetails(null);
    setSuccessMessage('');
    setIsSyncing(true);

    try {
      const syncRes = await runWithValidToken((token) =>
        syncAllToGoogleSheets(linkedSpreadsheetId, token, {
          vouchers,
          advances,
          advanceVoucherMappings,
          disbursements,
          settlements,
          settlementVoucherMappings,
          vendorPayments,
          recoveries,
          recoveryPaymentMappings,
          projects,
          teamMembers,
          notifications,
          activities,
        })
      );

      updateLastSyncedAt(syncRes.timestamp);
      setSuccessMessage(`Google Sheet synchronized successfully at ${syncRes.timestamp}!`);
      logActivity('Record Updated', {
        remarks: `Synchronized ${syncRes.updatedCount} rows to Google Sheet (${linkedSpreadsheetId})`,
      });
    } catch (err: any) {
      console.error('Sync failed:', err);
      const parsed = parseAuthError(err);
      if (parsed.isTokenError) setHasToken(false);
      setAuthErrorDetails(parsed);
      setErrorMessage(parsed.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const totalRecords =
    vouchers.length +
    advances.length +
    disbursements.length +
    settlements.length +
    vendorPayments.length +
    recoveries.length +
    projects.length +
    teamMembers.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-xs">
              <FileSpreadsheet className="w-6 h-6 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight">
                Google Sheets Live Sync
              </h2>
              <p className="text-xs text-emerald-200/90">
                Synchronize vouchers, advances, disbursements, and settlements with your Google Drive
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Detailed Diagnostic Banner for Firebase Errors */}
          {authErrorDetails && (
            <div className="p-4 bg-rose-50/90 border border-rose-300 rounded-xl space-y-3 animate-in fade-in">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-rose-950 text-xs sm:text-sm">
                      {authErrorDetails.title}
                    </h3>
                    <p className="text-rose-900/90 text-xs mt-1 leading-relaxed">
                      {authErrorDetails.message}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAuthErrorDetails(null)}
                  className="text-rose-500 hover:text-rose-800 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Domain Helper Strip */}
              {authErrorDetails.isDomainError && (
                <div className="p-3 bg-white/80 rounded-lg border border-rose-200 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Globe className="w-4 h-4 text-slate-500 shrink-0" />
                      <span className="text-[11px] text-slate-600 font-medium">Current Domain:</span>
                      <code className="font-mono font-bold text-rose-900 bg-rose-100/80 px-2 py-0.5 rounded text-[11px] truncate">
                        {domainInfo.hostname}
                      </code>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyDomain(domainInfo.isVercel ? 'vercel.app' : domainInfo.hostname)}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-md shadow-2xs flex items-center gap-1 shrink-0 self-start sm:self-auto cursor-pointer"
                    >
                      {copiedDomain ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedDomain ? 'Copied!' : `Copy ${domainInfo.isVercel ? 'vercel.app' : 'Domain'}`}</span>
                    </button>
                  </div>

                  <div className="text-[11px] text-slate-700 space-y-1 pt-1">
                    <span className="font-bold text-slate-800 block">How to fix in 1 minute:</span>
                    <ol className="list-decimal pl-4 space-y-0.5 text-slate-600">
                      <li>Click the button below to open Firebase Authentication settings.</li>
                      <li>Under "Authorized domains", click <strong>"Add domain"</strong>.</li>
                      <li>Paste <strong>{domainInfo.isVercel ? 'vercel.app' : domainInfo.hostname}</strong> and click Save.</li>
                      <li>Return here and retry syncing.</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* Action buttons inside error banner */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {authErrorDetails.isTokenError && (
                  <button
                    type="button"
                    onClick={() => handleSignIn(false, true)}
                    disabled={isSigningIn}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors text-[11px] disabled:opacity-50 cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{isSigningIn ? 'Re-authorizing...' : 'Re-authorize with Google'}</span>
                  </button>
                )}

                {authErrorDetails.consoleUrl && (
                  <a
                    href={authErrorDetails.consoleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors text-[11px]"
                  >
                    <span>{authErrorDetails.actionLabel || 'Open Firebase Console Settings'}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => handleSignIn(true, true)}
                  disabled={isSigningIn}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors text-[11px] disabled:opacity-50 cursor-pointer"
                  title="Try direct Google Identity Services token client"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSigningIn ? 'animate-spin' : ''}`} />
                  <span>Try Direct Google OAuth (GIS)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowManualToken(!showManualToken)}
                  className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg transition-colors text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <Key className="w-3.5 h-3.5 text-slate-500" />
                  <span>Enter Access Token Manually</span>
                </button>
              </div>
            </div>
          )}

          {/* Simple Error Banner (if not detailed) */}
          {errorMessage && !authErrorDetails && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Manual Access Token Input Accordion */}
          {showManualToken && (
            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-950 flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-amber-700" />
                  <span>Direct Google OAuth Access Token</span>
                </span>
                <span className="text-[10px] bg-amber-200/70 text-amber-900 font-semibold px-2 py-0.5 rounded">
                  Developer / Fallback
                </span>
              </div>
              <p className="text-[11px] text-amber-900/90 leading-relaxed">
                If your deployment domain or firewall blocks Google popups, you can paste an active Google OAuth token directly from OAuth 2.0 Playground with Google Sheets scopes.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Paste Bearer Access Token (ya29....)"
                  value={manualTokenInput}
                  onChange={(e) => setManualTokenInput(e.target.value)}
                  className="flex-1 bg-white px-3 py-2 text-xs rounded-lg border border-amber-300 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={handleApplyManualToken}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-semibold rounded-lg shadow-xs transition-all cursor-pointer shrink-0"
                >
                  Apply Token
                </button>
              </div>
            </div>
          )}

          {/* Success Banner */}
          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{successMessage}</div>
            </div>
          )}

          {/* Section 1: Google Account Connection */}
          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-slate-600" />
                <span className="font-bold text-slate-800 text-xs">Google Account Authorization</span>
              </div>
              {currentUser && hasToken ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Sheets Token Active</span>
                </span>
              ) : currentUser && !hasToken ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                  <AlertCircle className="w-3 h-3" />
                  <span>Re-authorization Needed</span>
                </span>
              ) : null}
            </div>

            {currentUser ? (
              <div className="space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                  <div className="flex items-center gap-3 min-w-0">
                    {currentUser.photoURL ? (
                      <img
                        src={currentUser.photoURL}
                        alt={currentUser.displayName || 'Google User'}
                        className="w-8 h-8 rounded-full border border-slate-200 object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                        {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 leading-tight truncate">
                        {currentUser.displayName || 'Google Account'}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono truncate">{currentUser.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                    {!hasToken && (
                      <button
                        type="button"
                        onClick={() => handleSignIn(false, true)}
                        disabled={isSigningIn}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg flex items-center gap-1.5 transition-colors min-h-[36px] text-[11px] shadow-2xs disabled:opacity-50 cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSigningIn ? 'animate-spin' : ''}`} />
                        <span>{isSigningIn ? 'Authorizing...' : 'Authorize Sheets Token'}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="px-2.5 py-1 text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-lg flex items-center gap-1 transition-colors min-h-[36px] cursor-pointer"
                      title="Sign out of Google"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
                {!hasToken && (
                  <p className="text-[11px] text-amber-800 bg-amber-50/90 border border-amber-200 rounded-lg px-3 py-2">
                    Your Google session was restored, but an active OAuth 2 access token is required for Google Sheets sync (tokens expire after 1 hour or on page reload). Click <strong>Authorize Sheets Token</strong> above before syncing.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                <p className="text-slate-600 text-[11px]">
                  Sign in with your Google account to grant live synchronization with Google Sheets and Google Drive.
                </p>

                {/* Primary Google Sign In Button */}
                <button
                  type="button"
                  onClick={() => handleSignIn(false)}
                  disabled={isSigningIn}
                  className="w-full inline-flex items-center justify-center gap-3 px-4 py-2.5 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 font-semibold border border-slate-300 rounded-xl shadow-xs transition-all min-h-[44px] disabled:opacity-50 cursor-pointer"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                  </svg>
                  <span>{isSigningIn ? 'Connecting to Google...' : 'Sign in with Google'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Section 2: Active Linked Spreadsheet or Setup */}
          {linkedSpreadsheetId ? (
            <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-700 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-900 text-xs block">
                      {linkedSpreadsheetTitle || 'TravEase Google Spreadsheet'}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      ID: {linkedSpreadsheetId}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                  <a
                    href={
                      linkedSpreadsheetUrl ||
                      `https://docs.google.com/spreadsheets/d/${linkedSpreadsheetId}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-white border border-emerald-300 hover:bg-emerald-50 rounded-lg flex items-center gap-1 shadow-2xs min-h-[36px]"
                  >
                    <span>Open in Drive</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    type="button"
                    onClick={() => clearLinkedSpreadsheet()}
                    className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-rose-600 bg-white border border-slate-200 hover:bg-rose-50 rounded-lg flex items-center gap-1 shadow-2xs min-h-[36px] cursor-pointer"
                    title="Disconnect or switch to a different Google Sheet"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                    <span>Switch / Disconnect</span>
                  </button>
                </div>
              </div>

              {/* Multi-device Two-Way Sync Status & Actions */}
              <div className="p-3 bg-white/90 rounded-lg border border-emerald-200/80 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-600">
                    <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                      <Laptop className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Multi-Device Two-Way Cloud Sync</span>
                    </span>
                    <span className="block mt-0.5">
                      Last synced:{' '}
                      <span className="font-semibold text-slate-800">
                        {lastSyncedAt || 'Not yet synchronized'}
                      </span>
                      {' · '}Local records: <strong>{totalRecords}</strong>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleRequestPullFromSheet()}
                    disabled={isPulling || isSyncing}
                    className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-semibold rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-all min-h-[42px] disabled:opacity-50 cursor-pointer"
                  >
                    <Download className={`w-4 h-4 ${isPulling ? 'animate-bounce' : ''}`} />
                    <span>{isPulling ? 'Reading Cloud Sheet...' : 'Load from Google Sheet'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowConfirmSync(true)}
                    disabled={isSyncing || isPulling}
                    className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-semibold rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-all min-h-[42px] disabled:opacity-50 cursor-pointer"
                  >
                    <Upload className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Pushing Local Data...' : 'Sync Local to Google Sheet'}</span>
                  </button>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Use <strong>Load from Google Sheet</strong> when opening TravEase on another device or after someone else updates data. Use <strong>Sync Local to Google Sheet</strong> to save your latest edits from this device to the cloud.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Auto-Discovered Spreadsheets in Google Drive */}
              {hasToken && (
                <div className="p-4 bg-indigo-50/70 rounded-xl border border-indigo-200 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FolderSearch className="w-4 h-4 text-indigo-700 shrink-0" />
                      <span className="font-bold text-indigo-950 text-xs">
                        Your TravEase Spreadsheets in Google Drive
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => scanDriveSheets()}
                      disabled={isScanningDrive}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-md flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${isScanningDrive ? 'animate-spin' : ''}`} />
                      <span>{isScanningDrive ? 'Scanning...' : 'Refresh Drive'}</span>
                    </button>
                  </div>

                  {isScanningDrive && driveSpreadsheets.length === 0 ? (
                    <p className="text-[11px] text-indigo-800">
                      Checking your Google Drive for previously synced TravEase spreadsheets...
                    </p>
                  ) : driveSpreadsheets.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-0.5">
                      {driveSpreadsheets.map((file) => (
                        <div
                          key={file.id}
                          className="p-2.5 bg-white rounded-lg border border-indigo-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span className="font-bold text-slate-900 truncate">{file.name}</span>
                              {file.isTravEaseApp && (
                                <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-emerald-100 text-emerald-800 shrink-0">
                                  TravEase Cloud
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 block mt-0.5 truncate font-mono">
                              {file.modifiedTime
                                ? `Modified ${new Date(file.modifiedTime).toLocaleString('en-IN')}`
                                : `ID: ${file.id}`}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleConnectExisting(file.id, true)}
                              disabled={isConnecting || isPulling}
                              className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-[11px] flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Connect & Load</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleConnectExisting(file.id, false)}
                              disabled={isConnecting || isPulling}
                              className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-[11px] cursor-pointer disabled:opacity-50"
                            >
                              Link Only
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : driveScanned ? (
                    <p className="text-[11px] text-indigo-800/90">
                      No TravEase spreadsheet found automatically in Google Drive yet. Create a new sheet below, or paste an existing Google Sheet URL/ID to connect.
                    </p>
                  ) : null}
                </div>
              )}

              {/* Mode Selector Tabs */}
              <div className="flex border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => setMode('create')}
                  className={`flex-1 py-2 text-center text-xs font-semibold border-b-2 transition-colors flex items-center justify-center gap-1.5 min-h-[40px] ${
                    mode === 'create'
                      ? 'border-emerald-600 text-emerald-800 bg-emerald-50/40'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Create New Spreadsheet</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('link')}
                  className={`flex-1 py-2 text-center text-xs font-semibold border-b-2 transition-colors flex items-center justify-center gap-1.5 min-h-[40px] ${
                    mode === 'link'
                      ? 'border-emerald-600 text-emerald-800 bg-emerald-50/40'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <LinkIcon className="w-4 h-4" />
                  <span>Connect Existing Sheet</span>
                </button>
              </div>

              {mode === 'create' ? (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-800 block text-xs">
                      Spreadsheet Name
                    </label>
                    <input
                      type="text"
                      value={newSheetTitle}
                      onChange={(e) => setNewSheetTitle(e.target.value)}
                      placeholder="e.g. TravEase Corporate Travel Tracker 2026"
                      className="w-full bg-white px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <p className="text-[11px] text-slate-500">
                      Creates a dedicated Google Sheet with 8 report tabs plus an encrypted-structure multi-device sync store so any device signing into your Google account can load it.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleCreateSheet}
                    disabled={isCreating}
                    className="w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-semibold rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-all min-h-[44px] disabled:opacity-50 cursor-pointer"
                  >
                    <PlusCircle className={`w-4 h-4 ${isCreating ? 'animate-spin' : ''}`} />
                    <span>{isCreating ? 'Creating & Syncing...' : 'Create & Synchronize Sheet'}</span>
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-800 block text-xs">
                      Google Sheet URL or Spreadsheet ID
                    </label>
                    <input
                      type="text"
                      value={inputUrlOrId}
                      onChange={(e) => setInputUrlOrId(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                      className="w-full bg-white px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono text-[11px]"
                    />
                    <p className="text-[11px] text-slate-500">
                      Paste your existing TravEase sheet link to load data from another device, or connect a blank sheet with Editor access.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleConnectExisting(undefined, true)}
                      disabled={isConnecting || isPulling}
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-semibold rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-all min-h-[44px] disabled:opacity-50 cursor-pointer"
                    >
                      <Download className={`w-4 h-4 ${isConnecting ? 'animate-bounce' : ''}`} />
                      <span>{isConnecting ? 'Loading Sheet...' : 'Connect & Load Data'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleConnectExisting(undefined, false)}
                      disabled={isConnecting || isPulling}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-semibold rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-all min-h-[44px] disabled:opacity-50 cursor-pointer"
                    >
                      <LinkIcon className={`w-4 h-4 ${isConnecting ? 'animate-spin' : ''}`} />
                      <span>{isConnecting ? 'Connecting...' : 'Connect Without Overwriting'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section 3: Firebase Domain & Deployment Guide Accordion */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/60">
            <button
              type="button"
              onClick={() => setShowDomainHelp(!showDomainHelp)}
              className="w-full px-4 py-2.5 flex items-center justify-between text-left text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-indigo-600" />
                <span className="font-bold text-xs">Firebase & Deployment Domain Settings</span>
                {domainInfo.isVercel && (
                  <span className="px-1.5 py-0.2 bg-slate-200 text-slate-800 rounded text-[10px] font-mono">
                    Vercel
                  </span>
                )}
              </div>
              {showDomainHelp ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </button>

            {showDomainHelp && (
              <div className="p-4 pt-1 space-y-3 text-[11px] text-slate-600 border-t border-slate-200/60 bg-white">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">Current Running Host</span>
                    <span className="font-mono font-bold text-slate-800 text-xs block truncate">{domainInfo.hostname}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">Firebase Project ID</span>
                    <span className="font-mono font-bold text-slate-800 text-xs block truncate">{domainInfo.projectId}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="font-bold text-slate-800 block">Why did Firebase show a sync error?</span>
                  <p className="leading-relaxed">
                    Firebase Authentication enforces strict domain allowlisting for security. When deployed to <strong>Vercel</strong> or custom cloud domains, Google Sign-In popups are rejected until the domain is listed under <strong>Authorized domains</strong>.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <a
                    href={domainInfo.firebaseConsoleAuthUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    <span>Open Firebase Authorized Domains</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    type="button"
                    onClick={() => handleCopyDomain(domainInfo.isVercel ? 'vercel.app' : domainInfo.hostname)}
                    className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    {copiedDomain ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                    <span>{copiedDomain ? 'Copied!' : `Copy "${domainInfo.isVercel ? 'vercel.app' : domainInfo.hostname}"`}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="text-[11px] text-slate-400">
            TravEase Cloud Sync · Google Sheets API v4
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors min-h-[38px] cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* Mandatory User Confirmation Dialog before mutating/syncing data (SKILL.md Requirement) */}
      {showConfirmSync && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm leading-tight">
                  Confirm Google Sheets Synchronization
                </h3>
                <span className="text-[11px] text-slate-500">
                  Update spreadsheet contents with app records
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This action will update the tabs in <strong>{linkedSpreadsheetTitle || 'your Google Sheet'}</strong> with the current <strong>{totalRecords} records</strong> from TravEase (vouchers, advances, disbursements, settlements, vendor payments, and team members).
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowConfirmSync(false)}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 min-h-[38px] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteSync}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-lg shadow-sm flex items-center gap-1.5 min-h-[38px] transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm & Synchronize</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog before loading Cloud Sheet data into Local Device */}
      {pendingCloudPull && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center shrink-0">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm leading-tight">
                  Load Cloud Data from Google Sheet
                </h3>
                <span className="text-[11px] text-slate-500">
                  {pendingCloudPull.meta.title}
                </span>
              </div>
            </div>

            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-1.5 text-[11px] text-indigo-950">
              <span className="font-bold block">Records found in Google Sheet:</span>
              <div className="grid grid-cols-2 gap-1 font-mono text-[11px]">
                <span>Projects: {pendingCloudPull.payload.data.projects.length}</span>
                <span>Team: {pendingCloudPull.payload.data.teamMembers.length}</span>
                <span>Vouchers: {pendingCloudPull.payload.data.vouchers.length}</span>
                <span>Advances: {pendingCloudPull.payload.data.advances.length}</span>
                <span>Disbursements: {pendingCloudPull.payload.data.disbursements.length}</span>
                <span>Settlements: {pendingCloudPull.payload.data.settlements.length}</span>
              </div>
              {pendingCloudPull.payload.syncedAtDisplay && (
                <span className="block text-[10px] text-indigo-700 pt-1">
                  Cloud snapshot time: {pendingCloudPull.payload.syncedAtDisplay}
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This will replace your current local browser records ({totalRecords} items) with the cloud data from <strong>{pendingCloudPull.meta.title}</strong>.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPendingCloudPull(null)}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 min-h-[38px] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCloudPull}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-lg shadow-sm flex items-center gap-1.5 min-h-[38px] transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm & Load Data</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
