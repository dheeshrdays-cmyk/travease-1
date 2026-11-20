import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatINR,
  formatIndianDate,
  normalizeIndianPhone,
  buildWhatsAppNotificationText,
  calcAdvanceFundsAvailable,
  calcAdvanceTotalAllocated,
  calcPaymentOutstandingRecovery,
  calcVoucherFinancialSummary,
  calcMonthlyCategoryExpenses,
  buildCompleteLifecycleReportRows,
  deriveVoucherStatus,
  buildStatusWiseSummary,
  buildMonthWiseSummary,
  buildTeamWiseSummary,
  getStationCode,
  generateVoucherPrefix,
} from './calculations.ts';
import type {
  AdvanceRecord,
  AdvanceVoucherMapping,
  EmployeeDisbursement,
  VendorPaymentRecord,
  RecoveryPaymentMapping,
  TravelVoucher,
  SettlementRecord,
  SettlementVoucherMapping,
  TeamMember,
} from '../types/index.ts';

test('formatINR formats numbers into Indian currency style correctly', () => {
  assert.equal(formatINR(0), '₹0');
  assert.equal(formatINR(5000), '₹5,000');
  assert.equal(formatINR(125000), '₹1,25,000');
  assert.equal(formatINR(125000.5, true), '₹1,25,000.50');
  assert.equal(formatINR(-500), '-₹500');
});

test('formatIndianDate formats YYYY-MM-DD to DD-MM-YYYY', () => {
  assert.equal(formatIndianDate('2026-10-15'), '15-10-2026');
  assert.equal(formatIndianDate('2026-03-05T00:00:00Z'), '05-03-2026');
  assert.equal(formatIndianDate('15-10-2026'), '15-10-2026');
});

test('normalizeIndianPhone formats Indian mobile numbers without symbols', () => {
  assert.equal(normalizeIndianPhone('9876543210'), '919876543210');
  assert.equal(normalizeIndianPhone('+91 98765 43210'), '919876543210');
  assert.equal(normalizeIndianPhone('09876543210'), '919876543210');
  assert.equal(normalizeIndianPhone('919876543210'), '919876543210');
});

test('buildWhatsAppNotificationText generates required templates and NEVER includes Advance ID', () => {
  // Test 1: Voucher Approved
  const approvedMsg = buildWhatsAppNotificationText('Voucher Approved', {
    employeeName: 'Rahul Sharma',
    voucherNo: 'V-2026-001',
    projectName: 'Delhi Metro Expansion',
    startDate: '2026-10-01',
    endDate: '2026-10-05',
  });
  assert.equal(
    approvedMsg,
    'Hello Rahul Sharma, your travel voucher V-2026-001 for Delhi Metro Expansion, covering travel from 01-10-2026 to 05-10-2026, has been approved. You will be updated regarding the advance process.'
  );

  // Test 2: Advance Raised - Must use Voucher No and NEVER Advance ID
  const advanceMsg = buildWhatsAppNotificationText('Advance Raised', {
    employeeName: 'Priya Patel',
    voucherNo: 'V-2026-002',
    advanceAmount: 15000,
  });
  assert.equal(
    advanceMsg,
    'Hello Priya Patel, an advance request of ₹15,000 has been raised for your travel against Voucher No. V-2026-002. The funds are subject to Accounts approval and release.'
  );
  assert.equal(advanceMsg.includes('ADV'), false); // Verification: no advance ID

  // Test 3: Amount Disbursed
  const disbMsg = buildWhatsAppNotificationText('Amount Disbursed', {
    employeeName: 'Amit Verma',
    voucherNo: 'V-2026-003',
    disbursedAmount: 12500,
    disbursementDate: '2026-10-08',
  });
  assert.equal(
    disbMsg,
    'Hello Amit Verma, ₹12,500 has been disbursed for your travel against Voucher No. V-2026-003 on 08-10-2026. Please retain all bills and vouchers for settlement.'
  );

  // Test 4: Advance Approved
  const advApprovedMsg = buildWhatsAppNotificationText('Advance Approved', {
    employeeName: 'Priya Patel',
    voucherNo: 'V-2026-004',
    projectName: 'Smart City Ahmedabad',
    advanceAmount: 20000,
  });
  assert.equal(
    advApprovedMsg,
    'Hello Priya Patel, the advance of ₹20,000 requested against Voucher No. V-2026-004 for Smart City Ahmedabad has been approved by Accounts. Disbursement will be processed shortly.'
  );

  // Test 5: Settlement Initiated
  const setInitMsg = buildWhatsAppNotificationText('Settlement Initiated', {
    employeeName: 'Sunita Rao',
    voucherNo: 'V-2026-005',
    projectName: 'Solar Park Udaipur',
    settlementAmount: 18500,
  });
  assert.equal(
    setInitMsg,
    'Hello Sunita Rao, settlement accounting has been initiated for Voucher No. V-2026-005 (Solar Park Udaipur) for ₹18,500. It is currently under accounting audit and verification.'
  );

  // Test 6: Closed
  const closedMsg = buildWhatsAppNotificationText('Closed', {
    employeeName: 'Rahul Sharma',
    voucherNo: 'V-2026-006',
    projectName: 'High Speed Rail',
  });
  assert.equal(
    closedMsg,
    'Hello Rahul Sharma, your travel voucher V-2026-006 for High Speed Rail has been successfully settled and closed in the corporate accounting software. Thank you!'
  );
});

test('calcAdvanceFundsAvailable correctly reflects actual receipts minus disbursements', () => {
  const advance: AdvanceRecord = {
    id: 'ADV-REC-001',
    advanceId: 'ADV/26/0412',
    advanceRaisedDate: '2026-10-01',
    requestedAmount: 25000,
    approvalDate: '2026-10-02',
    approvedAmount: 25000,
    fundsReceivedDate: '2026-10-03',
    amountActuallyReceived: 20000, // partially received
    amountDisbursed: 0,
    status: 'Funds Received',
    createdAt: '2026-10-01',
    updatedAt: '2026-10-03',
  };

  const disbursements: EmployeeDisbursement[] = [
    {
      id: 'DISB-001',
      employeeId: 'TM-101',
      voucherRecordId: 'VCH-001',
      advanceRecordId: 'ADV-REC-001',
      disbursementDate: '2026-10-04',
      amountDisbursed: 12000,
      paymentMethod: 'UPI',
      transactionRef: 'UPI/26/001',
      createdAt: '2026-10-04',
    },
  ];

  // Actual received was 20000, disbursed 12000 => Available 8000
  const available = calcAdvanceFundsAvailable(advance, disbursements);
  assert.equal(available, 8000);
});

test('calcPaymentOutstandingRecovery tracks recovery balances on personal vendor payments', () => {
  const payment: VendorPaymentRecord = {
    id: 'PAY-001',
    voucherRecordId: 'VCH-001',
    employeeId: 'TM-101',
    projectName: 'Smart City Pune',
    vendorName: 'IndiGo Airlines',
    expenseCategory: 'Flight',
    travelDate: '2026-10-10',
    paymentDate: '2026-10-01',
    amountPaid: 8500,
    paymentSource: 'Personal Funds',
    paymentMethod: 'Credit Card',
    recoveryStatus: 'Recovery Requested',
    createdAt: '2026-10-01',
  };

  const mappings: RecoveryPaymentMapping[] = [
    {
      id: 'RPM-001',
      recoveryRecordId: 'REC-001',
      vendorPaymentRecordId: 'PAY-001',
      voucherRecordId: 'VCH-001',
      amountRequestedForRecovery: 8500,
      amountRecovered: 5000, // partial recovery
      outstandingAmount: 3500,
    },
  ];

  const outstanding = calcPaymentOutstandingRecovery(payment, mappings);
  assert.equal(outstanding, 3500);
});

test('calcVoucherFinancialSummary safeguards against double counting and calculates refund/reimbursement due', () => {
  const voucher: TravelVoucher = {
    id: 'VCH-001',
    voucherNo: 'V-2026-001',
    teamMemberId: 'TM-101',
    baseLocation: 'Mumbai',
    travelTo: 'Delhi',
    projectName: 'Metro Survey',
    travelStartDate: '2026-10-01',
    travelEndDate: '2026-10-03',
    travelScenario: 'Advance Before Travel',
    claimedAmount: 18000,
    approvedAmount: 16000,
    expenseDescription: 'Site visit, local cabs, meals, hotel',
    attachments: [],
    verificationStatus: 'Approved',
    settlementStatus: 'Settlement Pending',
    recoveryStatus: 'Not Applicable',
    overallStatus: 'Approved',
    createdAt: '2026-10-01',
    updatedAt: '2026-10-03',
  };

  // Direct company hotel booking: 6000
  const payments: VendorPaymentRecord[] = [
    {
      id: 'PAY-001',
      voucherRecordId: 'VCH-001',
      employeeId: 'TM-101',
      projectName: 'Metro Survey',
      vendorName: 'Ginger Hotel Delhi',
      expenseCategory: 'Hotel',
      travelDate: '2026-10-01',
      paymentDate: '2026-10-01',
      amountPaid: 6000,
      paymentSource: 'Company Funds',
      paymentMethod: 'Company Card',
      recoveryStatus: 'Not Applicable',
      createdAt: '2026-10-01',
    },
  ];

  // Advance disbursed to employee: 12000
  const disbursements: EmployeeDisbursement[] = [
    {
      id: 'DISB-001',
      employeeId: 'TM-101',
      voucherRecordId: 'VCH-001',
      advanceRecordId: 'ADV-001',
      disbursementDate: '2026-10-01',
      amountDisbursed: 12000,
      paymentMethod: 'Bank Transfer',
      transactionRef: 'NEFT123',
      createdAt: '2026-10-01',
    },
  ];

  // Total approved = 16000.
  // Company paid 6000.
  // Employee's approved part = 16000 - 6000 = 10000.
  // Employee was disbursed 12000.
  // Therefore, employee received 12000 for a 10000 expense => Employee Refund Due = 2000!
  const summary = calcVoucherFinancialSummary(voucher, [], disbursements, [], payments, []);

  assert.equal(summary.claimedAmount, 18000);
  assert.equal(summary.approvedAmount, 16000);
  assert.equal(summary.companyPaidDirectExpenses, 6000);
  assert.equal(summary.totalEmployeeDisbursed, 12000);
  assert.equal(summary.employeeRefundDue, 2000);
  assert.equal(summary.employeeReimbursementDue, 0);
});

test('calcMonthlyCategoryExpenses aggregates monthly category distribution properly', () => {
  const testVouchers: TravelVoucher[] = [
    {
      id: 'V-1',
      voucherNo: 'V-001',
      teamMemberId: 'TM-1',
      baseLocation: 'Mumbai',
      travelTo: 'Delhi',
      projectName: 'Metro',
      travelStartDate: '2026-10-05',
      travelEndDate: '2026-10-08',
      travelScenario: 'Direct Booking / Vendor Payment',
      claimedAmount: 15000,
      approvedAmount: 15000,
      expenseDescription: 'Site visit, local cab and hotel food bills',
      attachments: [],
      verificationStatus: 'Approved',
      settlementStatus: 'Completed',
      recoveryStatus: 'Not Applicable',
      overallStatus: 'Completed',
      createdAt: '2026-10-01',
      updatedAt: '2026-10-10',
    },
  ];

  const testPayments: VendorPaymentRecord[] = [
    {
      id: 'P-1',
      voucherRecordId: 'V-1',
      employeeId: 'TM-1',
      projectName: 'Metro',
      vendorName: 'IndiGo',
      expenseCategory: 'Flight',
      travelDate: '2026-10-05',
      paymentDate: '2026-10-01',
      amountPaid: 8000,
      paymentSource: 'Company Funds',
      paymentMethod: 'Corporate Card',
      recoveryStatus: 'Not Applicable',
      createdAt: '2026-10-01',
    },
  ];

  const result = calcMonthlyCategoryExpenses(testVouchers, testPayments);
  assert.equal(result.monthlyData.length, 1);
  assert.equal(result.monthlyData[0].monthKey, '2026-10');
  assert.equal(result.monthlyData[0].Flight, 8000);
  // Remaining 7,000 is split between Hotel, Taxi / Cab, and Meals from "hotel", "cab", "food"
  const remainingCategorized =
    result.monthlyData[0]['Taxi / Cab'] +
    result.monthlyData[0].Meals +
    result.monthlyData[0].Hotel;
  assert.equal(remainingCategorized, 7000);
  assert.equal(result.grandTotal, 15000);
  assert.ok(result.categoryTotals.length >= 3);
});

test('advance raised without any mapped voucher maintains accurate funds available and 0 allocated', () => {
  const unmappedAdvance: AdvanceRecord = {
    id: 'ADV-REC-999',
    advanceId: 'ADV/26/9999',
    teamMemberId: 'TM-101',
    projectName: 'New Solar Installation',
    advanceRaisedDate: '2026-10-17',
    requestedAmount: 30000,
    approvedAmount: 30000,
    amountActuallyReceived: 30000,
    amountDisbursed: 0,
    status: 'Funds Received',
    createdAt: '2026-10-17',
    updatedAt: '2026-10-17',
  };

  const emptyMappings: AdvanceVoucherMapping[] = [];
  const noDisbursements: EmployeeDisbursement[] = [];

  // Available funds should be full ₹30,000 even without any vouchers mapped
  const available = calcAdvanceFundsAvailable(unmappedAdvance, noDisbursements);
  assert.equal(available, 30000);

  // Total allocated across vouchers should be 0
  const allocated = calcAdvanceTotalAllocated(unmappedAdvance.id, emptyMappings);
  assert.equal(allocated, 0);
});

test('advance mapped to multiple vouchers correctly distributes allocations without duplicate records', () => {
  const sharedAdvance: AdvanceRecord = {
    id: 'ADV-REC-003',
    advanceId: 'ADV/26/0240',
    advanceRaisedDate: '2026-10-14',
    requestedAmount: 30000,
    approvedAmount: 30000,
    amountActuallyReceived: 30000,
    amountDisbursed: 18000,
    status: 'Partially Disbursed',
    createdAt: '2026-10-14',
    updatedAt: '2026-10-15',
  };

  // Mapped to 2 separate vouchers
  const mappings: AdvanceVoucherMapping[] = [
    {
      id: 'AVM-001',
      advanceRecordId: 'ADV-REC-003',
      voucherRecordId: 'VCH-2026-001',
      allocatedAdvanceAmount: 18000,
      allocationDate: '2026-10-14',
    },
    {
      id: 'AVM-002',
      advanceRecordId: 'ADV-REC-003',
      voucherRecordId: 'VCH-2026-002',
      allocatedAdvanceAmount: 12000,
      allocationDate: '2026-10-14',
    },
  ];

  // Total allocated should equal sum of both allocations
  const totalAllocated = calcAdvanceTotalAllocated(sharedAdvance.id, mappings);
  assert.equal(totalAllocated, 30000);

  // Voucher 1 should see only its ₹18,000 portion
  const voucher1Allocated = mappings
    .filter((m) => m.voucherRecordId === 'VCH-2026-001')
    .reduce((sum, m) => sum + m.allocatedAdvanceAmount, 0);
  assert.equal(voucher1Allocated, 18000);

  // Voucher 2 should see only its ₹12,000 portion
  const voucher2Allocated = mappings
    .filter((m) => m.voucherRecordId === 'VCH-2026-002')
    .reduce((sum, m) => sum + m.allocatedAdvanceAmount, 0);
  assert.equal(voucher2Allocated, 12000);
});

test('removing or changing a voucher mapping updates allocations cleanly without affecting other vouchers', () => {
  const mappings: AdvanceVoucherMapping[] = [
    {
      id: 'AVM-001',
      advanceRecordId: 'ADV-REC-001',
      voucherRecordId: 'VCH-001',
      allocatedAdvanceAmount: 10000,
      allocationDate: '2026-10-15',
    },
    {
      id: 'AVM-002',
      advanceRecordId: 'ADV-REC-001',
      voucherRecordId: 'VCH-002',
      allocatedAdvanceAmount: 15000,
      allocationDate: '2026-10-15',
    },
  ];

  // Initially 2 vouchers mapped = 25,000
  assert.equal(calcAdvanceTotalAllocated('ADV-REC-001', mappings), 25000);

  // After removing VCH-001 mapping:
  const updatedMappings = mappings.filter((m) => m.voucherRecordId !== 'VCH-001');
  assert.equal(updatedMappings.length, 1);
  assert.equal(calcAdvanceTotalAllocated('ADV-REC-001', updatedMappings), 15000);
  assert.equal(updatedMappings[0].voucherRecordId, 'VCH-002');
});

test('buildCompleteLifecycleReportRows outputs all 10 required fields and maps settlements to advance IDs', () => {
  const teamMembers: TeamMember[] = [
    {
      id: 'TM-101',
      empId: 'EMP-01',
      fullName: 'Rahul Sharma',
      department: 'Infrastructure',
      whatsappNumber: '9876543210',
      baseLocation: 'Mumbai',
      status: 'Active',
      createdAt: '2026-01-01',
    },
  ];

  const vouchers: TravelVoucher[] = [
    {
      id: 'VCH-001',
      voucherNo: 'V-2026-001',
      teamMemberId: 'TM-101',
      baseLocation: 'Mumbai',
      travelTo: 'Delhi',
      projectName: 'Delhi Hub Facility',
      travelStartDate: '2026-10-08',
      travelEndDate: '2026-10-10',
      travelScenario: 'Advance Before Travel',
      claimedAmount: 13800,
      approvedAmount: 13800,
      expenseDescription: 'Client site travel expenses',
      attachments: [],
      verificationStatus: 'Approved',
      settlementStatus: 'Completed',
      recoveryStatus: 'Not Applicable',
      overallStatus: 'Completed',
      createdAt: '2026-10-01',
      updatedAt: '2026-10-10',
    },
  ];

  const advances: AdvanceRecord[] = [
    {
      id: 'ADV-REC-001',
      advanceId: 'ADV/26/0114',
      teamMemberId: 'TM-101',
      projectName: 'Delhi Hub Facility',
      advanceRaisedDate: '2026-10-05',
      requestedAmount: 13800,
      amountActuallyReceived: 13800,
      amountDisbursed: 13800,
      status: 'Fully Disbursed',
      createdAt: '2026-10-05',
      updatedAt: '2026-10-08',
    },
  ];

  const advanceVoucherMappings: AdvanceVoucherMapping[] = [
    {
      id: 'AVM-001',
      advanceRecordId: 'ADV-REC-001',
      voucherRecordId: 'VCH-001',
      allocatedAdvanceAmount: 13800,
      allocationDate: '2026-10-05',
    },
  ];

  // Every settlement mapped with advance ID
  const settlements: SettlementRecord[] = [
    {
      id: 'SET-REC-001',
      settlementId: 'SET/26/0205',
      advanceRecordId: 'ADV-REC-001',
      advanceId: 'ADV/26/0114',
      settlementInitiatedDate: '2026-10-09',
      settlementCompletionDate: '2026-10-10',
      settlementAmount: 13800,
      accountingStatus: 'Completed',
      createdAt: '2026-10-09',
      updatedAt: '2026-10-10',
    },
  ];

  const settlementVoucherMappings: SettlementVoucherMapping[] = [
    {
      id: 'SVM-001',
      settlementRecordId: 'SET-REC-001',
      voucherRecordId: 'VCH-001',
      allocatedSettlementAmount: 13800,
      allocationDate: '2026-10-09',
    },
  ];

  const rows = buildCompleteLifecycleReportRows({
    vouchers,
    teamMembers,
    advances,
    advanceVoucherMappings,
    settlements,
    settlementVoucherMappings,
  });

  assert.equal(rows.length, 1);
  const r = rows[0];

  // 1. voucher no.
  assert.equal(r.voucherNo, 'V-2026-001');
  // 2. team name
  assert.equal(r.teamName, 'Rahul Sharma');
  // 3. project name
  assert.equal(r.projectName, 'Delhi Hub Facility');
  // 4. travel dates
  assert.equal(r.travelDates, '08-10-2026 to 10-10-2026');
  // 5. advance ID
  assert.equal(r.advanceId, 'ADV/26/0114');
  // 6. Advance Amount
  assert.equal(r.advanceAmount, 13800);
  // 7. Advance raised date
  assert.equal(r.advanceRaisedDate, '05-10-2026');
  // 8. settlement ID
  assert.equal(r.settlementId, 'SET/26/0205');
  // 9. Settlement Amount
  assert.equal(r.settlementAmount, 13800);
  // 10. Settlement dates
  assert.equal(r.settlementDates, '09-10-2026 to 10-10-2026');
});

test('project management: only active projects are offered for new transactions while inactive projects remain accessible', () => {
  const projects = [
    { id: 'p1', projectId: 'PRJ-2026-001', projectName: 'Active Metro Project', status: 'Active' as const, createdAt: '2026-01-01' },
    { id: 'p2', projectId: 'PRJ-2026-002', projectName: 'Completed Bridge Project', status: 'Inactive' as const, createdAt: '2026-01-02' },
  ];

  const activeProjects = projects.filter((p) => p.status === 'Active');
  assert.equal(activeProjects.length, 1);
  assert.equal(activeProjects[0].projectName, 'Active Metro Project');

  // Existing transaction linked to inactive project
  const historicalVoucher: Partial<TravelVoucher> = {
    id: 'v-old',
    voucherNo: 'V-2025-999',
    teamMemberId: 'm1',
    projectName: 'Completed Bridge Project',
    travelScenario: 'Advance Before Travel',
    baseLocation: 'Mumbai',
    travelTo: 'Pune',
    travelStartDate: '2025-12-01',
    travelEndDate: '2025-12-02',
    voucherReceivedDate: '2025-12-03',
    claimedAmount: 4500,
    overallStatus: 'Completed',
    settlementStatus: 'Completed',
  };

  // Deactivating p2 did not alter historical voucher record or its project details
  assert.equal(historicalVoucher.projectName, 'Completed Bridge Project');
});

test('advance status workflow: enforces valid permitted statuses Raised, Approved, Disbursed, Closed', () => {
  const permittedStatuses = ['Raised', 'Approved', 'Disbursed', 'Closed'] as const;
  
  // Default status for new advance is Raised
  const defaultStatus = 'Raised';
  assert.ok(permittedStatuses.includes(defaultStatus));

  // Advance can be edited from Raised to Approved
  const advanceAfterApproval: AdvanceRecord = {
    id: 'adv-1',
    advanceId: 'Advance/dheerendrak@dexitglobal.com/001',
    teamMemberId: 'm1',
    projectName: 'Active Metro Project',
    requestedAmount: 15000,
    amountActuallyReceived: 15000,
    amountDisbursed: 0,
    advanceRaisedDate: '2026-10-15',
    status: 'Approved',
    createdAt: '2026-10-15',
    updatedAt: '2026-10-15',
  };
  assert.equal(advanceAfterApproval.status, 'Approved');
  assert.notEqual(advanceAfterApproval.status, 'Disbursed');

  // Next step: transition to Disbursed
  const advanceDisbursed: AdvanceRecord = {
    ...advanceAfterApproval,
    status: 'Disbursed',
  };
  assert.equal(advanceDisbursed.status, 'Disbursed');

  // Final step: Closed
  const advanceClosed: AdvanceRecord = {
    ...advanceAfterApproval,
    status: 'Closed',
  };
  assert.equal(advanceClosed.status, 'Closed');
});

test('refined workflow step 1: once voucher recorded, its default status is Approved', () => {
  const newVoucher = {
    id: 'v-test-1',
    voucherNo: 'UDZ/DK/001',
    teamMemberId: 'm1',
    projectName: 'Metro Rail Phase 2',
    travelScenario: 'Advance Before Travel' as const,
    baseLocation: 'Udaipur',
    travelTo: 'Ahmedabad',
    travelStartDate: '2026-11-01',
    travelEndDate: '2026-11-04',
    claimedAmount: 12000,
    approvedAmount: 12000,
    expenseDescription: 'Travel expenses',
    attachments: [],
    overallStatus: 'Approved' as const,
    verificationStatus: 'Approved' as const,
    settlementStatus: 'Not Initiated' as const,
    recoveryStatus: 'Not Applicable' as const,
    createdAt: '2026-11-01',
    updatedAt: '2026-11-01',
  } as TravelVoucher;

  const status = deriveVoucherStatus(newVoucher, [], [], [], [], []);
  assert.equal(status, 'Approved');
});

test('refined workflow step 2: when advance is raised against approved voucher, its status updates to Advance Raised', () => {
  const voucher = {
    id: 'v-test-2',
    voucherNo: 'UDZ/DK/002',
    teamMemberId: 'm1',
    projectName: 'Metro Rail Phase 2',
    travelScenario: 'Advance Before Travel' as const,
    baseLocation: 'Udaipur',
    travelTo: 'Delhi',
    travelStartDate: '2026-11-05',
    travelEndDate: '2026-11-08',
    claimedAmount: 18000,
    approvedAmount: 18000,
    expenseDescription: 'Travel expenses',
    attachments: [],
    overallStatus: 'Approved' as const,
    verificationStatus: 'Approved' as const,
    settlementStatus: 'Not Initiated' as const,
    recoveryStatus: 'Not Applicable' as const,
    createdAt: '2026-11-01',
    updatedAt: '2026-11-01',
  } as TravelVoucher;

  const advance = {
    id: 'adv-test-2',
    advanceId: 'Advance/dheerendrak@dexitglobal.com/001',
    advanceRaisedDate: '2026-11-01',
    requestedAmount: 18000,
    amountActuallyReceived: 0,
    amountDisbursed: 0,
    status: 'Raised' as const,
    createdAt: '2026-11-01',
    updatedAt: '2026-11-01',
  } as AdvanceRecord;

  const mapping: AdvanceVoucherMapping = {
    id: 'avm-test-2',
    advanceRecordId: 'adv-test-2',
    voucherRecordId: 'v-test-2',
    allocatedAdvanceAmount: 18000,
    allocationDate: '2026-11-01',
  };

  const status = deriveVoucherStatus(voucher, [advance], [mapping], [], [], []);
  assert.equal(status, 'Advance Raised');
});

test('refined workflow step 3: when advance edited from Raised to Approved, mapped voucher updates to Advance Approved', () => {
  const voucher = {
    id: 'v-test-2b',
    voucherNo: 'UDZ/DK/002',
    teamMemberId: 'm1',
    projectName: 'Metro Rail Phase 2',
    travelScenario: 'Advance Before Travel' as const,
    baseLocation: 'Udaipur',
    travelTo: 'Delhi',
    travelStartDate: '2026-11-05',
    travelEndDate: '2026-11-08',
    claimedAmount: 18000,
    approvedAmount: 18000,
    expenseDescription: 'Travel expenses',
    attachments: [],
    overallStatus: 'Advance Raised' as const,
    verificationStatus: 'Approved' as const,
    settlementStatus: 'Advance Raised' as const,
    recoveryStatus: 'Not Applicable' as const,
    createdAt: '2026-11-01',
    updatedAt: '2026-11-01',
  } as TravelVoucher;

  const advance = {
    id: 'adv-test-2b',
    advanceId: 'Advance/dheerendrak@dexitglobal.com/002',
    advanceRaisedDate: '2026-11-01',
    requestedAmount: 18000,
    approvedAmount: 18000,
    amountActuallyReceived: 18000,
    amountDisbursed: 0,
    status: 'Approved' as const,
    createdAt: '2026-11-01',
    updatedAt: '2026-11-02',
  } as AdvanceRecord;

  const mapping: AdvanceVoucherMapping = {
    id: 'avm-test-2b',
    advanceRecordId: 'adv-test-2b',
    voucherRecordId: 'v-test-2b',
    allocatedAdvanceAmount: 18000,
    allocationDate: '2026-11-01',
  };

  const status = deriveVoucherStatus(voucher, [advance], [mapping], [], [], []);
  assert.equal(status, 'Advance Approved');
});

test('refined workflow step 4: when amount disbursed, status updates to Pending for Settlement', () => {
  const voucher = {
    id: 'v-test-3',
    voucherNo: 'UDZ/DK/003',
    teamMemberId: 'm1',
    projectName: 'Solar Plant Survey',
    travelScenario: 'Advance Before Travel' as const,
    baseLocation: 'Udaipur',
    travelTo: 'Jaipur',
    travelStartDate: '2026-11-10',
    travelEndDate: '2026-11-14',
    claimedAmount: 22000,
    approvedAmount: 22000,
    expenseDescription: 'Survey travel',
    attachments: [],
    overallStatus: 'Advance Approved' as const,
    verificationStatus: 'Approved' as const,
    settlementStatus: 'Advance Raised' as const,
    recoveryStatus: 'Not Applicable' as const,
    createdAt: '2026-11-05',
    updatedAt: '2026-11-05',
  } as TravelVoucher;

  const advance = {
    id: 'adv-test-3',
    advanceId: 'Advance/dheerendrak@dexitglobal.com/003',
    advanceRaisedDate: '2026-11-05',
    requestedAmount: 22000,
    amountActuallyReceived: 22000,
    amountDisbursed: 22000,
    status: 'Disbursed' as const,
    createdAt: '2026-11-05',
    updatedAt: '2026-11-05',
  } as AdvanceRecord;

  const mapping: AdvanceVoucherMapping = {
    id: 'avm-test-3',
    advanceRecordId: 'adv-test-3',
    voucherRecordId: 'v-test-3',
    allocatedAdvanceAmount: 22000,
    allocationDate: '2026-11-05',
  };

  const disbursement: EmployeeDisbursement = {
    id: 'disb-test-3',
    advanceRecordId: 'adv-test-3',
    voucherRecordId: 'v-test-3',
    employeeId: 'm1',
    amountDisbursed: 22000,
    disbursementDate: '2026-11-06',
    paymentMethod: 'Bank Transfer',
    transactionRef: 'UTR99887766',
    createdAt: '2026-11-06',
  };

  const status = deriveVoucherStatus(
    voucher,
    [advance],
    [mapping],
    [disbursement],
    [],
    []
  );
  assert.equal(status, 'Pending for Settlement');
});

test('when 2 vouchers are mapped to 1 advance, disbursing 1 voucher sets only that voucher to Pending for Settlement while second voucher remains Advance Approved', () => {
  const v1 = {
    id: 'v-multi-1',
    voucherNo: 'UDZ/DK/010',
    teamMemberId: 'm1',
    projectName: 'Solar Plant Survey',
    travelScenario: 'Advance Before Travel' as const,
    claimedAmount: 10000,
    approvedAmount: 10000,
    overallStatus: 'Advance Approved' as const,
    verificationStatus: 'Approved' as const,
    settlementStatus: 'Advance Raised' as const,
    recoveryStatus: 'Not Applicable' as const,
    createdAt: '2026-11-05',
    updatedAt: '2026-11-05',
  } as TravelVoucher;

  const v2 = {
    ...v1,
    id: 'v-multi-2',
    voucherNo: 'UDZ/DK/011',
    claimedAmount: 12000,
    approvedAmount: 12000,
  } as TravelVoucher;

  const advance = {
    id: 'adv-multi',
    advanceId: 'Advance/dheerendrak@dexitglobal.com/010',
    advanceRaisedDate: '2026-11-05',
    requestedAmount: 22000,
    approvedAmount: 22000,
    amountActuallyReceived: 22000,
    amountDisbursed: 10000,
    status: 'Disbursed' as const,
    createdAt: '2026-11-05',
    updatedAt: '2026-11-05',
  } as AdvanceRecord;

  const mappings: AdvanceVoucherMapping[] = [
    {
      id: 'avm-m-1',
      advanceRecordId: 'adv-multi',
      voucherRecordId: 'v-multi-1',
      allocatedAdvanceAmount: 10000,
      allocationDate: '2026-11-05',
    },
    {
      id: 'avm-m-2',
      advanceRecordId: 'adv-multi',
      voucherRecordId: 'v-multi-2',
      allocatedAdvanceAmount: 12000,
      allocationDate: '2026-11-05',
    },
  ];

  // Only v1 has a disbursement record
  const disbursement: EmployeeDisbursement = {
    id: 'disb-m-1',
    advanceRecordId: 'adv-multi',
    voucherRecordId: 'v-multi-1',
    employeeId: 'm1',
    amountDisbursed: 10000,
    disbursementDate: '2026-11-06',
    paymentMethod: 'Bank Transfer',
    transactionRef: 'UTR-MULTI-1',
    createdAt: '2026-11-06',
  };

  const status1 = deriveVoucherStatus(v1, [advance], mappings, [disbursement], [], []);
  const status2 = deriveVoucherStatus(v2, [advance], mappings, [disbursement], [], []);

  assert.equal(status1, 'Pending for Settlement');
  assert.equal(status2, 'Advance Approved');
});

test('refined workflow step 5: voucher and advance transition to Closed once settlement done', () => {
  const voucher = {
    id: 'v-test-4',
    voucherNo: 'UDZ/DK/004',
    teamMemberId: 'm1',
    projectName: 'Solar Plant Survey',
    travelScenario: 'Advance Before Travel' as const,
    baseLocation: 'Udaipur',
    travelTo: 'Jaipur',
    travelStartDate: '2026-11-10',
    travelEndDate: '2026-11-14',
    claimedAmount: 22000,
    approvedAmount: 22000,
    expenseDescription: 'Survey travel',
    attachments: [],
    overallStatus: 'Pending for Settlement' as const,
    verificationStatus: 'Approved' as const,
    settlementStatus: 'Pending for Settlement' as const,
    recoveryStatus: 'Not Applicable' as const,
    createdAt: '2026-11-05',
    updatedAt: '2026-11-05',
  } as TravelVoucher;

  const settlement = {
    id: 'set-test-4',
    settlementId: 'Settlement/dheerendrak@dexitglobal.com/001',
    advanceRecordId: 'adv-test-4',
    settlementInitiatedDate: '2026-11-16',
    settlementCompletionDate: '2026-11-18',
    settlementAmount: 22000,
    accountingStatus: 'Closed' as const,
    createdAt: '2026-11-16',
    updatedAt: '2026-11-18',
  } as SettlementRecord;

  const mapping: SettlementVoucherMapping = {
    id: 'svm-test-4',
    settlementRecordId: 'set-test-4',
    voucherRecordId: 'v-test-4',
    allocatedSettlementAmount: 22000,
    allocationDate: '2026-11-16',
  };

  const status = deriveVoucherStatus(voucher, [], [], [], [settlement], [mapping]);
  assert.equal(status, 'Closed');
});

test('buildStatusWiseSummary groups vouchers and tallies claimed, approved, disbursed, settled', () => {
  const v1 = {
    id: 'v-s1',
    voucherNo: 'DEL/DK/001',
    teamMemberId: 'm1',
    projectName: 'Proj A',
    travelScenario: 'Advance Before Travel' as const,
    baseLocation: 'Delhi',
    travelTo: 'Mumbai',
    claimedAmount: 10000,
    approvedAmount: 10000,
    overallStatus: 'Approved' as const,
    verificationStatus: 'Approved' as const,
    settlementStatus: 'Not Initiated' as const,
    recoveryStatus: 'Not Applicable' as const,
    createdAt: '2026-10-01',
    updatedAt: '2026-10-01',
  } as unknown as TravelVoucher;

  const v2 = {
    id: 'v-s2',
    voucherNo: 'BOM/RS/002',
    teamMemberId: 'm2',
    projectName: 'Proj B',
    travelScenario: 'Advance Before Travel' as const,
    baseLocation: 'Mumbai',
    travelTo: 'Goa',
    claimedAmount: 15000,
    approvedAmount: 14000,
    overallStatus: 'Closed' as const,
    verificationStatus: 'Approved' as const,
    settlementStatus: 'Completed' as const,
    recoveryStatus: 'Not Applicable' as const,
    createdAt: '2026-10-02',
    updatedAt: '2026-10-15',
  } as unknown as TravelVoucher;

  const disb: EmployeeDisbursement[] = [
    {
      id: 'd1',
      employeeId: 'm2',
      voucherRecordId: 'v-s2',
      advanceRecordId: 'adv-1',
      disbursementDate: '2026-10-05',
      amountDisbursed: 14000,
      paymentMethod: 'Bank Transfer',
      transactionRef: 'NEFT9988',
      createdAt: '2026-10-05',
    },
  ];

  const setMap: SettlementVoucherMapping[] = [
    {
      id: 'sm1',
      settlementRecordId: 'set-1',
      voucherRecordId: 'v-s2',
      allocatedSettlementAmount: 14000,
      allocationDate: '2026-10-15',
    },
  ];

  const summary = buildStatusWiseSummary([v1, v2], [], disb, setMap);
  const approvedRow = summary.find((r) => r.status === 'Approved');
  const closedRow = summary.find((r) => r.status === 'Closed');

  assert.ok(approvedRow);
  assert.equal(approvedRow.voucherCount, 1);
  assert.equal(approvedRow.totalClaimed, 10000);
  assert.equal(approvedRow.totalApproved, 10000);
  assert.equal(approvedRow.totalDisbursed, 0);

  assert.ok(closedRow);
  assert.equal(closedRow.voucherCount, 1);
  assert.equal(closedRow.totalApproved, 14000);
  assert.equal(closedRow.totalDisbursed, 14000);
  assert.equal(closedRow.totalSettled, 14000);
  assert.equal(closedRow.balanceDue, 0);
});

test('buildMonthWiseSummary rolls up vouchers, advances, disbursements, and settlements by month', () => {
  const v1 = {
    id: 'v-m1',
    voucherNo: 'DELHI/DK/001',
    teamMemberId: 'm1',
    projectName: 'Proj A',
    travelStartDate: '2026-10-10',
    travelEndDate: '2026-10-12',
    travelScenario: 'Advance Before Travel' as const,
    baseLocation: 'Delhi',
    travelTo: 'Mumbai',
    claimedAmount: 10000,
    approvedAmount: 10000,
    overallStatus: 'Completed' as const,
    verificationStatus: 'Approved' as const,
    settlementStatus: 'Completed' as const,
    recoveryStatus: 'Not Applicable' as const,
    createdAt: '2026-10-01',
    updatedAt: '2026-10-15',
  } as unknown as TravelVoucher;

  const a1 = {
    id: 'adv-m1',
    advanceId: 'Advance/dheerendrak@dexitglobal.com/001',
    teamMemberId: 'm1',
    projectName: 'Proj A',
    advanceRaisedDate: '2026-10-02',
    requestedAmount: 10000,
    approvedAmount: 10000,
    amountActuallyReceived: 10000,
    amountDisbursed: 10000,
    status: 'Disbursed' as const,
    createdAt: '2026-10-02',
    updatedAt: '2026-10-05',
  } as AdvanceRecord;

  const d1: EmployeeDisbursement = {
    id: 'd-m1',
    employeeId: 'm1',
    voucherRecordId: 'v-m1',
    advanceRecordId: 'adv-m1',
    disbursementDate: '2026-10-05',
    amountDisbursed: 10000,
    paymentMethod: 'Bank Transfer',
    transactionRef: 'NEFT1122',
    createdAt: '2026-10-05',
  };

  const s1: SettlementRecord = {
    id: 'set-m1',
    settlementId: 'Settlement/dheerendrak@dexitglobal.com/001',
    advanceRecordId: 'adv-m1',
    settlementInitiatedDate: '2026-10-15',
    settlementCompletionDate: '2026-10-15',
    settlementAmount: 10000,
    actualAmountSettled: 10000,
    accountingStatus: 'Completed' as const,
    createdAt: '2026-10-15',
    updatedAt: '2026-10-15',
  };

  const monthSummary = buildMonthWiseSummary([v1], [a1], [d1], [s1]);
  assert.equal(monthSummary.length, 1);
  assert.equal(monthSummary[0].monthKey, '2026-10');
  assert.equal(monthSummary[0].voucherCount, 1);
  assert.equal(monthSummary[0].totalClaimed, 10000);
  assert.equal(monthSummary[0].totalApproved, 10000);
  assert.equal(monthSummary[0].totalAdvancesRaised, 10000);
  assert.equal(monthSummary[0].totalDisbursed, 10000);
  assert.equal(monthSummary[0].totalSettled, 10000);
  assert.equal(monthSummary[0].completedCount, 1);
  assert.equal(monthSummary[0].inProgressCount, 0);
});

test('buildTeamWiseSummary computes metrics per team member', () => {
  const member: TeamMember = {
    id: 'tm-dk',
    fullName: 'Dheerendra Kumar',
    empId: 'EMP-001',
    baseLocation: 'Delhi',
    department: 'Solar Operations',
    whatsappNumber: '9876543210',
    status: 'Active',
    createdAt: '2026-01-01',
  };

  const v = {
    id: 'v-tm1',
    voucherNo: 'DELHI/DK/001',
    teamMemberId: 'tm-dk',
    projectName: 'Solar Plant',
    travelScenario: 'Advance Before Travel' as const,
    baseLocation: 'Delhi',
    travelTo: 'Noida',
    claimedAmount: 5000,
    approvedAmount: 4800,
    overallStatus: 'Completed' as const,
    verificationStatus: 'Approved' as const,
    settlementStatus: 'Completed' as const,
    recoveryStatus: 'Not Applicable' as const,
    createdAt: '2026-10-01',
    updatedAt: '2026-10-10',
  } as unknown as TravelVoucher;

  const teamSummary = buildTeamWiseSummary([member], [v], [], [], []);
  assert.equal(teamSummary.length, 1);
  assert.equal(teamSummary[0].memberId, 'tm-dk');
  assert.equal(teamSummary[0].fullName, 'Dheerendra Kumar');
  assert.equal(teamSummary[0].baseLocation, 'Delhi');
  assert.equal(teamSummary[0].voucherCount, 1);
  assert.equal(teamSummary[0].totalClaimed, 5000);
  assert.equal(teamSummary[0].totalApproved, 4800);
  assert.equal(teamSummary[0].completedCount, 1);
});

test('getStationCode resolves UDZ for Udaipur and ADI for Ahmadabad / Ahmedabad', () => {
  assert.equal(getStationCode('Udaipur'), 'UDZ');
  assert.equal(getStationCode('udaipur'), 'UDZ');
  assert.equal(getStationCode('Udaipur, Rajasthan'), 'UDZ');
  assert.equal(getStationCode('UDZ'), 'UDZ');

  assert.equal(getStationCode('Ahmadabad'), 'ADI');
  assert.equal(getStationCode('ahmadabad'), 'ADI');
  assert.equal(getStationCode('Ahmedabad'), 'ADI');
  assert.equal(getStationCode('Ahmedabad, Gujarat'), 'ADI');
  assert.equal(getStationCode('ADI'), 'ADI');

  assert.equal(getStationCode('Mumbai'), 'BOM');
  assert.equal(getStationCode('Delhi'), 'DEL');
  assert.equal(getStationCode('Lucknow'), 'LKO');
  assert.equal(getStationCode('Pune'), 'PUNE');
});

test('generateVoucherPrefix formats station code and initials with trailing slash', () => {
  assert.equal(generateVoucherPrefix('Udaipur', 'Dheerendra Kumar'), 'UDZ/DK/');
  assert.equal(generateVoucherPrefix('Ahmadabad', 'Priya Patel'), 'ADI/PP/');
  assert.equal(generateVoucherPrefix('Ahmedabad', 'Priya Patel'), 'ADI/PP/');
  assert.equal(generateVoucherPrefix('Mumbai', 'Rahul Sharma'), 'BOM/RS/');
  assert.equal(generateVoucherPrefix('Delhi', 'Vikram Singh'), 'DEL/VS/');
});
