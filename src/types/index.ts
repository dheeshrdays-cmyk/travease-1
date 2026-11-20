export type TravelScenario =
  | 'Travel Completed — Voucher Submitted Afterwards'
  | 'Advance Before Travel'
  | 'Direct Booking / Vendor Payment';

export type VoucherVerificationStatus =
  | 'Draft'
  | 'Awaiting Voucher'
  | 'Received'
  | 'Voucher Received'
  | 'Advance Raised'
  | 'Pending for Settlement'
  | 'Under Verification'
  | 'Correction Required'
  | 'Verified'
  | 'Approved';

export type VoucherSettlementStatus =
  | 'Not Initiated'
  | 'Advance Raised'
  | 'Advance Processing'
  | 'Pending for Settlement'
  | 'Settlement Pending'
  | 'Settlement Initiated'
  | 'Partially Settled'
  | 'Completed'
  | 'Closed'
  | 'Cancelled';

export type VoucherRecoveryStatus =
  | 'Not Applicable'
  | 'Eligible For Recovery'
  | 'Partially Recovered'
  | 'Fully Recovered';

export type VoucherOverallStatus =
  | 'Draft'
  | 'Travel Planned'
  | 'Travel In Progress'
  | 'Awaiting Voucher'
  | 'Received'
  | 'Voucher Received'
  | 'Advance Raised'
  | 'Approved'
  | 'Advance Raised'
  | 'Advance Approved'
  | 'Pending for Settlement'
  | 'Settlement Pending'
  | 'Under Verification'
  | 'Correction Required'
  | 'Verified'
  | 'Advance Processing'
  | 'Settlement Initiated'
  | 'Partially Settled'
  | 'Completed'
  | 'Closed'
  | 'Cancelled';

export interface TeamMember {
  id: string; // e.g. TM-101
  empId: string; // e.g. EMP-001
  fullName: string;
  whatsappNumber: string; // e.g. +91 98765 43210
  baseLocation: string; // e.g. Mumbai, Bengaluru, Delhi
  department: string;
  defaultProject?: string;
  status: 'Active' | 'Inactive';
  remarks?: string;
  createdAt: string;
}

export type ProjectStatus = 'Active' | 'Inactive';

export interface ProjectRecord {
  id: string; // e.g. PRJ-2026-001
  name: string; // Project Name (mandatory, unique)
  code?: string; // Project Code (optional, unique if provided)
  description?: string; // Location / Description (optional)
  status: ProjectStatus; // Active / Inactive
  createdAt: string;
  updatedAt?: string;
}

export interface VoucherAttachment {
  id: string;
  name: string;
  size?: string;
  type?: string;
  url?: string;
  uploadedAt: string;
}

export interface TravelVoucher {
  id: string; // Internal record ID, e.g. VCH-2026-001
  voucherNo: string; // Human-readable reference, e.g. V-2026-042
  teamMemberId: string;
  baseLocation: string;
  travelTo: string; // Destination
  projectName: string;
  travelStartDate: string; // YYYY-MM-DD
  travelEndDate: string; // YYYY-MM-DD
  travelScenario: TravelScenario;
  voucherReceivedDate?: string;
  voucherVerificationDate?: string;
  verifiedBy?: string;
  voucherApprovedDate?: string;
  claimedAmount: number;
  approvedAmount: number;
  expenseDescription: string;
  attachments: VoucherAttachment[];
  verificationStatus: VoucherVerificationStatus;
  settlementStatus: VoucherSettlementStatus;
  recoveryStatus: VoucherRecoveryStatus;
  overallStatus: VoucherOverallStatus;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export type AdvanceStatus =
  | 'Draft'
  | 'Raised'
  | 'Raised in Accounting Software'
  | 'Awaiting Approval'
  | 'Approved'
  | 'Disbursed'
  | 'Awaiting Funds'
  | 'Partially Received'
  | 'Funds Received'
  | 'Partially Disbursed'
  | 'Fully Disbursed'
  | 'Closed'
  | 'Cancelled';

export interface AdvanceRecord {
  id: string; // Internal Advance Record ID, e.g. ADV-REC-001
  advanceId: string; // From accounting software, e.g. ADV/26/0412 (INTERNAL ONLY - NEVER SHOW IN WHATSAPP)
  teamMemberId?: string; // Optional: Employee / Team member for whom advance is raised
  projectName?: string; // Optional: Project associated with the advance
  advanceRaisedDate: string;
  requestedAmount: number;
  approvalDate?: string;
  approvedAmount?: number;
  fundsReceivedDate?: string;
  amountActuallyReceived: number;
  bankCashReceiptRef?: string;
  disbursementDate?: string;
  amountDisbursed: number; // Sum of linked disbursements
  disbursementRef?: string;
  status: AdvanceStatus;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdvanceVoucherMapping {
  id: string;
  advanceRecordId: string;
  voucherRecordId: string;
  allocatedAdvanceAmount: number;
  allocationDate: string;
  remarks?: string;
}

export type DisbursementPaymentMethod = 'Bank Transfer' | 'UPI' | 'Cash' | 'Other';

export interface EmployeeDisbursement {
  id: string; // DISB-001
  employeeId: string; // teamMemberId
  voucherRecordId: string; // Primary voucher ID or first voucher
  advanceRecordId: string;
  disbursementDate: string;
  amountDisbursed: number;
  paymentMethod: DisbursementPaymentMethod;
  transactionRef: string;
  remarks?: string;
  supportingAttachment?: VoucherAttachment;
  createdAt: string;
}

export type SettlementAccountingStatus =
  | 'Not Initiated'
  | 'Initiated in Accounting Software'
  | 'Pending Processing'
  | 'Partially Completed'
  | 'Completed'
  | 'Closed'
  | 'Rejected / Correction Required'
  | 'Cancelled';

export interface SettlementRecord {
  id: string; // Internal Settlement Record ID, e.g. SET-REC-001
  settlementId: string; // Settlement ID from accounting software, e.g. SET/26/0890
  advanceRecordId?: string; // Mapped Advance Record ID (e.g. ADV-REC-001)
  advanceId?: string; // Mapped Advance ID from accounting software (e.g. ADV/26/0114)
  settlementInitiatedDate: string;
  settlementAmount: number;
  settlementType?: string; // e.g. Final Settlement, Advance Adjustment, Balance Reimbursement
  accountingStatus: SettlementAccountingStatus;
  settlementCompletionDate?: string;
  actualAmountSettled?: number;
  accountingReference?: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SettlementVoucherMapping {
  id: string;
  settlementRecordId: string;
  voucherRecordId: string;
  allocatedSettlementAmount: number;
  allocationDate: string;
  remarks?: string;
}

export type PaymentSource = 'Personal Funds' | 'Company Funds' | 'Employee Personal Funds';
export type ExpenseCategory =
  | 'Flight'
  | 'Train'
  | 'Hotel'
  | 'Taxi / Cab'
  | 'Bus'
  | 'Fuel'
  | 'Meals'
  | 'Client Entertainment'
  | 'Conference / Entry Fee'
  | 'Miscellaneous';

export type VendorPaymentRecoveryStatus =
  | 'Not Applicable'
  | 'Not Requested'
  | 'Recovery Requested'
  | 'Partially Recovered'
  | 'Fully Recovered';

export interface VendorPaymentRecord {
  id: string; // PAY-001
  voucherRecordId: string;
  employeeId: string; // Traveller
  projectName: string;
  vendorName: string; // e.g. IRCTC, MakeMyTrip, IndiGo, Uber, Taj Hotel
  expenseCategory: ExpenseCategory;
  bookingRef?: string; // PNR, Ticket No, Booking ID
  bookingDate?: string;
  travelDate: string;
  vendorInvoiceNo?: string;
  billDate?: string;
  paymentDate: string;
  amountPaid: number;
  paymentSource: PaymentSource; // Administrator's Personal Funds vs Company Funds
  paymentMethod: string; // Credit Card, UPI, Net Banking, Cash
  transactionRef?: string;
  attachment?: VoucherAttachment;
  recoveryStatus: VendorPaymentRecoveryStatus;
  remarks?: string;
  createdAt: string;
}

export type RecoveryStatus =
  | 'Not Requested'
  | 'Draft'
  | 'Submitted to Accounts'
  | 'Awaiting Approval'
  | 'Approved'
  | 'Partially Received'
  | 'Partially Recovered'
  | 'Fully Recovered'
  | 'Rejected / Correction Required';

export interface AccountsRecoveryRequest {
  id: string; // Internal Recovery Record ID, e.g. REC-001
  recoveryRef: string; // Human reference, e.g. REC/REQ/2026/01
  requestDate: string;
  requestedAmount: number;
  accountsSubmissionRef?: string;
  approvalDate?: string;
  approvedAmount?: number;
  amountReceived: number;
  firstReceiptDate?: string;
  latestReceiptDate?: string;
  outstandingAmount: number;
  receiptTransactionRef?: string;
  status: RecoveryStatus;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecoveryPaymentMapping {
  id: string;
  recoveryRecordId: string;
  vendorPaymentRecordId: string;
  voucherRecordId: string;
  amountRequestedForRecovery: number;
  amountApprovedForRecovery?: number;
  amountRecovered: number;
  outstandingAmount: number;
  allocationDate?: string;
  remarks?: string;
}

export type NotificationType =
  | 'Voucher Approved'
  | 'Approved'
  | 'Advance Raised'
  | 'Advance Approved'
  | 'Amount Disbursed'
  | 'Pending for Settlement'
  | 'Settlement Initiated'
  | 'Closed';

export type NotificationStatus =
  | 'Not Initiated'
  | 'Opened in WhatsApp'
  | 'Manually Confirmed Sent'
  | 'Failed to Open';

export interface NotificationLog {
  id: string; // NOTIF-001
  employeeId: string;
  voucherRecordId: string;
  notificationType: NotificationType;
  recipientNumber: string;
  messageContent: string;
  initiatedTimestamp: string;
  status: NotificationStatus;
  manuallyConfirmedSentDateTime?: string;
  remarks?: string;
}

export type ActivityType =
  | 'Voucher Created'
  | 'Travel Started'
  | 'Voucher Received'
  | 'Voucher Verified'
  | 'Voucher Approved'
  | 'Advance Raised'
  | 'Advance Approved'
  | 'Funds Received'
  | 'Employee Disbursement Made'
  | 'Vendor Payment Made'
  | 'Settlement Initiated'
  | 'Settlement Completed'
  | 'Recovery Request Submitted'
  | 'Recovery Approved'
  | 'Recovery Received'
  | 'WhatsApp Notification Initiated'
  | 'WhatsApp Message Confirmed Sent'
  | 'Voucher Closed'
  | 'Advance Updated'
  | 'Voucher Mapped to Advance'
  | 'Date Corrected'
  | 'Record Updated';

export interface ActivityLog {
  id: string;
  voucherRecordId?: string;
  relatedRecordId?: string; // advanceId, settlementId, paymentId, etc.
  activityType: ActivityType;
  activityDate: string; // Effective event date
  createdAt: string; // System record timestamp
  amount?: number;
  recordedBy: string;
  remarks?: string;
  attachment?: VoucherAttachment;
}

export interface VoucherFinancialSummary {
  voucherId: string;
  claimedAmount: number;
  approvedAmount: number;
  companyPaidDirectExpenses: number;
  adminPersonalPaidExpenses: number;
  employeePersonalPaidExpenses: number;
  totalAdvanceAllocated: number;
  totalEmployeeDisbursed: number;
  totalSettlementAllocated: number;
  adminRecoveredAmount: number;
  adminOutstandingRecovery: number;
  employeeRefundDue: number; // If advance disbursed to employee exceeds their approved portion
  employeeReimbursementDue: number; // If employee spent own money or didn't get enough advance
  netSettlementPending: number;
}
