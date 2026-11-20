import type {
  AdvanceRecord,
  AdvanceVoucherMapping,
  EmployeeDisbursement,
  SettlementRecord,
  SettlementVoucherMapping,
  VendorPaymentRecord,
  RecoveryPaymentMapping,
  TravelVoucher,
  TeamMember,
  VoucherFinancialSummary,
  NotificationType,
  ExpenseCategory,
  VoucherOverallStatus,
} from '../types';

/**
 * Format number into Indian Rupee string (₹ XX,XX,XXX)
 */
export function formatINR(amount: number | undefined | null, includeDecimals = false): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '₹0';
  }
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  let formatted = '';
  if (includeDecimals) {
    formatted = absAmount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } else {
    formatted = Math.round(absAmount).toLocaleString('en-IN');
  }

  return `${isNegative ? '-' : ''}₹${formatted}`;
}

/**
 * Format YYYY-MM-DD date into Indian format DD-MM-YYYY
 */
export function formatIndianDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '—';
  // Handle if already DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
    return dateStr;
  }
  try {
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`;
    }
  } catch {
    // fallback
  }
  return dateStr;
}

/**
 * Normalize phone number for standard WhatsApp Click-to-Chat
 * Requirements:
 * - Normalized international phone number without spaces, brackets, or plus sign
 * - Must handle Indian 10-digit numbers, numbers with 0 prefix, or with 91 prefix
 */
export function normalizeIndianPhone(rawPhone: string): string {
  if (!rawPhone) return '';
  // Strip spaces, dashes, parentheses, plus
  const digits = rawPhone.replace(/\D/g, '');

  if (digits.length === 10) {
    return `91${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return `91${digits.slice(1)}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }
  return digits;
}

/**
 * Build WhatsApp Click-to-Chat URL
 */
export function buildWhatsAppClickToChatUrl(normalizedPhone: string, message: string): string {
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Build WhatsApp notification message text
 * MANDATORY RULE: Never include Advance ID in WhatsApp notification text!
 */
export function buildWhatsAppNotificationText(
  type: NotificationType | string,
  params: {
    employeeName: string;
    voucherNo: string;
    projectName?: string;
    startDate?: string;
    endDate?: string;
    advanceAmount?: number;
    disbursedAmount?: number;
    disbursementDate?: string;
    approvedAmount?: number;
    settlementAmount?: number;
    travelTo?: string;
  }
): string {
  const {
    employeeName,
    voucherNo,
    projectName = 'Project Travel',
    startDate,
    endDate,
    advanceAmount = 0,
    disbursedAmount = 0,
    disbursementDate,
    settlementAmount = 0,
  } = params;

  const formattedStart = formatIndianDate(startDate);
  const formattedEnd = formatIndianDate(endDate);
  const formattedDisbDate = formatIndianDate(disbursementDate);
  const formattedAdv = Math.round(advanceAmount).toLocaleString('en-IN');
  const formattedDisb = Math.round(disbursedAmount).toLocaleString('en-IN');
  const formattedSettlement = Math.round(settlementAmount).toLocaleString('en-IN');

  switch (type) {
    case 'Voucher Approved':
    case 'Approved':
      return `Hello ${employeeName}, your travel voucher ${voucherNo} for ${projectName}, covering travel from ${formattedStart} to ${formattedEnd}, has been approved. You will be updated regarding the advance process.`;

    case 'Advance Raised':
      return `Hello ${employeeName}, an advance request of ₹${formattedAdv} has been raised for your travel against Voucher No. ${voucherNo}. The funds are subject to Accounts approval and release.`;

    case 'Advance Approved':
      return `Hello ${employeeName}, the advance of ₹${formattedAdv} requested against Voucher No. ${voucherNo} for ${projectName} has been approved by Accounts. Disbursement will be processed shortly.`;

    case 'Amount Disbursed':
      return `Hello ${employeeName}, ₹${formattedDisb} has been disbursed for your travel against Voucher No. ${voucherNo} on ${formattedDisbDate}. Please retain all bills and vouchers for settlement.`;

    case 'Pending for Settlement':
      if (disbursedAmount > 0) {
        return `Hello ${employeeName}, ₹${formattedDisb} has been disbursed for your travel against Voucher No. ${voucherNo} on ${formattedDisbDate}. Please retain all bills and vouchers for settlement.`;
      }
      return `Hello ${employeeName}, your travel voucher ${voucherNo} for ${projectName} is pending for settlement. Please submit your original travel bills and expense receipts for final accounting.`;

    case 'Settlement Initiated':
      return `Hello ${employeeName}, settlement accounting has been initiated for Voucher No. ${voucherNo} (${projectName})${settlementAmount > 0 ? ` for ₹${formattedSettlement}` : ''}. It is currently under accounting audit and verification.`;

    case 'Closed':
      return `Hello ${employeeName}, your travel voucher ${voucherNo} for ${projectName} has been successfully settled and closed in the corporate accounting software. Thank you!`;

    default:
      return `Hello ${employeeName}, regarding your travel voucher ${voucherNo} for ${projectName}. Current status: ${type}.`;
  }
}

/**
 * Calculate available advance funds for disbursement:
 * Actual Advance Funds Received (or approved amount once advance is approved) − Total Employee Disbursements Against That Advance.
 */
export function calcAdvanceFundsAvailable(
  advance: AdvanceRecord,
  allDisbursements: EmployeeDisbursement[]
): number {
  const actuallyReceived =
    advance.amountActuallyReceived && advance.amountActuallyReceived > 0
      ? advance.amountActuallyReceived
      : advance.status === 'Approved' || advance.status === 'Disbursed'
      ? (advance.approvedAmount || advance.requestedAmount || 0)
      : 0;
  const totalDisbursedAgainstAdvance = allDisbursements
    .filter((d) => d.advanceRecordId === advance.id)
    .reduce((sum, d) => sum + (d.amountDisbursed || 0), 0);

  return Math.max(0, actuallyReceived - totalDisbursedAgainstAdvance);
}

/**
 * Total advance amount allocated across vouchers in mappings
 */
export function calcAdvanceTotalAllocated(
  advanceId: string,
  mappings: AdvanceVoucherMapping[]
): number {
  return mappings
    .filter((m) => m.advanceRecordId === advanceId)
    .reduce((sum, m) => sum + (m.allocatedAdvanceAmount || 0), 0);
}

/**
 * Total personal recovery outstanding for a vendor payment
 */
export function calcPaymentOutstandingRecovery(
  payment: VendorPaymentRecord,
  recoveryMappings: RecoveryPaymentMapping[]
): number {
  if (payment.paymentSource !== 'Personal Funds') {
    return 0;
  }
  const totalRecovered = recoveryMappings
    .filter((m) => m.vendorPaymentRecordId === payment.id)
    .reduce((sum, m) => sum + (m.amountRecovered || 0), 0);

  return Math.max(0, payment.amountPaid - totalRecovered);
}

/**
 * Compute detailed voucher financial summary avoiding double-counting
 */
export function calcVoucherFinancialSummary(
  voucher: TravelVoucher,
  advanceMappings: AdvanceVoucherMapping[],
  disbursements: EmployeeDisbursement[],
  settlementMappings: SettlementVoucherMapping[],
  vendorPayments: VendorPaymentRecord[],
  recoveryMappings: RecoveryPaymentMapping[]
): VoucherFinancialSummary {
  const claimedAmount = voucher.claimedAmount || 0;
  const approvedAmount = voucher.approvedAmount || 0;

  // Payments directly linked to this voucher
  const voucherPayments = vendorPayments.filter((p) => p.voucherRecordId === voucher.id);

  const companyPaidDirectExpenses = voucherPayments
    .filter((p) => p.paymentSource === 'Company Funds')
    .reduce((sum, p) => sum + p.amountPaid, 0);

  const adminPersonalPaidExpenses = voucherPayments
    .filter((p) => p.paymentSource === 'Personal Funds')
    .reduce((sum, p) => sum + p.amountPaid, 0);

  const employeePersonalPaidExpenses = voucherPayments
    .filter((p) => p.paymentSource === 'Employee Personal Funds')
    .reduce((sum, p) => sum + p.amountPaid, 0);

  // Advance mapped to this voucher
  const totalAdvanceAllocated = advanceMappings
    .filter((m) => m.voucherRecordId === voucher.id)
    .reduce((sum, m) => sum + (m.allocatedAdvanceAmount || 0), 0);

  // Employee disbursements for this voucher
  const totalEmployeeDisbursed = disbursements
    .filter((d) => d.voucherRecordId === voucher.id)
    .reduce((sum, d) => sum + (d.amountDisbursed || 0), 0);

  // Settlement mapped to this voucher
  const totalSettlementAllocated = settlementMappings
    .filter((m) => m.voucherRecordId === voucher.id)
    .reduce((sum, m) => sum + (m.allocatedSettlementAmount || 0), 0);

  // Recovery on administrator personal expenses for this voucher
  const adminRecoveredAmount = recoveryMappings
    .filter((m) => m.voucherRecordId === voucher.id)
    .reduce((sum, m) => sum + (m.amountRecovered || 0), 0);

  const adminOutstandingRecovery = Math.max(0, adminPersonalPaidExpenses - adminRecoveredAmount);

  // Employee portion:
  // Non-employee direct expenses (company paid + admin paid)
  const nonEmployeeDirectExpenses = companyPaidDirectExpenses + adminPersonalPaidExpenses;
  // What is the approved claim that the employee was responsible for financing?
  const employeeApprovedExpense = Math.max(0, approvedAmount - nonEmployeeDirectExpenses);

  let employeeRefundDue = 0;
  let employeeReimbursementDue = 0;

  if (totalEmployeeDisbursed > employeeApprovedExpense) {
    employeeRefundDue = totalEmployeeDisbursed - employeeApprovedExpense;
  } else {
    employeeReimbursementDue = employeeApprovedExpense - totalEmployeeDisbursed;
  }

  const netSettlementPending = Math.max(0, approvedAmount - totalSettlementAllocated);

  return {
    voucherId: voucher.id,
    claimedAmount,
    approvedAmount,
    companyPaidDirectExpenses,
    adminPersonalPaidExpenses,
    employeePersonalPaidExpenses,
    totalAdvanceAllocated,
    totalEmployeeDisbursed,
    totalSettlementAllocated,
    adminRecoveredAmount,
    adminOutstandingRecovery,
    employeeRefundDue,
    employeeReimbursementDue,
    netSettlementPending,
  };
}

export const ALL_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Flight',
  'Hotel',
  'Train',
  'Taxi / Cab',
  'Meals',
  'Fuel',
  'Bus',
  'Client Entertainment',
  'Conference / Entry Fee',
  'Miscellaneous',
];

export const EXPENSE_CATEGORY_CONFIG: Record<
  ExpenseCategory,
  { label: string; color: string; bgClass: string; textClass: string; borderClass: string }
> = {
  Flight: { label: 'Flight', color: '#6366f1', bgClass: 'bg-indigo-50', textClass: 'text-indigo-700', borderClass: 'border-indigo-200' },
  Hotel: { label: 'Hotel', color: '#0ea5e9', bgClass: 'bg-sky-50', textClass: 'text-sky-700', borderClass: 'border-sky-200' },
  Train: { label: 'Train', color: '#10b981', bgClass: 'bg-emerald-50', textClass: 'text-emerald-700', borderClass: 'border-emerald-200' },
  'Taxi / Cab': { label: 'Taxi / Cab', color: '#f59e0b', bgClass: 'bg-amber-50', textClass: 'text-amber-700', borderClass: 'border-amber-200' },
  Meals: { label: 'Meals', color: '#f43f5e', bgClass: 'bg-rose-50', textClass: 'text-rose-700', borderClass: 'border-rose-200' },
  Fuel: { label: 'Fuel', color: '#8b5cf6', bgClass: 'bg-purple-50', textClass: 'text-purple-700', borderClass: 'border-purple-200' },
  Bus: { label: 'Bus', color: '#14b8a6', bgClass: 'bg-teal-50', textClass: 'text-teal-700', borderClass: 'border-teal-200' },
  'Client Entertainment': { label: 'Client Entertainment', color: '#ec4899', bgClass: 'bg-pink-50', textClass: 'text-pink-700', borderClass: 'border-pink-200' },
  'Conference / Entry Fee': { label: 'Conference / Fee', color: '#3b82f6', bgClass: 'bg-blue-50', textClass: 'text-blue-700', borderClass: 'border-blue-200' },
  Miscellaneous: { label: 'Miscellaneous', color: '#64748b', bgClass: 'bg-slate-100', textClass: 'text-slate-700', borderClass: 'border-slate-200' },
};

export function inferCategoriesFromDescription(desc: string): ExpenseCategory[] {
  if (!desc) return ['Miscellaneous'];
  const lower = desc.toLowerCase();
  const matched: ExpenseCategory[] = [];

  if (lower.includes('flight') || lower.includes('air') || lower.includes('airline')) matched.push('Flight');
  if (lower.includes('hotel') || lower.includes('lodge') || lower.includes('stay') || lower.includes('room') || lower.includes('resort')) matched.push('Hotel');
  if (lower.includes('train') || lower.includes('rail') || lower.includes('irctc')) matched.push('Train');
  if (lower.includes('cab') || lower.includes('taxi') || lower.includes('uber') || lower.includes('ola') || lower.includes('auto') || lower.includes('conveyance')) matched.push('Taxi / Cab');
  if (lower.includes('bus')) matched.push('Bus');
  if (lower.includes('fuel') || lower.includes('petrol') || lower.includes('diesel') || lower.includes('rental') || lower.includes('vehicle')) matched.push('Fuel');
  if (lower.includes('food') || lower.includes('meal') || lower.includes('dinner') || lower.includes('lunch') || lower.includes('breakfast')) matched.push('Meals');
  if (lower.includes('entertainment') || lower.includes('client')) matched.push('Client Entertainment');
  if (lower.includes('conference') || lower.includes('fee') || lower.includes('seminar') || lower.includes('pass')) matched.push('Conference / Entry Fee');

  if (matched.length === 0) {
    if (lower.includes('local') || lower.includes('travel')) {
      return ['Taxi / Cab'];
    }
    return ['Miscellaneous'];
  }
  return matched;
}

export interface MonthlyCategoryData {
  monthKey: string;
  monthLabel: string;
  total: number;
  [category: string]: any;
}

export interface CategorySummaryItem {
  category: ExpenseCategory;
  label: string;
  amount: number;
  percentage: number;
  color: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
}

export interface ExpenseDistributionResult {
  monthlyData: MonthlyCategoryData[];
  categoryTotals: CategorySummaryItem[];
  grandTotal: number;
  availableMonths: { key: string; label: string }[];
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatMonthKeyToLabel(monthKey: string): string {
  try {
    const parts = monthKey.split('-');
    if (parts.length >= 2) {
      const year = parts[0];
      const monthIdx = parseInt(parts[1], 10) - 1;
      if (monthIdx >= 0 && monthIdx < 12) {
        return `${MONTH_NAMES[monthIdx]} ${year}`;
      }
    }
  } catch {
    // fallback
  }
  return monthKey;
}

export function calcMonthlyCategoryExpenses(
  vouchers: TravelVoucher[],
  vendorPayments: VendorPaymentRecord[],
  filterMonth = 'all'
): ExpenseDistributionResult {
  const monthAccumulators: Record<string, { total: number; categories: Record<ExpenseCategory, number> }> = {};

  const ensureMonth = (mKey: string) => {
    if (!monthAccumulators[mKey]) {
      const catInit: Record<ExpenseCategory, number> = {} as any;
      ALL_EXPENSE_CATEGORIES.forEach((c) => {
        catInit[c] = 0;
      });
      monthAccumulators[mKey] = {
        total: 0,
        categories: catInit,
      };
    }
  };

  // 1. Process vendor payments (explicit category)
  vendorPayments.forEach((p) => {
    const rawDate = p.paymentDate || p.travelDate || '2026-10';
    const mKey = rawDate.slice(0, 7);
    ensureMonth(mKey);

    const cat: ExpenseCategory = ALL_EXPENSE_CATEGORIES.includes(p.expenseCategory)
      ? p.expenseCategory
      : 'Miscellaneous';
    const amt = p.amountPaid || 0;

    monthAccumulators[mKey].categories[cat] += amt;
    monthAccumulators[mKey].total += amt;
  });

  // 2. Process vouchers for any unbooked / employee submitted portion
  vouchers.forEach((v) => {
    const rawDate = v.travelStartDate || v.createdAt || '2026-10';
    const mKey = rawDate.slice(0, 7);
    ensureMonth(mKey);

    const linkedPayments = vendorPayments.filter((p) => p.voucherRecordId === v.id);
    const linkedSum = linkedPayments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
    const baseVoucherAmount = (v.approvedAmount > 0 ? v.approvedAmount : v.claimedAmount) || 0;
    const remainingAmount = Math.max(0, baseVoucherAmount - linkedSum);

    if (remainingAmount > 0) {
      const inferredCats = inferCategoriesFromDescription(v.expenseDescription);
      const splitAmount = Math.round(remainingAmount / inferredCats.length);

      inferredCats.forEach((cat, index) => {
        // adjust last item for rounding
        const portion = index === inferredCats.length - 1
          ? remainingAmount - splitAmount * (inferredCats.length - 1)
          : splitAmount;
        monthAccumulators[mKey].categories[cat] += portion;
        monthAccumulators[mKey].total += portion;
      });
    }
  });

  // Sort months chronologically
  const sortedMonthKeys = Object.keys(monthAccumulators).sort();

  const availableMonths = sortedMonthKeys.map((key) => ({
    key,
    label: formatMonthKeyToLabel(key),
  }));

  const monthlyData: MonthlyCategoryData[] = sortedMonthKeys.map((mKey) => {
    const item: MonthlyCategoryData = {
      monthKey: mKey,
      monthLabel: formatMonthKeyToLabel(mKey),
      total: Math.round(monthAccumulators[mKey].total),
    };

    ALL_EXPENSE_CATEGORIES.forEach((cat) => {
      item[cat] = Math.round(monthAccumulators[mKey].categories[cat] || 0);
    });

    return item;
  });

  // Compute category totals either for the filtered month or across all months
  const categorySums: Record<ExpenseCategory, number> = {} as any;
  ALL_EXPENSE_CATEGORIES.forEach((c) => {
    categorySums[c] = 0;
  });

  let grandTotal = 0;

  sortedMonthKeys.forEach((mKey) => {
    if (filterMonth === 'all' || filterMonth === mKey) {
      ALL_EXPENSE_CATEGORIES.forEach((c) => {
        categorySums[c] += monthAccumulators[mKey].categories[c] || 0;
      });
      grandTotal += monthAccumulators[mKey].total;
    }
  });

  const categoryTotals: CategorySummaryItem[] = ALL_EXPENSE_CATEGORIES.map((c) => {
    const amt = Math.round(categorySums[c] || 0);
    const cfg = EXPENSE_CATEGORY_CONFIG[c];
    return {
      category: c,
      label: cfg.label,
      amount: amt,
      percentage: grandTotal > 0 ? Math.round((amt / grandTotal) * 1000) / 10 : 0,
      color: cfg.color,
      bgClass: cfg.bgClass,
      textClass: cfg.textClass,
      borderClass: cfg.borderClass,
    };
  })
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  return {
    monthlyData,
    categoryTotals,
    grandTotal: Math.round(grandTotal),
    availableMonths,
  };
}

export interface CompleteLifecycleReportRow {
  key: string;
  voucherNo: string;
  teamName: string;
  projectName: string;
  travelDates: string;
  advanceId: string;
  advanceAmount: number;
  advanceRaisedDate: string;
  settlementId: string;
  settlementAmount: number;
  settlementDates: string;
  overallStatus: string;
}

export interface CompleteLifecycleReportParams {
  vouchers: TravelVoucher[];
  teamMembers: TeamMember[];
  advances: AdvanceRecord[];
  advanceVoucherMappings: AdvanceVoucherMapping[];
  settlements: SettlementRecord[];
  settlementVoucherMappings: SettlementVoucherMapping[];
  employeeFilter?: string;
  projectFilter?: string;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Generate Complete Travel, Advance & Settlement Lifecycle Register rows
 * Having the exact requested fields:
 * - Voucher No
 * - Team Name
 * - Project Name
 * - Travel Dates
 * - Advance ID
 * - Advance Amount
 * - Advance Raised Date
 * - Settlement ID
 * - Settlement Amount
 * - Settlement Dates
 */
export function buildCompleteLifecycleReportRows({
  vouchers,
  teamMembers,
  advances,
  advanceVoucherMappings,
  settlements,
  settlementVoucherMappings,
  employeeFilter = 'all',
  projectFilter = 'all',
  dateFrom = '',
  dateTo = '',
}: CompleteLifecycleReportParams): CompleteLifecycleReportRow[] {
  const filterPass = (date?: string, empId?: string, proj?: string) => {
    if (employeeFilter !== 'all' && empId && empId !== employeeFilter) return false;
    if (projectFilter !== 'all' && proj && proj !== projectFilter) return false;
    if (dateFrom && date && date < dateFrom) return false;
    if (dateTo && date && date > dateTo) return false;
    return true;
  };

  const list: CompleteLifecycleReportRow[] = [];

  // 1. Process all travel vouchers
  vouchers.forEach((v) => {
    if (!filterPass(v.travelStartDate, v.teamMemberId, v.projectName)) return;
    const member = teamMembers.find((m) => m.id === v.teamMemberId);
    const travelDates = `${formatIndianDate(v.travelStartDate)} to ${formatIndianDate(v.travelEndDate)}`;

    const advMaps = advanceVoucherMappings.filter((m) => m.voucherRecordId === v.id);
    const setMaps = settlementVoucherMappings.filter((m) => m.voucherRecordId === v.id);

    if (advMaps.length > 0) {
      advMaps.forEach((am, idx) => {
        const adv = advances.find((a) => a.id === am.advanceRecordId);
        const linkedSetMap =
          setMaps.find((sm) => {
            const s = settlements.find((item) => item.id === sm.settlementRecordId);
            return s && (s.advanceRecordId === adv?.id || s.advanceId === adv?.advanceId);
          }) ||
          setMaps[idx] ||
          setMaps[0];

        const settlement = linkedSetMap
          ? settlements.find((s) => s.id === linkedSetMap.settlementRecordId)
          : settlements.find((s) => s.advanceRecordId === adv?.id || s.advanceId === adv?.advanceId);

        const setDates = settlement
          ? settlement.settlementCompletionDate
            ? `${formatIndianDate(settlement.settlementInitiatedDate)} to ${formatIndianDate(settlement.settlementCompletionDate)}`
            : formatIndianDate(settlement.settlementInitiatedDate)
          : 'Pending';

        list.push({
          key: `v-${v.id}-am-${am.id}`,
          voucherNo: v.voucherNo,
          teamName: member?.fullName || '—',
          projectName: v.projectName,
          travelDates,
          advanceId: adv?.advanceId || '—',
          advanceAmount: am.allocatedAdvanceAmount || adv?.amountActuallyReceived || adv?.requestedAmount || 0,
          advanceRaisedDate: formatIndianDate(adv?.advanceRaisedDate),
          settlementId: settlement?.settlementId || 'Pending',
          settlementAmount: linkedSetMap?.allocatedSettlementAmount || settlement?.settlementAmount || 0,
          settlementDates: setDates,
          overallStatus: v.overallStatus,
        });
      });
    } else {
      const linkedSetMap = setMaps[0];
      const settlement = linkedSetMap
        ? settlements.find((s) => s.id === linkedSetMap.settlementRecordId)
        : null;

      const setDates = settlement
        ? settlement.settlementCompletionDate
          ? `${formatIndianDate(settlement.settlementInitiatedDate)} to ${formatIndianDate(settlement.settlementCompletionDate)}`
          : formatIndianDate(settlement.settlementInitiatedDate)
        : 'Pending';

      list.push({
        key: `v-${v.id}-noadv`,
        voucherNo: v.voucherNo,
        teamName: member?.fullName || '—',
        projectName: v.projectName,
        travelDates,
        advanceId: '— (No Advance)',
        advanceAmount: 0,
        advanceRaisedDate: '—',
        settlementId: settlement?.settlementId || 'Pending',
        settlementAmount: linkedSetMap?.allocatedSettlementAmount || settlement?.settlementAmount || 0,
        settlementDates: setDates,
        overallStatus: v.overallStatus,
      });
    }
  });

  // 2. Include advances raised without vouchers (unmapped advances)
  advances.forEach((adv) => {
    const mappings = advanceVoucherMappings.filter((m) => m.advanceRecordId === adv.id);
    if (mappings.length === 0) {
      if (!filterPass(adv.advanceRaisedDate, adv.teamMemberId, adv.projectName)) return;
      const member = adv.teamMemberId ? teamMembers.find((m) => m.id === adv.teamMemberId) : null;
      const settlement = settlements.find((s) => s.advanceRecordId === adv.id || s.advanceId === adv.advanceId);
      const setDates = settlement
        ? settlement.settlementCompletionDate
          ? `${formatIndianDate(settlement.settlementInitiatedDate)} to ${formatIndianDate(settlement.settlementCompletionDate)}`
          : formatIndianDate(settlement.settlementInitiatedDate)
        : 'Pending';

      list.push({
        key: `adv-${adv.id}-unmapped`,
        voucherNo: '— (Advance Unmapped)',
        teamName: member?.fullName || '—',
        projectName: adv.projectName || '—',
        travelDates: '—',
        advanceId: adv.advanceId,
        advanceAmount: adv.amountActuallyReceived || adv.requestedAmount || 0,
        advanceRaisedDate: formatIndianDate(adv.advanceRaisedDate),
        settlementId: settlement?.settlementId || 'Pending',
        settlementAmount: settlement?.settlementAmount || 0,
        settlementDates: setDates,
        overallStatus: adv.status,
      });
    }
  });

  // 3. Include any remaining settlements mapped to advance
  settlements.forEach((s) => {
    const alreadyIncluded = list.some((row) => row.settlementId === s.settlementId);
    if (!alreadyIncluded) {
      const adv = advances.find((a) => a.id === s.advanceRecordId || a.advanceId === s.advanceId);
      const setMaps = settlementVoucherMappings.filter((m) => m.settlementRecordId === s.id);
      const firstVoucher = setMaps.length > 0 ? vouchers.find((v) => v.id === setMaps[0].voucherRecordId) : null;
      const member = adv?.teamMemberId
        ? teamMembers.find((m) => m.id === adv.teamMemberId)
        : firstVoucher?.teamMemberId
        ? teamMembers.find((m) => m.id === firstVoucher.teamMemberId)
        : null;

      const setDates = s.settlementCompletionDate
        ? `${formatIndianDate(s.settlementInitiatedDate)} to ${formatIndianDate(s.settlementCompletionDate)}`
        : formatIndianDate(s.settlementInitiatedDate);

      list.push({
        key: `set-${s.id}-standalone`,
        voucherNo: firstVoucher?.voucherNo || '—',
        teamName: member?.fullName || '—',
        projectName: firstVoucher?.projectName || adv?.projectName || '—',
        travelDates: firstVoucher
          ? `${formatIndianDate(firstVoucher.travelStartDate)} to ${formatIndianDate(firstVoucher.travelEndDate)}`
          : '—',
        advanceId: adv?.advanceId || s.advanceId || '—',
        advanceAmount: adv?.amountActuallyReceived || adv?.requestedAmount || 0,
        advanceRaisedDate: formatIndianDate(adv?.advanceRaisedDate),
        settlementId: s.settlementId,
        settlementAmount: s.settlementAmount,
        settlementDates: setDates,
        overallStatus: s.accountingStatus,
      });
    }
  });

  return list;
}

/**
 * Automatically derives the up-to-date lifecycle status of a travel voucher:
 * 1. Default when voucher recorded -> 'Approved'
 * 2. When advance raised against voucher (status Raised) -> 'Advance Raised'
 * 3. When advance status edited from Raised to Approved -> 'Advance Approved'
 * 4. When amount disbursed (advance status Disbursed) -> 'Pending for Settlement'
 * 5. When settlement initiated -> 'Settlement Initiated'
 * 6. Once settlement done -> 'Closed'
 */
export function deriveVoucherStatus(
  voucher: TravelVoucher,
  advances: AdvanceRecord[],
  advanceVoucherMappings: AdvanceVoucherMapping[],
  disbursements: EmployeeDisbursement[],
  settlements: SettlementRecord[],
  settlementVoucherMappings: SettlementVoucherMapping[]
): VoucherOverallStatus {
  if (voucher.overallStatus === 'Cancelled') return 'Cancelled';

  // 1. Settlement completed / closed
  const setMaps = settlementVoucherMappings.filter((m) => m.voucherRecordId === voucher.id);
  const isSettlementClosed = setMaps.some((m) => {
    const s = settlements.find((item) => item.id === m.settlementRecordId);
    return s?.accountingStatus === 'Closed' || s?.accountingStatus === 'Completed';
  });
  if (
    isSettlementClosed ||
    voucher.overallStatus === 'Closed' ||
    voucher.overallStatus === 'Completed' ||
    voucher.settlementStatus === 'Completed'
  ) {
    return 'Closed';
  }

  // 2. Settlement initiated
  const isSettlementInitiated = setMaps.some((m) => {
    const s = settlements.find((item) => item.id === m.settlementRecordId);
    return s && s.accountingStatus !== 'Cancelled';
  });
  if (
    isSettlementInitiated ||
    voucher.overallStatus === 'Settlement Initiated' ||
    voucher.settlementStatus === 'Settlement Initiated'
  ) {
    return 'Settlement Initiated';
  }

  // 3. Advance mapped against voucher
  const advMaps = advanceVoucherMappings.filter((m) => m.voucherRecordId === voucher.id);
  if (advMaps.length > 0) {
    // Check if advance is closed
    const hasClosedAdv = advMaps.some((m) => {
      const adv = advances.find((a) => a.id === m.advanceRecordId);
      return adv?.status === 'Closed';
    });
    if (hasClosedAdv) {
      return 'Closed';
    }

    // Check if this specific voucher has received a disbursement
    const hasSpecificDisbursement = disbursements.some(
      (d) => d.voucherRecordId === voucher.id
    );

    // If advance has only 1 voucher mapped, and advance itself is marked Disbursed
    const isSingleMappedAndAdvanceDisbursed = advMaps.some((m) => {
      const allMapped = advanceVoucherMappings.filter((x) => x.advanceRecordId === m.advanceRecordId);
      const adv = advances.find((a) => a.id === m.advanceRecordId);
      return (
        allMapped.length <= 1 &&
        (adv?.status === 'Disbursed' ||
          adv?.status === 'Fully Disbursed' ||
          (adv?.amountDisbursed !== undefined && adv.amountDisbursed > 0))
      );
    });

    if (hasSpecificDisbursement || isSingleMappedAndAdvanceDisbursed) {
      return 'Pending for Settlement';
    }

    // Check if advance is approved (or partially disbursed with remaining funds)
    const isApprovedAdv = advMaps.some((m) => {
      const adv = advances.find((a) => a.id === m.advanceRecordId);
      return (
        adv?.status === 'Approved' ||
        adv?.status === 'Disbursed' ||
        adv?.status === 'Partially Disbursed' ||
        (adv?.approvedAmount !== undefined && adv.approvedAmount > 0)
      );
    });
    if (isApprovedAdv) {
      return 'Advance Approved';
    }

    // Otherwise, advance is in 'Raised' status
    return 'Advance Raised';
  }

  // Check if direct disbursement exists for this voucher
  const hasDirectDisbursement = disbursements.some((d) => d.voucherRecordId === voucher.id);
  if (hasDirectDisbursement) {
    return 'Pending for Settlement';
  }

  // 4. Default for newly recorded voucher: 'Approved'
  return 'Approved';
}

export interface StatusWiseSummaryRow {
  status: VoucherOverallStatus;
  voucherCount: number;
  totalClaimed: number;
  totalApproved: number;
  totalAdvanceAllocated: number;
  totalDisbursed: number;
  totalSettled: number;
  balanceDue: number;
}

export function buildStatusWiseSummary(
  vouchers: TravelVoucher[],
  advanceVoucherMappings: AdvanceVoucherMapping[],
  disbursements: EmployeeDisbursement[],
  settlementVoucherMappings: SettlementVoucherMapping[]
): StatusWiseSummaryRow[] {
  const trackedStatuses: VoucherOverallStatus[] = [
    'Approved',
    'Advance Raised',
    'Advance Approved',
    'Pending for Settlement',
    'Settlement Initiated',
    'Closed',
  ];

  return trackedStatuses.map((st) => {
    const vList = vouchers.filter((v) => v.overallStatus === st);
    const vIds = new Set(vList.map((v) => v.id));

    const totalClaimed = vList.reduce((s, v) => s + (v.claimedAmount || 0), 0);
    const totalApproved = vList.reduce((s, v) => s + (v.approvedAmount || 0), 0);

    const totalAdv = advanceVoucherMappings
      .filter((m) => vIds.has(m.voucherRecordId))
      .reduce((s, m) => s + (m.allocatedAdvanceAmount || 0), 0);

    const totalDisb = disbursements
      .filter((d) => vIds.has(d.voucherRecordId))
      .reduce((s, d) => s + (d.amountDisbursed || 0), 0);

    const totalSet = settlementVoucherMappings
      .filter((m) => vIds.has(m.voucherRecordId))
      .reduce((s, m) => s + (m.allocatedSettlementAmount || 0), 0);

    return {
      status: st,
      voucherCount: vList.length,
      totalClaimed,
      totalApproved,
      totalAdvanceAllocated: totalAdv,
      totalDisbursed: totalDisb,
      totalSettled: totalSet,
      balanceDue: totalApproved - totalDisb,
    };
  });
}

export interface MonthWiseSummaryRow {
  monthKey: string;
  monthLabel: string;
  voucherCount: number;
  totalClaimed: number;
  totalApproved: number;
  totalAdvancesRaised: number;
  totalDisbursed: number;
  totalSettled: number;
  completedCount: number;
  inProgressCount: number;
}

export function buildMonthWiseSummary(
  vouchers: TravelVoucher[],
  advances: AdvanceRecord[],
  disbursements: EmployeeDisbursement[],
  settlements: SettlementRecord[]
): MonthWiseSummaryRow[] {
  const monthMap = new Map<string, {
    vouchers: TravelVoucher[];
    advances: AdvanceRecord[];
    disbursements: EmployeeDisbursement[];
    settlements: SettlementRecord[];
  }>();

  const getMonthKey = (dateStr?: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length >= 2) {
      return `${parts[0]}-${parts[1]}`;
    }
    return '';
  };

  // Collect from vouchers
  vouchers.forEach((v) => {
    const key = getMonthKey(v.travelStartDate || v.createdAt);
    if (!key) return;
    if (!monthMap.has(key)) {
      monthMap.set(key, { vouchers: [], advances: [], disbursements: [], settlements: [] });
    }
    monthMap.get(key)!.vouchers.push(v);
  });

  // Collect from advances
  advances.forEach((a) => {
    const key = getMonthKey(a.advanceRaisedDate || a.createdAt);
    if (!key) return;
    if (!monthMap.has(key)) {
      monthMap.set(key, { vouchers: [], advances: [], disbursements: [], settlements: [] });
    }
    monthMap.get(key)!.advances.push(a);
  });

  // Collect from disbursements
  disbursements.forEach((d) => {
    const key = getMonthKey(d.disbursementDate || d.createdAt);
    if (!key) return;
    if (!monthMap.has(key)) {
      monthMap.set(key, { vouchers: [], advances: [], disbursements: [], settlements: [] });
    }
    monthMap.get(key)!.disbursements.push(d);
  });

  // Collect from settlements
  settlements.forEach((s) => {
    const key = getMonthKey(s.settlementInitiatedDate || s.createdAt);
    if (!key) return;
    if (!monthMap.has(key)) {
      monthMap.set(key, { vouchers: [], advances: [], disbursements: [], settlements: [] });
    }
    monthMap.get(key)!.settlements.push(s);
  });

  const sortedKeys = Array.from(monthMap.keys()).sort().reverse();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return sortedKeys.map((key) => {
    const data = monthMap.get(key)!;
    const [year, mStr] = key.split('-');
    const mIdx = parseInt(mStr, 10) - 1;
    const monthLabel = `${monthNames[mIdx] || mStr} ${year}`;

    const totalClaimed = data.vouchers.reduce((s, v) => s + (v.claimedAmount || 0), 0);
    const totalApproved = data.vouchers.reduce((s, v) => s + (v.approvedAmount || 0), 0);
    const totalAdvancesRaised = data.advances.reduce((s, a) => s + (a.requestedAmount || 0), 0);
    const totalDisbursed = data.disbursements.reduce((s, d) => s + (d.amountDisbursed || 0), 0);
    const totalSettled = data.settlements.reduce((s, set) => s + (set.actualAmountSettled || set.settlementAmount || 0), 0);

    const completedCount = data.vouchers.filter((v) => v.overallStatus === 'Completed').length;
    const inProgressCount = data.vouchers.length - completedCount;

    return {
      monthKey: key,
      monthLabel,
      voucherCount: data.vouchers.length,
      totalClaimed,
      totalApproved,
      totalAdvancesRaised,
      totalDisbursed,
      totalSettled,
      completedCount,
      inProgressCount,
    };
  });
}

export interface TeamWiseSummaryRow {
  memberId: string;
  fullName: string;
  empId: string;
  baseLocation: string;
  department: string;
  voucherCount: number;
  totalClaimed: number;
  totalApproved: number;
  totalAdvanceAllocated: number;
  totalDisbursed: number;
  totalSettled: number;
  netDue: number;
  completedCount: number;
  pendingCount: number;
}

export function buildTeamWiseSummary(
  teamMembers: TeamMember[],
  vouchers: TravelVoucher[],
  advanceVoucherMappings: AdvanceVoucherMapping[],
  disbursements: EmployeeDisbursement[],
  settlementVoucherMappings: SettlementVoucherMapping[]
): TeamWiseSummaryRow[] {
  return teamMembers.map((m) => {
    const empVouchers = vouchers.filter((v) => v.teamMemberId === m.id);
    const vIds = new Set(empVouchers.map((v) => v.id));

    const totalClaimed = empVouchers.reduce((s, v) => s + (v.claimedAmount || 0), 0);
    const totalApproved = empVouchers.reduce((s, v) => s + (v.approvedAmount || 0), 0);

    const totalAdvanceAllocated = advanceVoucherMappings
      .filter((advM) => vIds.has(advM.voucherRecordId))
      .reduce((s, advM) => s + (advM.allocatedAdvanceAmount || 0), 0);

    const totalDisbursed = disbursements
      .filter((d) => d.employeeId === m.id || vIds.has(d.voucherRecordId))
      .reduce((s, d) => s + (d.amountDisbursed || 0), 0);

    const totalSettled = settlementVoucherMappings
      .filter((setM) => vIds.has(setM.voucherRecordId))
      .reduce((s, setM) => s + (setM.allocatedSettlementAmount || 0), 0);

    const completedCount = empVouchers.filter((v) => v.overallStatus === 'Completed').length;

    return {
      memberId: m.id,
      fullName: m.fullName,
      empId: m.empId,
      baseLocation: m.baseLocation,
      department: m.department,
      voucherCount: empVouchers.length,
      totalClaimed,
      totalApproved,
      totalAdvanceAllocated,
      totalDisbursed,
      totalSettled,
      netDue: totalApproved - totalDisbursed,
      completedCount,
      pendingCount: empVouchers.length - completedCount,
    };
  });
}

/**
 * Standard Indian Railway & Airport station codes mapping.
 * Used for auto-generating Voucher Number prefixes with station code (e.g. UDZ for Udaipur, ADI for Ahmadabad).
 */
export const STATION_CODES: Record<string, string> = {
  // User explicitly highlighted
  udaipur: 'UDZ',
  ahmadabad: 'ADI',
  ahmedabad: 'ADI',

  // Major Metros & Cities
  mumbai: 'BOM',
  bombay: 'BOM',
  delhi: 'DEL',
  'new delhi': 'DEL',
  lucknow: 'LKO',
  pune: 'PUNE',
  bengaluru: 'BLR',
  bangalore: 'BLR',
  kolkata: 'CCU',
  calcutta: 'CCU',
  chennai: 'MAS',
  madras: 'MAS',
  hyderabad: 'HYD',
  secunderabad: 'SC',
  jaipur: 'JP',
  surat: 'ST',
  vadodara: 'BRC',
  baroda: 'BRC',
  bhopal: 'BPL',
  indore: 'INDB',
  chandigarh: 'CDG',
  varanasi: 'BSB',
  kanpur: 'CNB',
  patna: 'PNBE',
  agra: 'AGC',
  amritsar: 'ASR',
  goa: 'GOI',
  kochi: 'COK',
  cochin: 'COK',
  guwahati: 'GHY',
  nagpur: 'NGP',
  kota: 'KOTA',
  jodhpur: 'JU',
  ajmer: 'AII',
  bikaner: 'BKN',
  rajkot: 'RJT',
  gwalior: 'GWL',
  jabalpur: 'JBP',
  raipur: 'RPR',
  ranchi: 'RNC',
  bhubaneswar: 'BBS',
  dehradun: 'DDN',
  gorakhpur: 'GKP',
  prayagraj: 'PRYJ',
  allahabad: 'PRYJ',
  noida: 'NOI',
  gurgaon: 'GGN',
  gurugram: 'GGN',
  faridabad: 'FDB',
  ghaziabad: 'GZB',
  jalandhar: 'JUC',
  ludhiana: 'LDH',
  jammu: 'JAT',
  srinagar: 'SXR',
  shimla: 'SML',
  trivandrum: 'TVC',
  thiruvananthapuram: 'TVC',
  calicut: 'CLT',
  kozhikode: 'CLT',
  coimbatore: 'CBE',
  madurai: 'MDU',
  mysore: 'MYS',
  mysuru: 'MYS',
  mangalore: 'MAQ',
  mangaluru: 'MAQ',
  hubli: 'UBL',
  hubballi: 'UBL',
  belgaum: 'BGM',
  belagavi: 'BGM',
  vijayawada: 'BZA',
  visakhapatnam: 'VSKP',
  vizag: 'VSKP',
  tirupati: 'TPTY',
  guntur: 'GNT',
  aurangabad: 'AWB',
  nashik: 'NK',
  solapur: 'SUR',
  kolhapur: 'KOP',
  thane: 'TNA',
  kalyan: 'KYN',
  panipat: 'PNP',
  ambala: 'UMB',
  haridwar: 'HW',
  roorkee: 'RK',
  mathura: 'MTJ',
  aligarh: 'ALJN',
  meerut: 'MTC',
  bareilly: 'BE',
  moradabad: 'MB',
  jhansi: 'VGLJ',
  ayodhya: 'AY',
  muzaffarpur: 'MFP',
  gaya: 'GAYA',
  dhanbad: 'DHN',
  jamshedpur: 'TATA',
  tatanagar: 'TATA',
  cuttack: 'CTC',
  rourkela: 'ROU',
  puri: 'PURI',
  siliguri: 'SGUJ',
  asansol: 'ASN',
  durgapur: 'DGR',
  kharagpur: 'KGP',
  agartala: 'AGTL',
  shillong: 'SHL',
  dibrugarh: 'DBRG',
};

/**
 * Returns standard Indian station code for a location (e.g. UDZ for Udaipur, ADI for Ahmadabad).
 */
export function getStationCode(location?: string): string {
  if (!location) return 'HQ';
  const clean = location.trim();
  if (!clean) return 'HQ';

  // If input is already 2-4 uppercase characters without spaces (e.g. UDZ, ADI, DEL)
  if (/^[A-Z]{2,4}$/.test(clean)) {
    return clean;
  }

  const lower = clean.toLowerCase();

  // Direct match
  if (STATION_CODES[lower]) {
    return STATION_CODES[lower];
  }

  // Word token or substring match
  // e.g. "Udaipur, Rajasthan" -> tokens include "udaipur"
  const tokens = lower.split(/[\s,./\-_]+/);
  for (const token of tokens) {
    if (STATION_CODES[token]) {
      return STATION_CODES[token];
    }
  }

  for (const [city, code] of Object.entries(STATION_CODES)) {
    if (lower.includes(city) || city.includes(lower)) {
      return code;
    }
  }

  // Fallback: extract alphabetic characters up to 3 uppercase letters
  const alphabetic = clean.toUpperCase().replace(/[^A-Z]/g, '');
  if (alphabetic.length >= 3) {
    return alphabetic.slice(0, 3);
  }
  return alphabetic || 'HQ';
}

/**
 * Generates voucher number prefix formatted as: [STATION_CODE]/[INITIALS]/
 * Example:
 * - Location "Udaipur", Name "Dheerendra Kumar" -> "UDZ/DK/"
 * - Location "Ahmadabad", Name "Priya Patel" -> "ADI/PP/"
 * - Location "Mumbai", Name "Rahul Sharma" -> "BOM/RS/"
 */
export function generateVoucherPrefix(location?: string, name?: string): string {
  const stationCode = getStationCode(location);
  const initials = (name || 'TM')
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() || '')
    .filter(Boolean)
    .join('');
  return `${stationCode}/${initials || 'TM'}/`;
}

