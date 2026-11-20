import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getDisbursedVoucherIds,
  isVoucherDisbursed,
  getVouchersEligibleForDisbursement,
  getVouchersEligibleForAdvance,
  validateDisbursementSubmission,
  getVouchersEligibleForSettlement,
} from './validations.ts';
import type {
  TravelVoucher,
  AdvanceRecord,
  AdvanceVoucherMapping,
  EmployeeDisbursement,
  SettlementVoucherMapping,
} from '../types/index.ts';

const mockVoucher1: TravelVoucher = {
  id: 'VCH-001',
  voucherNo: 'UDZ/RS/2026/001',
  teamMemberId: 'TM-001',
  baseLocation: 'Udaipur',
  travelTo: 'Ahmedabad',
  projectName: 'Highway Project',
  travelStartDate: '2026-10-01',
  travelEndDate: '2026-10-05',
  travelScenario: 'Advance Before Travel',
  claimedAmount: 10000,
  approvedAmount: 10000,
  expenseDescription: 'Client meetings',
  attachments: [],
  verificationStatus: 'Approved',
  settlementStatus: 'Not Initiated',
  recoveryStatus: 'Not Applicable',
  overallStatus: 'Approved',
  createdAt: '2026-10-01',
  updatedAt: '2026-10-01',
};

const mockVoucher2: TravelVoucher = {
  ...mockVoucher1,
  id: 'VCH-002',
  voucherNo: 'UDZ/RS/2026/002',
  overallStatus: 'Advance Approved',
};

const mockVoucher3: TravelVoucher = {
  ...mockVoucher1,
  id: 'VCH-003',
  voucherNo: 'UDZ/RS/2026/003',
  overallStatus: 'Pending for Settlement',
};

const mockVoucherClosed: TravelVoucher = {
  ...mockVoucher1,
  id: 'VCH-004',
  voucherNo: 'UDZ/RS/2026/004',
  overallStatus: 'Closed',
};

const mockDisbursement1: EmployeeDisbursement = {
  id: 'DISB-001',
  employeeId: 'TM-001',
  voucherRecordId: 'VCH-003',
  advanceRecordId: 'ADV-001',
  disbursementDate: '2026-10-02',
  amountDisbursed: 10000,
  paymentMethod: 'Bank Transfer',
  transactionRef: 'NEFT-12345',
  createdAt: '2026-10-02',
};

const mockAdvanceRaised: AdvanceRecord = {
  id: 'ADV-001',
  advanceId: 'Advance/dheerendrak@dexitglobal.com/001',
  advanceRaisedDate: '2026-10-01',
  requestedAmount: 25000,
  amountActuallyReceived: 0,
  amountDisbursed: 0,
  status: 'Raised',
  createdAt: '2026-10-01',
  updatedAt: '2026-10-01',
};

const mockAdvanceApproved: AdvanceRecord = {
  id: 'ADV-002',
  advanceId: 'Advance/dheerendrak@dexitglobal.com/002',
  advanceRaisedDate: '2026-10-01',
  requestedAmount: 25000,
  approvedAmount: 25000,
  amountActuallyReceived: 25000,
  amountDisbursed: 10000,
  status: 'Approved',
  createdAt: '2026-10-01',
  updatedAt: '2026-10-01',
};

test('isVoucherDisbursed correctly detects disbursed voucher', () => {
  const disbursements = [mockDisbursement1];
  assert.equal(isVoucherDisbursed('VCH-003', disbursements), true);
  assert.equal(isVoucherDisbursed('VCH-001', disbursements), false);
  assert.equal(isVoucherDisbursed('VCH-003', disbursements, 'DISB-001'), false);
});

test('getVouchersEligibleForDisbursement filters out already disbursed vouchers', () => {
  const vouchers = [mockVoucher1, mockVoucher2, mockVoucher3, mockVoucherClosed];
  const disbursements = [mockDisbursement1]; // VCH-003 is disbursed

  const eligible = getVouchersEligibleForDisbursement(vouchers, disbursements);
  const eligibleIds = eligible.map((v) => v.id);

  // VCH-001 and VCH-002 are eligible
  assert.ok(eligibleIds.includes('VCH-001'));
  assert.ok(eligibleIds.includes('VCH-002'));
  // VCH-003 (disbursed) and VCH-004 (Closed) must NOT be eligible
  assert.ok(!eligibleIds.includes('VCH-003'));
  assert.ok(!eligibleIds.includes('VCH-004'));
});

test('validateDisbursementSubmission blocks re-disbursement of already disbursed voucher', () => {
  const disbursements = [mockDisbursement1];
  const advances = [mockAdvanceApproved];
  const vouchers = [mockVoucher1, mockVoucher3];

  const result = validateDisbursementSubmission({
    voucherRecordId: 'VCH-003', // already disbursed
    advanceRecordId: 'ADV-002',
    amountDisbursed: 5000,
    disbursements,
    advances,
    vouchers,
  });

  assert.equal(result.valid, false);
  assert.match(result.error || '', /already been disbursed/i);
});

test('validateDisbursementSubmission blocks disbursement from unapproved advance', () => {
  const disbursements: EmployeeDisbursement[] = [];
  const advances = [mockAdvanceRaised]; // Status: Raised
  const vouchers = [mockVoucher1];

  const result = validateDisbursementSubmission({
    voucherRecordId: 'VCH-001',
    advanceRecordId: 'ADV-001',
    amountDisbursed: 5000,
    disbursements,
    advances,
    vouchers,
  });

  assert.equal(result.valid, false);
  assert.match(result.error || '', /must be updated to "Approved"/i);
});

test('validateDisbursementSubmission blocks disbursement exceeding available funds', () => {
  const disbursements = [
    {
      ...mockDisbursement1,
      advanceRecordId: 'ADV-002', // 10000 already disbursed from ADV-002 (25000 received, so 15000 available)
    },
  ];
  const advances = [mockAdvanceApproved];
  const vouchers = [mockVoucher1];

  const result = validateDisbursementSubmission({
    voucherRecordId: 'VCH-001',
    advanceRecordId: 'ADV-002',
    amountDisbursed: 20000, // Exceeds 15,000 available
    disbursements,
    advances,
    vouchers,
  });

  assert.equal(result.valid, false);
  assert.match(result.error || '', /cannot exceed available advance funds/i);
});

test('validateDisbursementSubmission succeeds when voucher and advance meet all criteria', () => {
  const disbursements = [mockDisbursement1];
  const advances = [mockAdvanceApproved];
  const vouchers = [mockVoucher1];

  const result = validateDisbursementSubmission({
    voucherRecordId: 'VCH-001',
    advanceRecordId: 'ADV-002',
    amountDisbursed: 10000,
    disbursements,
    advances,
    vouchers,
  });

  assert.equal(result.valid, true);
});

test('getVouchersEligibleForAdvance prevents mapping already mapped or disbursed vouchers', () => {
  const vouchers = [mockVoucher1, mockVoucher2, mockVoucher3, mockVoucherClosed];
  const mappings: AdvanceVoucherMapping[] = [
    {
      id: 'AVM-001',
      advanceRecordId: 'ADV-001',
      voucherRecordId: 'VCH-002',
      allocatedAdvanceAmount: 10000,
      allocationDate: '2026-10-01',
    },
  ];
  const disbursements = [mockDisbursement1]; // VCH-003 is disbursed

  const eligible = getVouchersEligibleForAdvance(vouchers, mappings, disbursements);
  const eligibleIds = eligible.map((v) => v.id);

  // VCH-001 is eligible
  assert.ok(eligibleIds.includes('VCH-001'));
  // VCH-002 is mapped to another advance -> ineligible
  assert.ok(!eligibleIds.includes('VCH-002'));
  // VCH-003 is disbursed -> ineligible
  assert.ok(!eligibleIds.includes('VCH-003'));
  // VCH-004 is Closed -> ineligible
  assert.ok(!eligibleIds.includes('VCH-004'));
});

test('getVouchersEligibleForSettlement prevents repeating vouchers already in settlement', () => {
  const vouchers = [mockVoucher1, mockVoucher3, mockVoucherClosed];
  const settlementMappings: SettlementVoucherMapping[] = [
    {
      id: 'SVM-001',
      settlementRecordId: 'SET-001',
      voucherRecordId: 'VCH-003',
      allocatedSettlementAmount: 10000,
      allocationDate: '2026-10-02',
    },
  ];

  const eligible = getVouchersEligibleForSettlement(vouchers, settlementMappings);
  const eligibleIds = eligible.map((v) => v.id);

  assert.ok(eligibleIds.includes('VCH-001'));
  // VCH-003 is already in a settlement
  assert.ok(!eligibleIds.includes('VCH-003'));
  // VCH-Closed is Closed
  assert.ok(!eligibleIds.includes('VCH-004'));
});

test('when 2 vouchers mapped with one advance and 1 is disbursed, second voucher remains eligible for disbursement', () => {
  const v1: TravelVoucher = { ...mockVoucher1, id: 'VCH-M1', voucherNo: 'UDZ/RS/01', overallStatus: 'Pending for Settlement' };
  const v2: TravelVoucher = { ...mockVoucher1, id: 'VCH-M2', voucherNo: 'UDZ/RS/02', overallStatus: 'Advance Approved' };
  const vouchers = [v1, v2];

  const advanceMappings: AdvanceVoucherMapping[] = [
    { id: 'AVM-1', advanceRecordId: 'ADV-002', voucherRecordId: 'VCH-M1', allocatedAdvanceAmount: 10000, allocationDate: '2026-10-01' },
    { id: 'AVM-2', advanceRecordId: 'ADV-002', voucherRecordId: 'VCH-M2', allocatedAdvanceAmount: 15000, allocationDate: '2026-10-01' },
  ];

  // Only VCH-M1 has a disbursement record
  const disbursements: EmployeeDisbursement[] = [
    {
      id: 'DISB-001',
      employeeId: 'TM-001',
      voucherRecordId: 'VCH-M1',
      advanceRecordId: 'ADV-002',
      disbursementDate: '2026-10-02',
      amountDisbursed: 10000,
      paymentMethod: 'Bank Transfer',
      transactionRef: 'NEFT-12345',
      createdAt: '2026-10-02',
    },
  ];

  const eligibleForAdv = getVouchersEligibleForDisbursement(
    vouchers,
    disbursements,
    undefined,
    'ADV-002',
    advanceMappings
  );

  // VCH-M1 is disbursed, so it must NOT be eligible
  assert.equal(eligibleForAdv.some((v) => v.id === 'VCH-M1'), false);
  // VCH-M2 is NOT disbursed, so it MUST be eligible
  assert.equal(eligibleForAdv.some((v) => v.id === 'VCH-M2'), true);
  assert.equal(eligibleForAdv.length, 1);
  assert.equal(eligibleForAdv[0].id, 'VCH-M2');
});

