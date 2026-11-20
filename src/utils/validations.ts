import type {
  TravelVoucher,
  AdvanceRecord,
  AdvanceVoucherMapping,
  EmployeeDisbursement,
  SettlementRecord,
  SettlementVoucherMapping,
} from '../types';
import { calcAdvanceFundsAvailable } from './calculations';

/**
 * Returns a Set of voucher IDs that have already been disbursed.
 */
export function getDisbursedVoucherIds(
  disbursements: EmployeeDisbursement[],
  excludeDisbursementId?: string
): Set<string> {
  const set = new Set<string>();
  for (const d of disbursements) {
    if (excludeDisbursementId && d.id === excludeDisbursementId) continue;
    if (d.voucherRecordId) {
      set.add(d.voucherRecordId);
    }
  }
  return set;
}

/**
 * Checks whether a voucher has already been disbursed.
 */
export function isVoucherDisbursed(
  voucherId: string,
  disbursements: EmployeeDisbursement[],
  excludeDisbursementId?: string
): boolean {
  if (!voucherId) return false;
  return disbursements.some(
    (d) => d.voucherRecordId === voucherId && (!excludeDisbursementId || d.id !== excludeDisbursementId)
  );
}

/**
 * Returns all vouchers eligible to be mapped to an advance request.
 * Validation rules:
 * 1. Default status is 'Approved' (vouchers newly raised in app).
 * 2. Cannot be already mapped to another advance.
 * 3. Cannot be already disbursed.
 * 4. Cannot be already Pending for Settlement, Settlement Initiated, Completed, or Closed.
 */
export function getVouchersEligibleForAdvance(
  vouchers: TravelVoucher[],
  advanceVoucherMappings: AdvanceVoucherMapping[],
  disbursements: EmployeeDisbursement[],
  currentAdvanceId?: string
): TravelVoucher[] {
  const otherAdvanceMappedVouchers = new Set(
    advanceVoucherMappings
      .filter((m) => !currentAdvanceId || m.advanceRecordId !== currentAdvanceId)
      .map((m) => m.voucherRecordId)
  );
  const disbursedVoucherIds = getDisbursedVoucherIds(disbursements);

  return vouchers.filter((v) => {
    // Must be in Approved status (or already mapped to this current advance being edited)
    const isCurrentAdvanceMapped = currentAdvanceId && advanceVoucherMappings.some(
      (m) => m.advanceRecordId === currentAdvanceId && m.voucherRecordId === v.id
    );
    if (!isCurrentAdvanceMapped && v.overallStatus !== 'Approved') {
      return false;
    }
    // Cannot be mapped to another advance
    if (otherAdvanceMappedVouchers.has(v.id)) {
      return false;
    }
    // Cannot be disbursed
    if (disbursedVoucherIds.has(v.id)) {
      return false;
    }
    // Cannot be completed or closed
    if (v.overallStatus === 'Closed' || v.overallStatus === 'Completed' || v.overallStatus === 'Cancelled') {
      return false;
    }
    return true;
  });
}

/**
 * Returns all vouchers eligible for employee disbursement.
 * Validation rules:
 * 1. Cannot be already disbursed. A voucher cannot be disbursed more than once.
 * 2. Cannot be Closed or Completed.
 * 3. Cannot be already Pending for Settlement or Settlement Initiated.
 * 4. If an advance is specified and has mapped vouchers, prefer/restrict to mapped vouchers that are undisbursed.
 */
export function getVouchersEligibleForDisbursement(
  vouchers: TravelVoucher[],
  disbursements: EmployeeDisbursement[],
  currentDisbursementId?: string,
  selectedAdvanceId?: string,
  advanceVoucherMappings?: AdvanceVoucherMapping[]
): TravelVoucher[] {
  const disbursedVoucherIds = getDisbursedVoucherIds(disbursements, currentDisbursementId);

  // If selected advance has mapped vouchers, identify them
  const advanceMappedVoucherIds = new Set<string>();
  if (selectedAdvanceId && advanceVoucherMappings) {
    advanceVoucherMappings
      .filter((m) => m.advanceRecordId === selectedAdvanceId)
      .forEach((m) => advanceMappedVoucherIds.add(m.voucherRecordId));
  }

  const eligible = vouchers.filter((v) => {
    // If currently editing this disbursement and it belongs to this voucher, keep it
    if (currentDisbursementId) {
      const currentDisb = disbursements.find((d) => d.id === currentDisbursementId);
      if (currentDisb && currentDisb.voucherRecordId === v.id) {
        return true;
      }
    }

    // RULE 1: If amount already disbursed, it should NOT be available for disbursement again!
    if (disbursedVoucherIds.has(v.id)) {
      return false;
    }

    // RULE 2: Cannot be closed, completed, or cancelled
    if (v.overallStatus === 'Closed' || v.overallStatus === 'Completed' || v.overallStatus === 'Cancelled') {
      return false;
    }

    // RULE 3: Cannot be already in settlement audit
    if (v.overallStatus === 'Settlement Initiated') {
      return false;
    }

    return true;
  });

  // If advance has mapped vouchers, strictly only allow its undisbursed mapped vouchers
  if (advanceMappedVoucherIds.size > 0) {
    return eligible.filter((v) => advanceMappedVoucherIds.has(v.id));
  }

  return eligible;
}

/**
 * Validates a disbursement submission to prevent repeat disbursement or over-disbursement.
 */
export function validateDisbursementSubmission(params: {
  voucherRecordId: string;
  advanceRecordId: string;
  amountDisbursed: number;
  disbursements: EmployeeDisbursement[];
  advances: AdvanceRecord[];
  vouchers?: TravelVoucher[];
  currentDisbursementId?: string;
}): { valid: boolean; error?: string } {
  const {
    voucherRecordId,
    advanceRecordId,
    amountDisbursed,
    disbursements,
    advances,
    vouchers = [],
    currentDisbursementId,
  } = params;

  if (!voucherRecordId) {
    return { valid: false, error: 'Please select a travel voucher to disburse funds against.' };
  }

  // Check if voucher is already disbursed
  const alreadyDisbursed = isVoucherDisbursed(voucherRecordId, disbursements, currentDisbursementId);
  if (alreadyDisbursed) {
    const v = vouchers.find((item) => item.id === voucherRecordId);
    return {
      valid: false,
      error: `Voucher ${v?.voucherNo || voucherRecordId} has already been disbursed. A voucher cannot be disbursed more than once.`,
    };
  }

  if (!advanceRecordId) {
    return { valid: false, error: 'Please select an advance record to disburse funds from.' };
  }

  const advance = advances.find((a) => a.id === advanceRecordId);
  if (!advance) {
    return { valid: false, error: 'Selected advance record not found.' };
  }

  if (advance.status === 'Raised') {
    return {
      valid: false,
      error: 'This advance is still in "Raised" status. Advance status must be updated to "Approved" before funds can be disbursed.',
    };
  }

  if (advance.status === 'Closed') {
    return { valid: false, error: 'This advance is already Closed and cannot be disbursed.' };
  }

  if (amountDisbursed <= 0) {
    return { valid: false, error: 'Disbursed amount must be greater than ₹0.' };
  }

  const availableFunds = calcAdvanceFundsAvailable(advance, disbursements);
  const currentDisbAmount = currentDisbursementId
    ? disbursements.find((d) => d.id === currentDisbursementId)?.amountDisbursed || 0
    : 0;
  const maxAllowed = availableFunds + currentDisbAmount;

  if (amountDisbursed > maxAllowed) {
    return {
      valid: false,
      error: `Disbursed amount (₹${amountDisbursed.toLocaleString('en-IN')}) cannot exceed available advance funds (₹${maxAllowed.toLocaleString('en-IN')}).`,
    };
  }

  return { valid: true };
}

/**
 * Returns all vouchers eligible for settlement.
 * Validation rules:
 * 1. Must not be already Closed or Completed.
 * 2. Must not be mapped to another active settlement.
 */
export function getVouchersEligibleForSettlement(
  vouchers: TravelVoucher[],
  settlementVoucherMappings: SettlementVoucherMapping[],
  currentSettlementId?: string
): TravelVoucher[] {
  const otherSettledVouchers = new Set(
    settlementVoucherMappings
      .filter((m) => !currentSettlementId || m.settlementRecordId !== currentSettlementId)
      .map((m) => m.voucherRecordId)
  );

  return vouchers.filter((v) => {
    if (v.overallStatus === 'Closed' || v.overallStatus === 'Completed' || v.overallStatus === 'Cancelled') {
      return false;
    }
    if (otherSettledVouchers.has(v.id)) {
      return false;
    }
    return true;
  });
}
