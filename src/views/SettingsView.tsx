import React, { useState } from 'react';
import {
  Settings,
  Database,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  CheckCircle,
  AlertTriangle,
  ShieldCheck,
  FileText,
  Phone,
  Layers,
  FileSpreadsheet,
  ExternalLink,
  Cloud,
  X,
  RotateCcw,
  Sparkles,
  Globe,
  Copy,
  Check,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getCurrentDomainInfo } from '../services/googleAuth';

export const SettingsView: React.FC = () => {
  const {
    resetToSampleData,
    clearTransactionsOnly,
    clearAllData,
    exportBackupJson,
    importBackupJson,
    vouchers,
    advances,
    disbursements,
    settlements,
    vendorPayments,
    recoveries,
    teamMembers,
    notifications,
    activities,
    linkedSpreadsheetId,
    linkedSpreadsheetTitle,
    linkedSpreadsheetUrl,
    lastSyncedAt,
    setIsGoogleSheetsModalOpen,
  } = useApp();

  const domainInfo = getCurrentDomainInfo();
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [resetModalMode, setResetModalMode] = useState<'sample' | 'transactions' | 'all' | null>(null);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  const handleCopyDomain = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDomain(true);
    setTimeout(() => setCopiedDomain(false), 3000);
  };

  const handleExport = () => {
    const jsonStr = exportBackupJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `travel_expense_manager_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importBackupJson(content);
      if (success) {
        setImportStatus('Backup data imported successfully!');
      } else {
        setImportStatus('Failed to import backup data. Invalid JSON schema.');
      }
      setTimeout(() => setImportStatus(null), 4000);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 pb-20 text-xs">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Settings & Data Management
          </h1>
          <span className="font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
            v1.0.0
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          Local persistence management, JSON data backup & restore, sample test data loader
        </p>
      </div>

      {/* System Status and Record Counts */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
        <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Database className="w-4 h-4 text-indigo-600" />
          <span>Local Storage Record Statistics</span>
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] text-slate-400 block font-semibold uppercase">Team Members</span>
            <span className="text-base font-bold font-mono text-slate-800">{teamMembers.length}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] text-slate-400 block font-semibold uppercase">Travel Vouchers</span>
            <span className="text-base font-bold font-mono text-slate-800">{vouchers.length}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] text-slate-400 block font-semibold uppercase">Advance Records</span>
            <span className="text-base font-bold font-mono text-slate-800">{advances.length}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] text-slate-400 block font-semibold uppercase">Disbursements</span>
            <span className="text-base font-bold font-mono text-slate-800">{disbursements.length}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] text-slate-400 block font-semibold uppercase">Settlements</span>
            <span className="text-base font-bold font-mono text-slate-800">{settlements.length}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] text-slate-400 block font-semibold uppercase">Vendor Payments</span>
            <span className="text-base font-bold font-mono text-slate-800">{vendorPayments.length}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] text-slate-400 block font-semibold uppercase">Combined Recoveries</span>
            <span className="text-base font-bold font-mono text-slate-800">{recoveries.length}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] text-slate-400 block font-semibold uppercase">Audit Log Entries</span>
            <span className="text-base font-bold font-mono text-slate-800">{activities.length}</span>
          </div>
        </div>
      </div>

      {/* Factory Reset & Sample Scenarios - Primary Section */}
      <div className="bg-white rounded-2xl border-2 border-indigo-100 shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Factory Reset & Data Wipe
              </h2>
              <p className="text-[11px] text-slate-500">
                Wipe sample records, clear transactions, or perform a complete factory reset
              </p>
            </div>
          </div>
          <span className="text-[10px] uppercase tracking-wider font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md self-start sm:self-auto">
            Zero Mock Data / Production Ready
          </span>
        </div>

        {resetSuccessMessage && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-semibold flex items-center justify-between gap-2 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{resetSuccessMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setResetSuccessMessage(null)}
              className="text-emerald-700 hover:text-emerald-900 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Restore Sample Scenarios */}
          <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-indigo-900 font-bold text-xs">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Restore Sample Data</span>
              </div>
              <p className="text-indigo-800/80 text-[11px] leading-relaxed">
                Restores full realistic scenario data: 5 team members, 5 active projects, 7 travel vouchers across all workflow stages (Approved, Advance Raised, Disbursed, Closed), settlements, and WhatsApp logs.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setResetModalMode('sample')}
              className="w-full px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-semibold rounded-lg shadow-xs flex items-center justify-center gap-1.5 min-h-[40px] transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Restore Sample Scenarios</span>
            </button>
          </div>

          {/* Card 2: Factory Reset (Transactions Only - Keep Masters) */}
          <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 flex flex-col justify-between space-y-3 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-amber-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg uppercase tracking-wider">
              Recommended
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-amber-950 font-bold text-xs">
                <RefreshCw className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Factory Reset (Keep Masters)</span>
              </div>
              <p className="text-amber-900/80 text-[11px] leading-relaxed">
                Clears all vouchers, advances, disbursements, settlements, vendor payments, recoveries, and audit logs to <strong>0</strong>. Keeps your Team Members & Projects intact so you can enter real vouchers immediately.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setResetModalMode('transactions')}
              className="w-full px-3.5 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-semibold rounded-lg shadow-xs flex items-center justify-center gap-1.5 min-h-[40px] transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Clear All Transactions</span>
            </button>
          </div>

          {/* Card 3: Complete Database Wipe */}
          <div className="p-4 bg-rose-50/50 rounded-xl border border-rose-200 flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-rose-950 font-bold text-xs">
                <Trash2 className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Factory Reset (Wipe All)</span>
              </div>
              <p className="text-rose-900/80 text-[11px] leading-relaxed">
                Permanently wipes all local tables including team members and projects to start from a 100% blank slate with zero records.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setResetModalMode('all')}
              className="w-full px-3.5 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-semibold rounded-lg shadow-xs flex items-center justify-center gap-1.5 min-h-[40px] transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Wipe All Local Data</span>
            </button>
          </div>
        </div>
      </div>

      {/* Google Sheets Cloud Integration */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Google Sheets Live Cloud Sync</span>
          </h2>
          {linkedSpreadsheetId && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 self-start sm:self-auto">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Connected & Synced</span>
            </span>
          )}
        </div>

        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="font-bold text-slate-800 block text-xs">
                {linkedSpreadsheetId
                  ? linkedSpreadsheetTitle || 'TravEase Google Spreadsheet'
                  : 'No Google Sheet currently connected'}
              </span>
              <p className="text-slate-500 text-[11px] mt-0.5">
                {linkedSpreadsheetId
                  ? `Last synchronized: ${lastSyncedAt || 'Just now'} · ID: ${linkedSpreadsheetId}`
                  : 'Link a Google Sheet to push edits from this device and automatically discover & load your register when signing in from another device.'}
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              {linkedSpreadsheetId && (
                <a
                  href={linkedSpreadsheetUrl || `https://docs.google.com/spreadsheets/d/${linkedSpreadsheetId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 text-xs font-semibold text-emerald-700 bg-white border border-emerald-200 hover:bg-emerald-50 rounded-lg flex items-center gap-1.5 transition-colors min-h-[40px]"
                >
                  <span>Open Sheet</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              <button
                type="button"
                onClick={() => setIsGoogleSheetsModalOpen(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-all min-h-[40px] cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>{linkedSpreadsheetId ? 'Manage / Sync Sheet' : 'Connect Google Sheet'}</span>
              </button>
            </div>
          </div>

          {/* Firebase Domain Authorization Status Bar */}
          <div className="pt-2 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-2 text-slate-600 min-w-0">
              <Globe className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="font-medium text-slate-700">App Domain:</span>
              <code className="font-mono text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-200 truncate">
                {domainInfo.hostname}
              </code>
              {domainInfo.isLocalhost ? (
                <span className="text-emerald-700 font-semibold text-[10px]">✓ Localhost authorized</span>
              ) : (
                <span className="text-slate-500 text-[10px]">
                  {domainInfo.isVercel ? 'Requires "vercel.app" in Firebase' : 'Add domain to Firebase if sync errors'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleCopyDomain(domainInfo.isVercel ? 'vercel.app' : domainInfo.hostname)}
                className="px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-md flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
              >
                {copiedDomain ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedDomain ? 'Copied' : `Copy ${domainInfo.isVercel ? 'vercel.app' : 'Domain'}`}</span>
              </button>

              <a
                href={domainInfo.firebaseConsoleAuthUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md flex items-center gap-1 transition-colors"
                title="Open Firebase Console Authentication Settings"
              >
                <span>Firebase Auth Settings</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Backup and Restore */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Download className="w-4 h-4 text-indigo-600" />
          <span>Database Backup & Restore</span>
        </h2>

        {importStatus && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-semibold flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>{importStatus}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <span className="font-bold text-slate-800 block text-xs">Export Backup (JSON)</span>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Downloads a snapshot containing all team members, vouchers, advances, disbursements, settlements, vendor payments, and activity logs.
            </p>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors min-h-[40px]"
            >
              <Download className="w-4 h-4" />
              <span>Download Backup File</span>
            </button>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <span className="font-bold text-slate-800 block text-xs">Restore from JSON File</span>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Upload a previously exported backup file to restore complete records and mapping tables.
            </p>
            <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg shadow-xs cursor-pointer min-h-[40px]">
              <Upload className="w-4 h-4" />
              <span>Choose Backup File</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportFile}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* In-App Confirmation Modal for Factory Reset */}
      {resetModalMode && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div
              className={`p-5 text-white flex items-start justify-between ${
                resetModalMode === 'sample'
                  ? 'bg-indigo-600'
                  : resetModalMode === 'transactions'
                  ? 'bg-amber-600'
                  : 'bg-rose-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  {resetModalMode === 'sample' ? (
                    <Sparkles className="w-5 h-5 text-white" />
                  ) : resetModalMode === 'transactions' ? (
                    <RefreshCw className="w-5 h-5 text-white" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-white" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">
                    {resetModalMode === 'sample'
                      ? 'Restore Sample Demonstration Data'
                      : resetModalMode === 'transactions'
                      ? 'Factory Reset: Clear All Transactions'
                      : 'Factory Reset: Complete Database Wipe'}
                  </h3>
                  <span className="text-[11px] text-white/80">
                    Confirmation required
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResetModalMode(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              {resetModalMode === 'sample' && (
                <div className="space-y-3">
                  <p className="text-slate-600 leading-relaxed">
                    This will load the realistic multi-scenario demo dataset: 5 active team members, 5 project codes, 7 travel vouchers in distinct workflow statuses, advances, disbursements, and recovery records.
                  </p>
                  <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-900 text-[11px] space-y-1">
                    <span className="font-bold block">What will happen:</span>
                    <ul className="list-disc pl-4 space-y-0.5">
                      <li>Current records will be overwritten by sample records.</li>
                      <li>Local storage will be refreshed immediately.</li>
                    </ul>
                  </div>
                </div>
              )}

              {resetModalMode === 'transactions' && (
                <div className="space-y-3">
                  <p className="text-slate-600 leading-relaxed">
                    This will reset all operational transaction ledgers to <strong>0</strong> so you can start recording real company travel data without any demo vouchers.
                  </p>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] space-y-1">
                    <span className="font-bold block">What will be cleared (set to 0):</span>
                    <ul className="list-disc pl-4 space-y-0.5">
                      <li>All Travel Vouchers ({vouchers.length})</li>
                      <li>All Advances & Mappings ({advances.length})</li>
                      <li>All Disbursements ({disbursements.length})</li>
                      <li>All Settlements ({settlements.length})</li>
                      <li>All Vendor Payments ({vendorPayments.length}) & Recoveries ({recoveries.length})</li>
                      <li>All WhatsApp & Audit trail logs ({activities.length})</li>
                    </ul>
                    <span className="font-bold block pt-1 text-emerald-800">
                      ✓ Kept Intact: Team Members ({teamMembers.length}) & Projects
                    </span>
                  </div>
                </div>
              )}

              {resetModalMode === 'all' && (
                <div className="space-y-3">
                  <p className="text-slate-600 leading-relaxed">
                    Are you sure you want to perform a <strong>complete factory wipe</strong>? This will clear all records across every table including Master Team Members and Projects.
                  </p>
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-[11px] space-y-1">
                    <span className="font-bold block text-rose-800">
                      Warning: All {teamMembers.length} team members and all transaction records will be erased to 0.
                    </span>
                    <p className="text-[10px] text-rose-700">
                      You will need to re-add team members and projects before creating new vouchers.
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResetModalMode(null)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg transition-colors min-h-[38px]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (resetModalMode === 'sample') {
                      resetToSampleData();
                      setResetSuccessMessage('Sample test scenario data loaded successfully.');
                    } else if (resetModalMode === 'transactions') {
                      clearTransactionsOnly();
                      setResetSuccessMessage('Factory reset completed: All transaction records have been cleared to 0. Team and projects are ready for real data.');
                    } else if (resetModalMode === 'all') {
                      clearAllData();
                      setResetSuccessMessage('Factory reset completed: All local records have been wiped to 0.');
                    }
                    setResetModalMode(null);
                    setTimeout(() => setResetSuccessMessage(null), 6000);
                  }}
                  className={`px-4 py-2 font-semibold text-white rounded-lg shadow-sm transition-all min-h-[38px] ${
                    resetModalMode === 'sample'
                      ? 'bg-indigo-600 hover:bg-indigo-700'
                      : resetModalMode === 'transactions'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {resetModalMode === 'sample'
                    ? 'Confirm Load Sample Data'
                    : resetModalMode === 'transactions'
                    ? 'Confirm Clear Transactions'
                    : 'Confirm Full Wipe'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Operating Guidelines Card */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-3 shadow-md">
        <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>System Operating Principles (Section 2 & 11)</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-300 text-[11px] leading-relaxed">
          <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 space-y-1">
            <span className="font-bold text-white block">Voucher Master Reference</span>
            <span>
              Exactly one master record per travel voucher. Human-readable Voucher No. (e.g. V-2026-014) is the primary identifier across notifications and everyday searches.
            </span>
          </div>
          <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 space-y-1">
            <span className="font-bold text-white block">WhatsApp Privacy Safeguard</span>
            <span>
              Internal accounting IDs (Advance ID & Settlement ID) are kept strictly within the app and never displayed in WhatsApp notifications sent to employees.
            </span>
          </div>
          <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 space-y-1">
            <span className="font-bold text-white block">Multi-Voucher Mapping</span>
            <span>
              One advance or settlement can cover multiple vouchers; one recovery request can bundle multiple personal vendor payments without duplicate expense recording.
            </span>
          </div>
          <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 space-y-1">
            <span className="font-bold text-white block">Indian Corporate Localization</span>
            <span>
              Indian Rupee formatting (₹), DD-MM-YYYY dates, and international standard phone normalization (+91) for WhatsApp Click-to-Chat.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
