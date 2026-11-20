import type {
  TravelVoucher,
  AdvanceRecord,
  AdvanceVoucherMapping,
  EmployeeDisbursement,
  SettlementRecord,
  VendorPaymentRecord,
  AccountsRecoveryRequest,
  RecoveryPaymentMapping,
  SettlementVoucherMapping,
  ProjectRecord,
  TeamMember,
} from '../types';

import {
  SYNC_STORE_TAB,
  HUMAN_READABLE_TABS,
  ALL_TRAVEASE_TABS,
  buildSyncStoreRows,
  parseSyncStoreRows,
  parseHumanReadableTabsFallback,
  type AppSyncData,
  type CloudSyncPayload,
  type FullAppDataPayload,
} from './googleSheetsSerializer';

export type { AppSyncData, CloudSyncPayload, FullAppDataPayload };

export interface SpreadsheetMetadata {
  id: string;
  title: string;
  url: string;
  sheets: string[];
}

export interface DriveSpreadsheetFile {
  id: string;
  name: string;
  url: string;
  modifiedTime?: string;
  isTravEaseApp?: boolean;
}

/**
 * Extracts a spreadsheet ID from either a full Google Sheets URL or raw ID.
 */
export function extractSpreadsheetId(input: string): string {
  const trimmed = input.trim();
  // Standard format: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/...
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  // If already an ID (alphanumeric, dashes, underscores)
  if (/^[a-zA-Z0-9-_]{15,}$/.test(trimmed)) {
    return trimmed;
  }
  return trimmed;
}

export class SheetsApiError extends Error {
  status: number;
  apiStatus?: string;

  constructor(message: string, status: number, apiStatus?: string) {
    super(message);
    this.name = 'SheetsApiError';
    this.status = status;
    this.apiStatus = apiStatus;
  }
}

async function sheetsFetch(
  url: string,
  accessToken: string,
  init: RequestInit = {}
): Promise<Response> {
  const cleanToken = (accessToken || '').trim().replace(/^Bearer\s+/i, '');
  if (!cleanToken) {
    throw new SheetsApiError('Missing OAuth 2 access token. Please sign in with Google.', 401, 'UNAUTHENTICATED');
  }

  const headers = new Headers(init.headers || {});
  headers.set('Authorization', `Bearer ${cleanToken}`);

  const res = await fetch(url, {
    ...init,
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const msg =
      errorData.error?.message ||
      `Google Sheets request failed (${res.status}: ${res.statusText}).`;
    throw new SheetsApiError(msg, res.status, errorData.error?.status);
  }

  return res;
}

/**
 * Fetches spreadsheet metadata to verify connection and read tab names.
 */
export async function getSpreadsheetMetadata(
  spreadsheetId: string,
  accessToken: string
): Promise<SpreadsheetMetadata> {
  const res = await sheetsFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetId,properties.title,sheets.properties(sheetId,title)`,
    accessToken
  );

  const data = await res.json();
  const sheets = (data.sheets || []).map((s: any) => s.properties?.title || '');
  return {
    id: data.spreadsheetId,
    title: data.properties?.title || 'TravEase Travel & Expense Tracker',
    url: `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}`,
    sheets,
  };
}

/**
 * Lists TravEase / accessible spreadsheets in the signed-in user's Google Drive
 * so any device logging in with the same Google account can automatically discover
 * and load its synced data without re-pasting URLs.
 */
export async function listTravEaseSpreadsheets(
  accessToken: string
): Promise<DriveSpreadsheetFile[]> {
  const q = encodeURIComponent(
    "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false"
  );
  const fields = encodeURIComponent('files(id,name,webViewLink,modifiedTime,appProperties)');
  const res = await sheetsFetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&orderBy=modifiedTime%20desc&pageSize=25&fields=${fields}`,
    accessToken
  );

  const data = await res.json();
  const files: any[] = Array.isArray(data.files) ? data.files : [];

  const mapped: DriveSpreadsheetFile[] = files.map((f) => ({
    id: String(f.id),
    name: String(f.name || 'Untitled Spreadsheet'),
    url: String(f.webViewLink || `https://docs.google.com/spreadsheets/d/${f.id}`),
    modifiedTime: f.modifiedTime ? String(f.modifiedTime) : undefined,
    isTravEaseApp:
      f.appProperties?.travEaseApp === 'true' ||
      String(f.name || '').toLowerCase().includes('travease'),
  }));

  // Prioritize tagged TravEase sheets first while preserving recency order
  return mapped.sort((a, b) => {
    if (a.isTravEaseApp !== b.isTravEaseApp) {
      return a.isTravEaseApp ? -1 : 1;
    }
    return (b.modifiedTime || '').localeCompare(a.modifiedTime || '');
  });
}

/**
 * Best-effort tags a spreadsheet with TravEase appProperties so it stands out in Drive discovery.
 */
async function tagSpreadsheetAsTravEase(spreadsheetId: string, accessToken: string): Promise<void> {
  try {
    await sheetsFetch(`https://www.googleapis.com/drive/v3/files/${spreadsheetId}`, accessToken, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        appProperties: {
          travEaseApp: 'true',
          travEaseVersion: '2',
        },
      }),
    });
  } catch (err: any) {
    // Re-throw auth errors; ignore permission/metadata errors on shared external sheets
    if (err?.status === 401) throw err;
  }
}

/**
 * Creates a new Google Spreadsheet with dedicated TravEase tabs + hidden sync store.
 */
export async function createTravEaseSpreadsheet(
  title: string,
  accessToken: string
): Promise<SpreadsheetMetadata> {
  const sheetTitles = [...ALL_TRAVEASE_TABS];

  const requestBody = {
    properties: {
      title:
        title ||
        `TravEase - Corporate Travel & Expense Management (${new Date().toLocaleDateString('en-IN')})`,
    },
    sheets: sheetTitles.map((tabTitle) => ({
      properties: {
        title: tabTitle,
        hidden: tabTitle === SYNC_STORE_TAB,
        gridProperties: {
          rowCount: 200,
          columnCount: tabTitle === SYNC_STORE_TAB ? 6 : 20,
          frozenRowCount: 1,
        },
      },
    })),
  };

  const res = await sheetsFetch('https://sheets.googleapis.com/v4/spreadsheets', accessToken, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  const created = await res.json();
  await tagSpreadsheetAsTravEase(created.spreadsheetId, accessToken);

  return {
    id: created.spreadsheetId,
    title: created.properties?.title || title,
    url: `https://docs.google.com/spreadsheets/d/${created.spreadsheetId}`,
    sheets: sheetTitles,
  };
}

/**
 * Ensures required TravEase sheet tabs exist in an existing spreadsheet.
 */
async function ensureTabsExist(
  spreadsheetId: string,
  existingTabs: string[],
  requiredTabs: readonly string[],
  accessToken: string
) {
  const missingTabs = requiredTabs.filter((tab) => !existingTabs.includes(tab));
  if (missingTabs.length === 0) return;

  const addRequests = missingTabs.map((tabTitle) => ({
    addSheet: {
      properties: {
        title: tabTitle,
        hidden: tabTitle === SYNC_STORE_TAB,
        gridProperties: {
          rowCount: 200,
          columnCount: tabTitle === SYNC_STORE_TAB ? 6 : 20,
          frozenRowCount: 1,
        },
      },
    },
  }));

  await sheetsFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    accessToken,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests: addRequests }),
    }
  );
}

/**
 * Pulls complete TravEase application data from a Google Spreadsheet so any device
 * signing into the same Google account can access and work with live cloud records.
 */
export async function pullAllFromGoogleSheets(
  spreadsheetId: string,
  accessToken: string
): Promise<{
  payload: CloudSyncPayload;
  source: 'sync_store' | 'parsed_tabs';
  meta: SpreadsheetMetadata;
}> {
  const meta = await getSpreadsheetMetadata(spreadsheetId, accessToken);

  // 1. Prefer lossless chunked JSON store (_TravEase_SyncStore) when present
  if (meta.sheets.includes(SYNC_STORE_TAB)) {
    const storeRange = encodeURIComponent(`'${SYNC_STORE_TAB}'!A1:F200`);
    const res = await sheetsFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${storeRange}`,
      accessToken
    );
    const json = await res.json();
    const parsed = parseSyncStoreRows(json.values || []);
    if (parsed) {
      return { payload: parsed, source: 'sync_store', meta };
    }
  }

  // 2. Fallback: reconstruct state from the human-readable TravEase tabs present
  const existingReadableTabs = HUMAN_READABLE_TABS.filter((t) => meta.sheets.includes(t));
  if (existingReadableTabs.length > 0) {
    const rangesQuery = existingReadableTabs
      .map((t) => `ranges=${encodeURIComponent(`'${t}'!A1:Z500`)}`)
      .join('&');
    const res = await sheetsFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${rangesQuery}`,
      accessToken
    );
    const json = await res.json();
    const valueRanges: any[] = Array.isArray(json.valueRanges) ? json.valueRanges : [];
    const tabMap: Record<string, unknown[][]> = {};
    existingReadableTabs.forEach((tabName, idx) => {
      tabMap[tabName] = valueRanges[idx]?.values || [];
    });

    const fallbackPayload = parseHumanReadableTabsFallback(tabMap);
    if (fallbackPayload) {
      return { payload: fallbackPayload, source: 'parsed_tabs', meta };
    }
  }

  throw new SheetsApiError(
    `Spreadsheet "${meta.title}" does not contain any TravEase records yet. Push data from your primary device first, or choose another spreadsheet.`,
    404,
    'NOT_FOUND'
  );
}

/**
 * Synchronizes all application travel data to the Google Spreadsheet.
 */
export async function syncAllToGoogleSheets(
  spreadsheetId: string,
  accessToken: string,
  data: AppSyncData
): Promise<{ updatedCount: number; timestamp: string }> {
  // First, verify metadata and add any missing tabs (including _TravEase_SyncStore)
  const meta = await getSpreadsheetMetadata(spreadsheetId, accessToken);
  await ensureTabsExist(spreadsheetId, meta.sheets, ALL_TRAVEASE_TABS, accessToken);

  const teamMap = new Map(data.teamMembers.map((m) => [m.id, m]));
  const advMap = new Map(data.advances.map((a) => [a.id, a]));
  const vMap = new Map(data.vouchers.map((v) => [v.id, v]));

  // Build Tab 1: TravEase Summary
  const totalClaimed = data.vouchers.reduce((s, v) => s + (v.claimedAmount || 0), 0);
  const totalApproved = data.vouchers.reduce((s, v) => s + (v.approvedAmount || 0), 0);
  const totalAdvances = data.advances.reduce((s, a) => s + (a.amountActuallyReceived || a.requestedAmount || 0), 0);
  const totalDisbursed = data.disbursements.reduce((s, d) => s + (d.amountDisbursed || 0), 0);
  const totalSettled = data.settlements.reduce((s, set) => s + (set.actualAmountSettled || set.settlementAmount || 0), 0);
  const totalRecoveries = data.recoveries.reduce((s, r) => s + (r.requestedAmount || 0), 0);

  const summaryValues = [
    ['TravEase Executive Financial & Operational Dashboard', '', '', ''],
    ['Last Synchronized', new Date().toLocaleString('en-IN'), 'App Version', 'TravEase Cloud v2.0'],
    ['', '', '', ''],
    ['Core Metric', 'Amount (INR)', 'Record Count', 'Status Notes'],
    ['Total Travel Claims Submitted', totalClaimed, data.vouchers.length, 'All submitted travel vouchers'],
    ['Total Vouchers Approved by Admin', totalApproved, data.vouchers.filter((v) => v.verificationStatus === 'Approved').length, 'Verified & approved expense basis'],
    ['Total Advance Funds Received', totalAdvances, data.advances.length, 'Corporate & project advance receipts'],
    ['Total Disbursed to Employees', totalDisbursed, data.disbursements.length, 'Paid out to travelers against approved advances'],
    ['Total Settled Accounts', totalSettled, data.settlements.length, 'Fully closed and audited travel accounts'],
    ['Total Admin Personal Recoveries', totalRecoveries, data.recoveries.length, 'Direct vendor bookings covered by Admin'],
    ['', '', '', ''],
    ['Status Breakdown', 'Count', 'Approved Amount (₹)', 'Disbursed (₹)'],
    [
      'Approved (Pending Advance)',
      data.vouchers.filter((v) => v.overallStatus === 'Approved').length,
      data.vouchers.filter((v) => v.overallStatus === 'Approved').reduce((s, v) => s + (v.approvedAmount || 0), 0),
      0,
    ],
    [
      'Advance Raised',
      data.vouchers.filter((v) => v.overallStatus === 'Advance Raised').length,
      data.vouchers.filter((v) => v.overallStatus === 'Advance Raised').reduce((s, v) => s + (v.approvedAmount || 0), 0),
      0,
    ],
    [
      'Advance Approved',
      data.vouchers.filter((v) => v.overallStatus === 'Advance Approved').length,
      data.vouchers.filter((v) => v.overallStatus === 'Advance Approved').reduce((s, v) => s + (v.approvedAmount || 0), 0),
      0,
    ],
    [
      'Pending for Settlement',
      data.vouchers.filter((v) => v.overallStatus === 'Pending for Settlement').length,
      data.vouchers.filter((v) => v.overallStatus === 'Pending for Settlement').reduce((s, v) => s + (v.approvedAmount || 0), 0),
      data.vouchers.filter((v) => v.overallStatus === 'Pending for Settlement').reduce((s, v) => {
        const d = data.disbursements.find((item) => item.voucherRecordId === v.id);
        return s + (d?.amountDisbursed || 0);
      }, 0),
    ],
    [
      'Closed / Completed',
      data.vouchers.filter((v) => v.overallStatus === 'Closed' || v.overallStatus === 'Completed').length,
      data.vouchers.filter((v) => v.overallStatus === 'Closed' || v.overallStatus === 'Completed').reduce((s, v) => s + (v.approvedAmount || 0), 0),
      data.vouchers.filter((v) => v.overallStatus === 'Closed' || v.overallStatus === 'Completed').reduce((s, v) => {
        const d = data.disbursements.find((item) => item.voucherRecordId === v.id);
        return s + (d?.amountDisbursed || 0);
      }, 0),
    ],
  ];

  // Build Tab 2: Travel Vouchers
  const voucherHeader = [
    'Voucher No',
    'Employee Name',
    'Employee ID',
    'WhatsApp Phone',
    'Base Location',
    'Travel Destination',
    'Project Name',
    'Travel Start Date',
    'Travel End Date',
    'Travel Scenario',
    'Claimed Amount (₹)',
    'Approved Amount (₹)',
    'Overall Status',
    'Settlement Status',
    'Verified By',
    'Approval Date',
    'Description & Notes',
    'Voucher Record ID',
  ];

  const voucherRows = data.vouchers.map((v) => {
    const mem = teamMap.get(v.teamMemberId);
    return [
      v.voucherNo,
      mem?.fullName || 'Unassigned',
      mem?.empId || '—',
      mem?.whatsappNumber || '—',
      v.baseLocation,
      v.travelTo,
      v.projectName,
      v.travelStartDate,
      v.travelEndDate,
      v.travelScenario,
      v.claimedAmount,
      v.approvedAmount,
      v.overallStatus,
      v.settlementStatus,
      v.verifiedBy || '—',
      v.voucherApprovedDate || '—',
      v.expenseDescription || v.remarks || '',
      v.id,
    ];
  });

  // Build Tab 3: Advances
  const advanceHeader = [
    'Advance ID',
    'Request Date',
    'Status',
    'Requested Amount (₹)',
    'Approved Amount (₹)',
    'Actually Received (₹)',
    'Total Disbursed (₹)',
    'Available To Disburse (₹)',
    'Bank / Cash Receipt Ref',
    'Funds Received Date',
    'Mapped Voucher Numbers',
    'Allocated Amounts',
    'Remarks',
    'Internal Record ID',
  ];

  const advanceRows = data.advances.map((adv) => {
    const maps = data.advanceVoucherMappings.filter((m) => m.advanceRecordId === adv.id);
    const mappedVouchersStr = maps
      .map((m) => {
        const v = vMap.get(m.voucherRecordId);
        return v ? `${v.voucherNo} (₹${m.allocatedAdvanceAmount})` : `₹${m.allocatedAdvanceAmount}`;
      })
      .join(', ');
    const totalAllocated = maps.reduce((s, m) => s + (m.allocatedAdvanceAmount || 0), 0);
    const available = Math.max(0, (adv.amountActuallyReceived || 0) - (adv.amountDisbursed || 0));

    return [
      adv.advanceId,
      adv.advanceRaisedDate,
      adv.status,
      adv.requestedAmount,
      adv.approvedAmount || adv.requestedAmount,
      adv.amountActuallyReceived || 0,
      adv.amountDisbursed || 0,
      available,
      adv.bankCashReceiptRef || '—',
      adv.fundsReceivedDate || '—',
      mappedVouchersStr || 'Unmapped Pool',
      totalAllocated,
      adv.remarks || '',
      adv.id,
    ];
  });

  // Build Tab 4: Disbursements
  const disbHeader = [
    'Disbursement ID',
    'Disbursement Date',
    'Recipient Employee',
    'Employee ID',
    'Linked Voucher No',
    'Advance Reference ID',
    'Amount Disbursed (₹)',
    'Payment Method',
    'Transaction Reference',
    'Remarks',
    'Internal ID',
  ];

  const disbRows = data.disbursements.map((d) => {
    const mem = teamMap.get(d.employeeId);
    const v = vMap.get(d.voucherRecordId);
    const adv = advMap.get(d.advanceRecordId);
    return [
      d.id,
      d.disbursementDate,
      mem?.fullName || '—',
      mem?.empId || '—',
      v?.voucherNo || '—',
      adv?.advanceId || d.advanceRecordId,
      d.amountDisbursed,
      d.paymentMethod,
      d.transactionRef,
      d.remarks || '',
      d.id,
    ];
  });

  // Build Tab 5: Settlements
  // Build Tab 5: Settlements
  const setHeader = [
    'Settlement ID',
    'Advance Reference',
    'Initiated Date',
    'Completion Date',
    'Accounting Status',
    'Settlement Amount (₹)',
    'Actual Amount Settled (₹)',
    'Accounting Reference / Voucher No',
    'Remarks',
    'Internal Record ID',
  ];

  const setRows = data.settlements.map((s) => {
    const adv = s.advanceRecordId ? advMap.get(s.advanceRecordId) : null;
    return [
      s.settlementId,
      adv?.advanceId || s.advanceId || '—',
      s.settlementInitiatedDate,
      s.settlementCompletionDate || 'Pending',
      s.accountingStatus,
      s.settlementAmount,
      s.actualAmountSettled || s.settlementAmount,
      s.accountingReference || '—',
      s.remarks || '',
      s.id,
    ];
  });

  // Build Tab 6: Vendor Payments
  const vpHeader = [
    'Payment ID',
    'Payment Date',
    'Vendor / Service',
    'Category',
    'Payment Source',
    'Amount Paid (₹)',
    'Linked Voucher No',
    'Booking / PNR Ref',
    'Recovery Status',
    'Vendor Invoice No',
    'Remarks',
  ];

  const vpRows = data.vendorPayments.map((p) => {
    const v = vMap.get(p.voucherRecordId);
    return [
      p.id,
      p.paymentDate,
      p.vendorName,
      p.expenseCategory,
      p.paymentSource,
      p.amountPaid,
      v?.voucherNo || '—',
      p.bookingRef || '—',
      p.recoveryStatus,
      p.vendorInvoiceNo || '—',
      p.remarks || '',
    ];
  });

  // Build Tab 7: Accounts Recoveries
  const recHeader = [
    'Recovery Request ID',
    'Submission Date',
    'Requested Amount (₹)',
    'Approved Amount (₹)',
    'Amount Received (₹)',
    'Outstanding Amount (₹)',
    'Status',
    'Receipt Txn Ref',
    'Covered Vendor Payments Count',
    'Remarks',
  ];

  const recRows = data.recoveries.map((r) => {
    const coveredCount = (data.recoveryPaymentMappings || []).filter(
      (m) => m.recoveryRecordId === r.id
    ).length;
    return [
      r.recoveryRef,
      r.requestDate,
      r.requestedAmount,
      r.approvedAmount || r.requestedAmount,
      r.amountReceived || 0,
      r.outstandingAmount || 0,
      r.status,
      r.receiptTransactionRef || '—',
      coveredCount,
      r.remarks || '',
    ];
  });

  // Build Tab 8: Projects & Team
  const ptValues = [
    ['Active Corporate Projects', '', '', ''],
    ['Project Code', 'Project Name', 'Description / Client', 'Status'],
    ...data.projects.map((p) => [p.code || p.id, p.name, p.description || '—', p.status]),
    ['', '', '', ''],
    ['Registered Team Members', '', '', ''],
    ['Emp ID', 'Full Name', 'WhatsApp Phone', 'Base Location', 'Department', 'Default Project', 'Status'],
    ...data.teamMembers.map((m) => [
      m.empId,
      m.fullName,
      m.whatsappNumber,
      m.baseLocation,
      m.department,
      m.defaultProject || '—',
      m.status,
    ]),
  ];

  const nowIso = new Date().toISOString();
  const nowStr = new Date().toLocaleString('en-IN');
  const syncStoreRows = buildSyncStoreRows(data, nowIso, nowStr);

  // Batch clear and update each sheet (including hidden lossless _TravEase_SyncStore)
  const updateRanges = [
    { range: "'TravEase Summary'!A1:Z100", values: summaryValues },
    { range: "'Travel Vouchers'!A1:Z500", values: [voucherHeader, ...voucherRows] },
    { range: "'Advances'!A1:Z300", values: [advanceHeader, ...advanceRows] },
    { range: "'Disbursements'!A1:Z500", values: [disbHeader, ...disbRows] },
    { range: "'Settlements'!A1:Z300", values: [setHeader, ...setRows] },
    { range: "'Vendor Payments'!A1:Z300", values: [vpHeader, ...vpRows] },
    { range: "'Accounts Recoveries'!A1:Z100", values: [recHeader, ...recRows] },
    { range: "'Projects & Team'!A1:Z200", values: ptValues },
    { range: `'${SYNC_STORE_TAB}'!A1:F200`, values: syncStoreRows },
  ];

  // 1. Clear existing ranges to prevent ghost rows
  const clearRequests = updateRanges.map((u) => {
    const tabName = u.range.split('!')[0];
    return sheetsFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(tabName)}!A1:Z500:clear`,
      accessToken,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  });
  const clearResults = await Promise.allSettled(clearRequests);
  const authFailure = clearResults.find(
    (r) => r.status === 'rejected' && (r.reason?.status === 401 || r.reason?.status === 403)
  );
  if (authFailure && authFailure.status === 'rejected') {
    throw authFailure.reason;
  }

  // 2. Write new batch data
  await sheetsFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    accessToken,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: updateRanges,
      }),
    }
  );

  await tagSpreadsheetAsTravEase(spreadsheetId, accessToken);

  return {
    updatedCount: updateRanges.reduce((sum, r) => sum + r.values.length, 0),
    timestamp: nowStr,
  };
}
