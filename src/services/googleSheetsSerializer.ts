import type {
  TeamMember,
  ProjectRecord,
  TravelVoucher,
  AdvanceRecord,
  AdvanceVoucherMapping,
  EmployeeDisbursement,
  SettlementRecord,
  SettlementVoucherMapping,
  VendorPaymentRecord,
  AccountsRecoveryRequest,
  RecoveryPaymentMapping,
  NotificationLog,
  ActivityLog,
  TravelScenario,
  VoucherOverallStatus,
  VoucherSettlementStatus,
  VoucherVerificationStatus,
  AdvanceStatus,
  DisbursementPaymentMethod,
  SettlementAccountingStatus,
  ExpenseCategory,
  PaymentSource,
  VendorPaymentRecoveryStatus,
  RecoveryStatus,
} from '../types';

export const SYNC_STORE_TAB = '_TravEase_SyncStore';
export const HUMAN_READABLE_TABS = [
  'TravEase Summary',
  'Travel Vouchers',
  'Advances',
  'Disbursements',
  'Settlements',
  'Vendor Payments',
  'Accounts Recoveries',
  'Projects & Team',
] as const;

export const ALL_TRAVEASE_TABS = [...HUMAN_READABLE_TABS, SYNC_STORE_TAB] as const;

export const MAX_CELL_CHUNK_SIZE = 40000;

export interface AppSyncData {
  vouchers: TravelVoucher[];
  advances: AdvanceRecord[];
  advanceVoucherMappings: AdvanceVoucherMapping[];
  disbursements: EmployeeDisbursement[];
  settlements: SettlementRecord[];
  settlementVoucherMappings?: SettlementVoucherMapping[];
  vendorPayments: VendorPaymentRecord[];
  recoveries: AccountsRecoveryRequest[];
  recoveryPaymentMappings?: RecoveryPaymentMapping[];
  projects: ProjectRecord[];
  teamMembers: TeamMember[];
  notifications?: NotificationLog[];
  activities?: ActivityLog[];
}

export interface FullAppDataPayload {
  projects: ProjectRecord[];
  teamMembers: TeamMember[];
  vouchers: TravelVoucher[];
  advances: AdvanceRecord[];
  advanceVoucherMappings: AdvanceVoucherMapping[];
  disbursements: EmployeeDisbursement[];
  settlements: SettlementRecord[];
  settlementVoucherMappings: SettlementVoucherMapping[];
  vendorPayments: VendorPaymentRecord[];
  recoveries: AccountsRecoveryRequest[];
  recoveryPaymentMappings: RecoveryPaymentMapping[];
  notifications: NotificationLog[];
  activities: ActivityLog[];
}

export interface CloudSyncPayload {
  schemaVersion: number;
  syncedAt: string;
  syncedAtDisplay: string;
  data: FullAppDataPayload;
}

export function normalizeAppData(data: Partial<AppSyncData>): FullAppDataPayload {
  return {
    projects: Array.isArray(data.projects) ? data.projects : [],
    teamMembers: Array.isArray(data.teamMembers) ? data.teamMembers : [],
    vouchers: Array.isArray(data.vouchers) ? data.vouchers : [],
    advances: Array.isArray(data.advances) ? data.advances : [],
    advanceVoucherMappings: Array.isArray(data.advanceVoucherMappings) ? data.advanceVoucherMappings : [],
    disbursements: Array.isArray(data.disbursements) ? data.disbursements : [],
    settlements: Array.isArray(data.settlements) ? data.settlements : [],
    settlementVoucherMappings: Array.isArray(data.settlementVoucherMappings) ? data.settlementVoucherMappings : [],
    vendorPayments: Array.isArray(data.vendorPayments) ? data.vendorPayments : [],
    recoveries: Array.isArray(data.recoveries) ? data.recoveries : [],
    recoveryPaymentMappings: Array.isArray(data.recoveryPaymentMappings) ? data.recoveryPaymentMappings : [],
    notifications: Array.isArray(data.notifications) ? data.notifications : [],
    activities: Array.isArray(data.activities) ? data.activities : [],
  };
}

/**
 * Serializes full application state into chunked Google Sheets rows so even large
 * datasets never hit the 50,000-character-per-cell limit.
 */
export function buildSyncStoreRows(
  data: AppSyncData,
  syncedAtIso: string = new Date().toISOString(),
  syncedAtDisplay: string = new Date().toLocaleString('en-IN'),
  chunkSize: number = MAX_CELL_CHUNK_SIZE
): string[][] {
  const payload: CloudSyncPayload = {
    schemaVersion: 2,
    syncedAt: syncedAtIso,
    syncedAtDisplay,
    data: normalizeAppData(data),
  };

  const jsonStr = JSON.stringify(payload);
  const safeChunkSize = Math.max(100, Math.min(chunkSize, 45000));
  const chunks: string[] = [];
  for (let i = 0; i < jsonStr.length; i += safeChunkSize) {
    chunks.push(jsonStr.slice(i, i + safeChunkSize));
  }
  if (chunks.length === 0) {
    chunks.push('{}');
  }

  const header = ['Section', 'ChunkIndex', 'TotalChunks', 'UpdatedAt', 'SchemaVersion', 'Payload'];
  const rows = chunks.map((chunk, idx) => [
    'APP_STATE',
    String(idx),
    String(chunks.length),
    syncedAtIso,
    String(payload.schemaVersion),
    chunk,
  ]);

  return [header, ...rows];
}

/**
 * Reassembles chunked `_TravEase_SyncStore` rows back into a typed CloudSyncPayload.
 */
export function parseSyncStoreRows(rows: unknown[][]): CloudSyncPayload | null {
  if (!Array.isArray(rows) || rows.length < 2) return null;

  const stateRows = rows
    .slice(1)
    .filter((r) => Array.isArray(r) && String(r[0] || '').trim() === 'APP_STATE');

  if (stateRows.length === 0) return null;

  const sorted = [...stateRows]
    .map((r) => ({
      index: Number(r[1]),
      total: Number(r[2]),
      chunk: String(r[5] ?? ''),
    }))
    .filter((item) => !Number.isNaN(item.index) && !Number.isNaN(item.total) && item.chunk.length > 0)
    .sort((a, b) => a.index - b.index);

  if (sorted.length === 0) return null;

  const expectedTotal = sorted[0].total;
  if (expectedTotal > 0 && sorted.length !== expectedTotal) {
    return null;
  }

  try {
    const combinedJson = sorted.map((s) => s.chunk).join('');
    const parsed = JSON.parse(combinedJson);
    if (!parsed || typeof parsed !== 'object' || !parsed.data) return null;

    return {
      schemaVersion: Number(parsed.schemaVersion) || 2,
      syncedAt: String(parsed.syncedAt || new Date().toISOString()),
      syncedAtDisplay: String(parsed.syncedAtDisplay || parsed.syncedAt || ''),
      data: normalizeAppData(parsed.data),
    };
  } catch {
    return null;
  }
}

function parseNumericCell(val: unknown): number {
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  const cleaned = String(val ?? '')
    .replace(/[₹,\s]/g, '')
    .trim();
  if (!cleaned || cleaned === '—' || cleaned === '-') return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function cleanCell(val: unknown): string {
  const s = String(val ?? '').trim();
  return s === '—' ? '' : s;
}

function findHeaderRowIndex(rows: unknown[][], firstColCandidates: string[]): number {
  return rows.findIndex((row) => {
    if (!Array.isArray(row) || row.length === 0) return false;
    const first = String(row[0] ?? '').trim().toLowerCase();
    return firstColCandidates.some((c) => first === c.toLowerCase());
  });
}

/**
 * Fallback parser that reconstructs TravEase application data from the 8 human-readable tabs
 * when `_TravEase_SyncStore` is not yet present (e.g., sheets synced before v2 or edited manually).
 */
export function parseHumanReadableTabsFallback(
  tabValues: Record<string, unknown[][]>
): CloudSyncPayload | null {
  const ptRows = tabValues['Projects & Team'] || [];
  const voucherRowsRaw = tabValues['Travel Vouchers'] || [];
  const advanceRowsRaw = tabValues['Advances'] || [];
  const disbRowsRaw = tabValues['Disbursements'] || [];
  const setRowsRaw = tabValues['Settlements'] || [];
  const vpRowsRaw = tabValues['Vendor Payments'] || [];
  const recRowsRaw = tabValues['Accounts Recoveries'] || [];

  const hasAnyRecognizedTab =
    ptRows.length > 0 ||
    voucherRowsRaw.length > 0 ||
    advanceRowsRaw.length > 0 ||
    disbRowsRaw.length > 0 ||
    setRowsRaw.length > 0 ||
    vpRowsRaw.length > 0 ||
    recRowsRaw.length > 0;

  if (!hasAnyRecognizedTab) return null;

  const todayIso = new Date().toISOString().split('T')[0];

  // 1. Parse Projects & Team
  const projects: ProjectRecord[] = [];
  const projHeaderIdx = findHeaderRowIndex(ptRows, ['Project Code']);
  if (projHeaderIdx >= 0) {
    for (let i = projHeaderIdx + 1; i < ptRows.length; i++) {
      const r = ptRows[i] || [];
      const first = String(r[0] ?? '').trim();
      const name = cleanCell(r[1]);
      if (!first && !name) break;
      if (first === 'Registered Team Members' || first === 'Emp ID') break;
      if (!name) continue;
      projects.push({
        id: `PRJ-IMP-${String(projects.length + 1).padStart(3, '0')}`,
        code: cleanCell(r[0]) || undefined,
        name,
        description: cleanCell(r[2]) || undefined,
        status: String(r[3] ?? '').trim() === 'Inactive' ? 'Inactive' : 'Active',
        createdAt: todayIso,
      });
    }
  }

  const teamMembers: TeamMember[] = [];
  const teamHeaderIdx = findHeaderRowIndex(ptRows, ['Emp ID']);
  if (teamHeaderIdx >= 0) {
    for (let i = teamHeaderIdx + 1; i < ptRows.length; i++) {
      const r = ptRows[i] || [];
      const empId = cleanCell(r[0]);
      const fullName = cleanCell(r[1]);
      if (!empId && !fullName) break;
      if (!fullName) continue;
      teamMembers.push({
        id: `TM-IMP-${String(teamMembers.length + 1).padStart(3, '0')}`,
        empId: empId || `EMP-${String(teamMembers.length + 1).padStart(3, '0')}`,
        fullName,
        whatsappNumber: cleanCell(r[2]),
        baseLocation: cleanCell(r[3]) || 'HQ',
        department: cleanCell(r[4]) || 'Operations',
        defaultProject: cleanCell(r[5]) || undefined,
        status: String(r[6] ?? '').trim() === 'Inactive' ? 'Inactive' : 'Active',
        createdAt: todayIso,
      });
    }
  }

  const memberByEmpId = new Map(teamMembers.map((m) => [m.empId.toLowerCase(), m]));
  const memberByName = new Map(teamMembers.map((m) => [m.fullName.toLowerCase(), m]));
  const findOrCreateMemberId = (fullName: string, empId: string, baseLocation = 'HQ', phone = ''): string => {
    const cleanEmp = cleanCell(empId);
    const cleanName = cleanCell(fullName);
    const match =
      (cleanEmp && memberByEmpId.get(cleanEmp.toLowerCase())) ||
      (cleanName && memberByName.get(cleanName.toLowerCase()));
    if (match) return match.id;
    if (!cleanName || cleanName === 'Unassigned') return '';
    const created: TeamMember = {
      id: `TM-IMP-${String(teamMembers.length + 1).padStart(3, '0')}`,
      empId: cleanEmp || `EMP-${String(teamMembers.length + 1).padStart(3, '0')}`,
      fullName: cleanName,
      whatsappNumber: cleanCell(phone),
      baseLocation: cleanCell(baseLocation) || 'HQ',
      department: 'Operations',
      status: 'Active',
      createdAt: todayIso,
    };
    teamMembers.push(created);
    memberByEmpId.set(created.empId.toLowerCase(), created);
    memberByName.set(created.fullName.toLowerCase(), created);
    return created.id;
  };

  // 2. Parse Travel Vouchers
  const vouchers: TravelVoucher[] = [];
  const vHeaderIdx = findHeaderRowIndex(voucherRowsRaw, ['Voucher No']);
  if (vHeaderIdx >= 0) {
    for (let i = vHeaderIdx + 1; i < voucherRowsRaw.length; i++) {
      const r = voucherRowsRaw[i] || [];
      const voucherNo = cleanCell(r[0]);
      if (!voucherNo) continue;
      const empName = cleanCell(r[1]);
      const empId = cleanCell(r[2]);
      const phone = cleanCell(r[3]);
      const baseLocation = cleanCell(r[4]);
      const teamMemberId = findOrCreateMemberId(empName, empId, baseLocation, phone);
      const id = cleanCell(r[17]) || `VCH-IMP-${String(vouchers.length + 1).padStart(3, '0')}`;
      const claimed = parseNumericCell(r[10]);
      const approved = parseNumericCell(r[11]) || claimed;
      const overallStatus = (cleanCell(r[12]) || 'Approved') as VoucherOverallStatus;
      const settlementStatus = (cleanCell(r[13]) || 'Not Initiated') as VoucherSettlementStatus;
      const verifiedBy = cleanCell(r[14]) || undefined;
      const approvalDate = cleanCell(r[15]) || undefined;
      const scenario = (cleanCell(r[9]) || 'Travel Completed — Voucher Submitted Afterwards') as TravelScenario;

      vouchers.push({
        id,
        voucherNo,
        teamMemberId,
        baseLocation,
        travelTo: cleanCell(r[5]),
        projectName: cleanCell(r[6]),
        travelStartDate: cleanCell(r[7]) || todayIso,
        travelEndDate: cleanCell(r[8]) || todayIso,
        travelScenario: scenario,
        voucherApprovedDate: approvalDate,
        verifiedBy,
        claimedAmount: claimed,
        approvedAmount: approved,
        expenseDescription: cleanCell(r[16]),
        attachments: [],
        verificationStatus: 'Approved' as VoucherVerificationStatus,
        settlementStatus,
        recoveryStatus: 'Not Applicable',
        overallStatus,
        createdAt: approvalDate || todayIso,
        updatedAt: todayIso,
      });
    }
  }

  const voucherByNo = new Map(vouchers.map((v) => [v.voucherNo.toLowerCase(), v]));
  const voucherById = new Map(vouchers.map((v) => [v.id, v]));

  // 3. Parse Advances & Mappings
  const advances: AdvanceRecord[] = [];
  const advanceVoucherMappings: AdvanceVoucherMapping[] = [];
  const advHeaderIdx = findHeaderRowIndex(advanceRowsRaw, ['Advance ID']);
  if (advHeaderIdx >= 0) {
    for (let i = advHeaderIdx + 1; i < advanceRowsRaw.length; i++) {
      const r = advanceRowsRaw[i] || [];
      const advanceId = cleanCell(r[0]);
      if (!advanceId) continue;
      const internalId = cleanCell(r[13]) || `ADV-IMP-${String(advances.length + 1).padStart(3, '0')}`;
      const requestedAmount = parseNumericCell(r[3]);
      const approvedAmount = parseNumericCell(r[4]) || requestedAmount;
      const amountActuallyReceived = parseNumericCell(r[5]);
      const amountDisbursed = parseNumericCell(r[6]);
      const raisedDate = cleanCell(r[1]) || todayIso;

      advances.push({
        id: internalId,
        advanceId,
        advanceRaisedDate: raisedDate,
        requestedAmount,
        approvedAmount,
        amountActuallyReceived,
        amountDisbursed,
        bankCashReceiptRef: cleanCell(r[8]) || undefined,
        fundsReceivedDate: cleanCell(r[9]) || undefined,
        status: (cleanCell(r[2]) || 'Raised') as AdvanceStatus,
        remarks: cleanCell(r[12]) || undefined,
        createdAt: raisedDate,
        updatedAt: todayIso,
      });

      const mappedStr = cleanCell(r[10]);
      if (mappedStr && mappedStr !== 'Unmapped Pool') {
        const parts = mappedStr.split(',').map((s) => s.trim()).filter(Boolean);
        parts.forEach((part, idx) => {
          const match = part.match(/^(.+?)\s*\(₹?([\d,]+(?:\.\d+)?)\)$/);
          const vNo = match ? match[1].trim() : part;
          const allocAmt = match ? parseNumericCell(match[2]) : approvedAmount;
          const v = voucherByNo.get(vNo.toLowerCase());
          if (v) {
            advanceVoucherMappings.push({
              id: `AVM-IMP-${advances.length}-${idx}`,
              advanceRecordId: internalId,
              voucherRecordId: v.id,
              allocatedAdvanceAmount: allocAmt,
              allocationDate: raisedDate,
              remarks: `Imported mapping for ${v.voucherNo}`,
            });
          }
        });
      }
    }
  }

  const advByPublicId = new Map(advances.map((a) => [a.advanceId.toLowerCase(), a]));

  // 4. Parse Disbursements
  const disbursements: EmployeeDisbursement[] = [];
  const disbHeaderIdx = findHeaderRowIndex(disbRowsRaw, ['Disbursement ID']);
  if (disbHeaderIdx >= 0) {
    for (let i = disbHeaderIdx + 1; i < disbRowsRaw.length; i++) {
      const r = disbRowsRaw[i] || [];
      const disbId = cleanCell(r[0]);
      if (!disbId) continue;
      const empId = cleanCell(r[3]);
      const empName = cleanCell(r[2]);
      const employeeId = findOrCreateMemberId(empName, empId);
      const vNo = cleanCell(r[4]);
      const v = voucherByNo.get(vNo.toLowerCase());
      const advRef = cleanCell(r[5]);
      const adv = advByPublicId.get(advRef.toLowerCase());

      disbursements.push({
        id: cleanCell(r[10]) || disbId,
        employeeId,
        voucherRecordId: v?.id || vNo,
        advanceRecordId: adv?.id || advRef,
        disbursementDate: cleanCell(r[1]) || todayIso,
        amountDisbursed: parseNumericCell(r[6]),
        paymentMethod: (cleanCell(r[7]) || 'Bank Transfer') as DisbursementPaymentMethod,
        transactionRef: cleanCell(r[8]),
        remarks: cleanCell(r[9]) || undefined,
        createdAt: cleanCell(r[1]) || todayIso,
      });
    }
  }

  // 5. Parse Settlements
  const settlements: SettlementRecord[] = [];
  const setHeaderIdx = findHeaderRowIndex(setRowsRaw, ['Settlement ID']);
  if (setHeaderIdx >= 0) {
    for (let i = setHeaderIdx + 1; i < setRowsRaw.length; i++) {
      const r = setRowsRaw[i] || [];
      const settlementId = cleanCell(r[0]);
      if (!settlementId) continue;
      const advRef = cleanCell(r[1]);
      const adv = advByPublicId.get(advRef.toLowerCase());
      const compDate = cleanCell(r[3]);
      const initDate = cleanCell(r[2]) || todayIso;

      settlements.push({
        id: cleanCell(r[9]) || `SET-IMP-${String(settlements.length + 1).padStart(3, '0')}`,
        settlementId,
        advanceRecordId: adv?.id,
        advanceId: adv?.advanceId || advRef || undefined,
        settlementInitiatedDate: initDate,
        settlementCompletionDate: compDate && compDate !== 'Pending' ? compDate : undefined,
        accountingStatus: (cleanCell(r[4]) || 'Pending Processing') as SettlementAccountingStatus,
        settlementAmount: parseNumericCell(r[5]),
        actualAmountSettled: parseNumericCell(r[6]) || parseNumericCell(r[5]),
        accountingReference: cleanCell(r[7]) || undefined,
        remarks: cleanCell(r[8]) || undefined,
        createdAt: initDate,
        updatedAt: todayIso,
      });
    }
  }

  // 6. Parse Vendor Payments
  const vendorPayments: VendorPaymentRecord[] = [];
  const vpHeaderIdx = findHeaderRowIndex(vpRowsRaw, ['Payment ID']);
  if (vpHeaderIdx >= 0) {
    for (let i = vpHeaderIdx + 1; i < vpRowsRaw.length; i++) {
      const r = vpRowsRaw[i] || [];
      const payId = cleanCell(r[0]);
      if (!payId) continue;
      const vNo = cleanCell(r[6]);
      const v = voucherByNo.get(vNo.toLowerCase()) || voucherById.get(vNo);
      const payDate = cleanCell(r[1]) || todayIso;

      vendorPayments.push({
        id: payId,
        voucherRecordId: v?.id || '',
        employeeId: v?.teamMemberId || '',
        projectName: v?.projectName || '',
        vendorName: cleanCell(r[2]) || 'Vendor',
        expenseCategory: (cleanCell(r[3]) || 'Miscellaneous') as ExpenseCategory,
        paymentSource: (cleanCell(r[4]) || 'Company Funds') as PaymentSource,
        amountPaid: parseNumericCell(r[5]),
        bookingRef: cleanCell(r[7]) || undefined,
        recoveryStatus: (cleanCell(r[8]) || 'Not Applicable') as VendorPaymentRecoveryStatus,
        vendorInvoiceNo: cleanCell(r[9]) || undefined,
        paymentDate: payDate,
        travelDate: v?.travelStartDate || payDate,
        paymentMethod: 'Bank Transfer',
        remarks: cleanCell(r[10]) || undefined,
        createdAt: payDate,
      });
    }
  }

  // 7. Parse Accounts Recoveries
  const recoveries: AccountsRecoveryRequest[] = [];
  const recHeaderIdx = findHeaderRowIndex(recRowsRaw, ['Recovery Request ID']);
  if (recHeaderIdx >= 0) {
    for (let i = recHeaderIdx + 1; i < recRowsRaw.length; i++) {
      const r = recRowsRaw[i] || [];
      const recoveryRef = cleanCell(r[0]);
      if (!recoveryRef) continue;
      const reqDate = cleanCell(r[1]) || todayIso;

      recoveries.push({
        id: `REC-IMP-${String(recoveries.length + 1).padStart(3, '0')}`,
        recoveryRef,
        requestDate: reqDate,
        requestedAmount: parseNumericCell(r[2]),
        approvedAmount: parseNumericCell(r[3]) || parseNumericCell(r[2]),
        amountReceived: parseNumericCell(r[4]),
        outstandingAmount: parseNumericCell(r[5]),
        status: (cleanCell(r[6]) || 'Submitted to Accounts') as RecoveryStatus,
        receiptTransactionRef: cleanCell(r[7]) || undefined,
        remarks: cleanCell(r[9]) || undefined,
        createdAt: reqDate,
        updatedAt: todayIso,
      });
    }
  }

  // Extract last synchronized timestamp from TravEase Summary if present
  const summaryRows = tabValues['TravEase Summary'] || [];
  const syncRow = summaryRows.find(
    (r) => Array.isArray(r) && String(r[0] ?? '').trim() === 'Last Synchronized'
  );
  const summarySyncTime = syncRow ? cleanCell(syncRow[1]) : '';

  const totalParsed =
    projects.length +
    teamMembers.length +
    vouchers.length +
    advances.length +
    disbursements.length +
    settlements.length +
    vendorPayments.length +
    recoveries.length;

  if (totalParsed === 0) return null;

  return {
    schemaVersion: 1,
    syncedAt: new Date().toISOString(),
    syncedAtDisplay: summarySyncTime || new Date().toLocaleString('en-IN'),
    data: {
      projects,
      teamMembers,
      vouchers,
      advances,
      advanceVoucherMappings,
      disbursements,
      settlements,
      settlementVoucherMappings: [],
      vendorPayments,
      recoveries,
      recoveryPaymentMappings: [],
      notifications: [],
      activities: [
        {
          id: `ACT-IMP-${Date.now().toString().slice(-6)}`,
          activityType: 'Record Updated',
          activityDate: todayIso,
          createdAt: new Date().toISOString(),
          recordedBy: 'Google Sheets Sync',
          remarks: `Loaded ${vouchers.length} vouchers, ${advances.length} advances, ${teamMembers.length} team members from Google Sheet tabs`,
        },
      ],
    },
  };
}
