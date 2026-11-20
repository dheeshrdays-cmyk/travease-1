import React, { useState } from 'react';
import {
  X,
  Plane,
  Wallet,
  ArrowDownToLine,
  RefreshCw,
  CreditCard,
  Send,
  History,
  MessageSquare,
  IndianRupee,
  Calendar,
  User,
  MapPin,
  CheckCircle,
  AlertCircle,
  FileText,
  Clock,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  formatINR,
  formatIndianDate,
  calcVoucherFinancialSummary,
} from '../../utils/calculations';
import type { NotificationType } from '../../types';

interface VoucherDetailModalProps {
  voucherId: string;
  onClose: () => void;
  onEdit: () => void;
}

export const VoucherDetailModal: React.FC<VoucherDetailModalProps> = ({
  voucherId,
  onClose,
  onEdit,
}) => {
  const {
    vouchers,
    teamMembers,
    advances,
    advanceVoucherMappings,
    disbursements,
    settlements,
    settlementVoucherMappings,
    vendorPayments,
    recoveries,
    recoveryPaymentMappings,
    notifications,
    activities,
    openWhatsAppModal,
  } = useApp();

  const [activeTab, setActiveTab] = useState<
    'details' | 'advances' | 'disbursements' | 'settlements' | 'vendorPayments' | 'recoveries' | 'notifications' | 'timeline'
  >('details');

  const voucher = vouchers.find((v) => v.id === voucherId);
  if (!voucher) return null;

  const member = teamMembers.find((m) => m.id === voucher.teamMemberId);

  // Financial summary
  const summary = calcVoucherFinancialSummary(
    voucher,
    advanceVoucherMappings,
    disbursements,
    settlementVoucherMappings,
    vendorPayments,
    recoveryPaymentMappings
  );

  // Linked Advances
  const linkedAdvanceMappings = advanceVoucherMappings.filter(
    (m) => m.voucherRecordId === voucher.id
  );
  const linkedAdvances = advances.filter((adv) =>
    linkedAdvanceMappings.some((m) => m.advanceRecordId === adv.id)
  );

  // Linked Disbursements
  const linkedDisbursements = disbursements.filter(
    (d) => d.voucherRecordId === voucher.id
  );

  // Linked Settlements
  const linkedSettlementMappings = settlementVoucherMappings.filter(
    (m) => m.voucherRecordId === voucher.id
  );
  const linkedSettlements = settlements.filter((set) =>
    linkedSettlementMappings.some((m) => m.settlementRecordId === set.id)
  );

  // Linked Vendor Payments
  const linkedPayments = vendorPayments.filter(
    (p) => p.voucherRecordId === voucher.id
  );

  // Linked Recoveries
  const linkedRecoveryMappings = recoveryPaymentMappings.filter(
    (m) => m.voucherRecordId === voucher.id
  );
  const linkedRecoveries = recoveries.filter((rec) =>
    linkedRecoveryMappings.some((m) => m.recoveryRecordId === rec.id)
  );

  // Notifications
  const linkedNotifications = notifications.filter(
    (n) => n.voucherRecordId === voucher.id
  );

  // Activities timeline
  const linkedActivities = activities.filter(
    (a) => a.voucherRecordId === voucher.id
  );

  const handleNotify = (type: NotificationType) => {
    if (!member) return;
    openWhatsAppModal({
      type,
      employeeName: member.fullName,
      employeePhone: member.whatsappNumber,
      employeeId: member.id,
      voucherRecordId: voucher.id,
      voucherNo: voucher.voucherNo,
      projectName: voucher.projectName,
      startDate: voucher.travelStartDate,
      endDate: voucher.travelEndDate,
      advanceAmount: summary.totalAdvanceAllocated || voucher.approvedAmount || voucher.claimedAmount,
      disbursedAmount: summary.totalEmployeeDisbursed || voucher.approvedAmount,
      disbursementDate: linkedDisbursements[0]?.disbursementDate || new Date().toISOString().split('T')[0],
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/75 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden">
        {/* Top Header Card */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
              <Plane className="w-5 h-5 -rotate-45" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  {voucher.voucherNo}
                </h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {voucher.id}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded font-semibold ${
                    voucher.overallStatus === 'Received'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      : voucher.overallStatus === 'Advance Raised'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : voucher.overallStatus === 'Pending for Settlement'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : voucher.overallStatus === 'Settlement Initiated'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : voucher.overallStatus === 'Completed'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  }`}
                >
                  {voucher.overallStatus}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {member?.fullName} ({member?.empId}) · {voucher.travelTo} · {voucher.projectName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors min-h-[40px]"
            >
              Edit Master
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 min-h-[40px] min-w-[40px] flex items-center justify-center"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action & Notification Banner */}
        <div className="bg-slate-100 px-5 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-700">
            <span className="font-semibold text-slate-500 uppercase text-[10px]">Scenario:</span>
            <span className="font-medium bg-white px-2 py-0.5 rounded border border-slate-200">
              {voucher.travelScenario}
            </span>
          </div>

          {/* Quick WhatsApp Notification Dispatchers */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500 mr-1 hidden sm:inline">
              WhatsApp:
            </span>
            <button
              type="button"
              onClick={() => handleNotify('Voucher Approved')}
              className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-md flex items-center gap-1 transition-colors min-h-[36px]"
            >
              <MessageSquare className="w-3 h-3 text-emerald-600" />
              <span>Notify Approval</span>
            </button>
            <button
              type="button"
              onClick={() => handleNotify('Advance Raised')}
              className="px-2.5 py-1 text-[11px] font-semibold bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 rounded-md flex items-center gap-1 transition-colors min-h-[36px]"
            >
              <MessageSquare className="w-3 h-3 text-sky-600" />
              <span>Notify Advance</span>
            </button>
            <button
              type="button"
              onClick={() => handleNotify('Amount Disbursed')}
              className="px-2.5 py-1 text-[11px] font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-300 rounded-md flex items-center gap-1 transition-colors min-h-[36px]"
            >
              <MessageSquare className="w-3 h-3 text-indigo-600" />
              <span>Notify Disbursed</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-slate-200 bg-white px-5 flex items-center gap-1 overflow-x-auto scrollbar-none">
          {[
            { id: 'details', label: 'Summary & Safeguards' },
            { id: 'advances', label: `Advances (${linkedAdvances.length})` },
            { id: 'disbursements', label: `Disbursements (${linkedDisbursements.length})` },
            { id: 'settlements', label: `Settlements (${linkedSettlements.length})` },
            { id: 'vendorPayments', label: `Vendor Payments (${linkedPayments.length})` },
            { id: 'recoveries', label: `Accounts Recovery (${linkedRecoveries.length})` },
            { id: 'notifications', label: `Notifications (${linkedNotifications.length})` },
            { id: 'timeline', label: `Activity History (${linkedActivities.length})` },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors min-h-[44px] ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Modal Content Panels */}
        <div className="flex-1 overflow-y-auto p-5 bg-slate-50/50">
          
          {/* TAB 1: SUMMARY & SAFEGUARDS */}
          {activeTab === 'details' && (
            <div className="space-y-5">
              {/* Automated Safeguards Grid */}
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <IndianRupee className="w-4 h-4 text-indigo-600" />
                  <span>Automated Financial Calculation Safeguards (Section 14)</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-500 font-medium block">Claimed Amount</span>
                    <span className="text-base font-bold text-slate-900 font-mono">
                      {formatINR(summary.claimedAmount)}
                    </span>
                  </div>
                  <div className="p-3 bg-indigo-50/60 rounded-lg border border-indigo-100">
                    <span className="text-[10px] text-indigo-700 font-medium block">Approved Amount</span>
                    <span className="text-base font-bold text-indigo-900 font-mono">
                      {formatINR(summary.approvedAmount)}
                    </span>
                  </div>
                  <div className="p-3 bg-sky-50/60 rounded-lg border border-sky-100">
                    <span className="text-[10px] text-sky-700 font-medium block">Company-Paid Expenses</span>
                    <span className="text-base font-bold text-sky-900 font-mono">
                      {formatINR(summary.companyPaidDirectExpenses)}
                    </span>
                  </div>
                  <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-100">
                    <span className="text-[10px] text-amber-700 font-medium block">Admin Personal Expenses</span>
                    <span className="text-base font-bold text-amber-900 font-mono">
                      {formatINR(summary.adminPersonalPaidExpenses)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-500 font-medium block">Advance Allocated</span>
                    <span className="text-base font-bold text-slate-800 font-mono">
                      {formatINR(summary.totalAdvanceAllocated)}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-500 font-medium block">Disbursed to Employee</span>
                    <span className="text-base font-bold text-slate-800 font-mono">
                      {formatINR(summary.totalEmployeeDisbursed)}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-500 font-medium block">Settlement Allocated</span>
                    <span className="text-base font-bold text-slate-800 font-mono">
                      {formatINR(summary.totalSettlementAllocated)}
                    </span>
                  </div>
                  <div className="p-3 bg-violet-50/60 rounded-lg border border-violet-100">
                    <span className="text-[10px] text-violet-700 font-medium block">Admin Outstanding Recovery</span>
                    <span className="text-base font-bold text-violet-900 font-mono">
                      {formatINR(summary.adminOutstandingRecovery)}
                    </span>
                  </div>
                </div>

                {/* Critical Distinctions Banner */}
                <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {summary.employeeRefundDue > 0 ? (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <div>
                        <span className="font-bold text-rose-900 block">Employee Refund Due to Company:</span>
                        <span className="font-mono font-bold text-rose-800">{formatINR(summary.employeeRefundDue)}</span>
                        <span className="text-[10px] text-rose-600 block">Advance disbursed exceeded employee&apos;s verified expenses</span>
                      </div>
                    </div>
                  ) : summary.employeeReimbursementDue > 0 ? (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <span className="font-bold text-emerald-900 block">Company Reimburses Employee:</span>
                        <span className="font-mono font-bold text-emerald-800">{formatINR(summary.employeeReimbursementDue)}</span>
                        <span className="text-[10px] text-emerald-600 block">Out-of-pocket claim approved beyond advance</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600">
                      <span className="font-semibold block">Employee Balances Settled:</span>
                      <span className="text-[11px]">Disbursement matches approved employee expenditure</span>
                    </div>
                  )}

                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
                    <span className="font-semibold block">Net Accounting Settlement Pending:</span>
                    <span className="font-mono font-bold text-slate-900">{formatINR(summary.netSettlementPending)}</span>
                    <span className="text-[10px] text-slate-500 block">Approved amount minus settlement transactions entered</span>
                  </div>
                </div>
              </div>

              {/* Voucher Record Details */}
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Voucher Master Record Information
                </h3>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Travel Period</span>
                    <span className="font-medium text-slate-800">
                      {formatIndianDate(voucher.travelStartDate)} to {formatIndianDate(voucher.travelEndDate)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Route</span>
                    <span className="font-medium text-slate-800">
                      {voucher.baseLocation} ➔ {voucher.travelTo}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Project</span>
                    <span className="font-medium text-slate-800">{voucher.projectName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Verification</span>
                    <span className="font-medium text-slate-800">{voucher.verificationStatus}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Received Date</span>
                    <span className="font-medium text-slate-800">{formatIndianDate(voucher.voucherReceivedDate)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Verification Date</span>
                    <span className="font-medium text-slate-800">{formatIndianDate(voucher.voucherVerificationDate)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Verified By</span>
                    <span className="font-medium text-slate-800">{voucher.verifiedBy || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Approved Date</span>
                    <span className="font-medium text-slate-800">{formatIndianDate(voucher.voucherApprovedDate)}</span>
                  </div>
                </div>

                {voucher.expenseDescription && (
                  <div className="pt-2 border-t border-slate-100 text-xs">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-0.5">
                      Expense Description
                    </span>
                    <p className="text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      {voucher.expenseDescription}
                    </p>
                  </div>
                )}

                {voucher.remarks && (
                  <div className="pt-1 text-xs">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-0.5">
                      Internal Admin Remarks
                    </span>
                    <p className="text-slate-600 italic bg-amber-50/50 p-2 rounded-lg border border-amber-100">
                      {voucher.remarks}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: LINKED ADVANCES */}
          {activeTab === 'advances' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Advances Allocated to This Voucher
                </h3>
                <span className="text-xs text-slate-500">
                  Total Allocated: <strong className="font-mono text-slate-900">{formatINR(summary.totalAdvanceAllocated)}</strong>
                </span>
              </div>

              {linkedAdvances.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-xs">
                  No advances linked to this voucher. (Some vouchers operate post-travel without advance).
                </div>
              ) : (
                <div className="space-y-3">
                  {linkedAdvances.map((adv) => {
                    const mapping = linkedAdvanceMappings.find((m) => m.advanceRecordId === adv.id);
                    return (
                      <div key={adv.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                              {adv.advanceId}
                            </span>
                            <span className="text-xs text-slate-500 ml-2 font-mono">
                              ({adv.id})
                            </span>
                          </div>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {adv.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs py-2 border-y border-slate-100 my-2">
                          <div>
                            <span className="text-slate-400 text-[10px] uppercase block">Raised Date</span>
                            <span className="font-medium text-slate-800">{formatIndianDate(adv.advanceRaisedDate)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] uppercase block">Total Advance Received</span>
                            <span className="font-mono font-semibold text-slate-800">{formatINR(adv.amountActuallyReceived)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] uppercase block">Allocated to This Voucher</span>
                            <span className="font-mono font-bold text-indigo-600">{formatINR(mapping?.allocatedAdvanceAmount)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] uppercase block">Allocation Date</span>
                            <span className="font-medium text-slate-800">{formatIndianDate(mapping?.allocationDate)}</span>
                          </div>
                        </div>

                        {mapping?.remarks && (
                          <div className="text-[11px] text-slate-500 italic mt-1">
                            Allocation Note: {mapping.remarks}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DISBURSEMENTS MADE */}
          {activeTab === 'disbursements' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Money Actually Paid to Team Member
                </h3>
                <span className="text-xs text-slate-500">
                  Total Disbursed: <strong className="font-mono text-slate-900">{formatINR(summary.totalEmployeeDisbursed)}</strong>
                </span>
              </div>

              {linkedDisbursements.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-xs">
                  No disbursements recorded against this voucher yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {linkedDisbursements.map((d) => (
                    <div key={d.id} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-slate-900 font-mono text-sm">{formatINR(d.amountDisbursed)}</span>
                          <span className="px-2 py-0.5 rounded bg-slate-100 font-medium text-slate-700">{d.paymentMethod}</span>
                          <span className="text-[11px] text-slate-400 font-mono">{d.transactionRef}</span>
                        </div>
                        <div className="text-slate-500 text-[11px]">
                          Disbursed on {formatIndianDate(d.disbursementDate)} · ID: {d.id}
                        </div>
                        {d.remarks && <div className="text-slate-600 text-[11px] italic mt-0.5">{d.remarks}</div>}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleNotify('Amount Disbursed')}
                        className="px-2.5 py-1.5 text-[11px] font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg flex items-center gap-1 min-h-[36px]"
                      >
                        <MessageSquare className="w-3 h-3 text-indigo-600" />
                        <span>Send WhatsApp</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SETTLEMENTS */}
          {activeTab === 'settlements' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Accounting Software Settlements Linked
                </h3>
                <span className="text-xs text-slate-500">
                  Total Settled: <strong className="font-mono text-slate-900">{formatINR(summary.totalSettlementAllocated)}</strong>
                </span>
              </div>

              {linkedSettlements.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-xs">
                  No accounting settlements recorded for this voucher yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {linkedSettlements.map((s) => {
                    const mapping = linkedSettlementMappings.find((m) => m.settlementRecordId === s.id);
                    return (
                      <div key={s.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded">
                              {s.settlementId}
                            </span>
                            <span className="text-xs text-slate-500">({s.settlementType || 'Settlement'})</span>
                          </div>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {s.accountingStatus}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs py-2 border-y border-slate-100 my-2">
                          <div>
                            <span className="text-slate-400 text-[10px] uppercase block">Initiated Date</span>
                            <span className="font-medium text-slate-800">{formatIndianDate(s.settlementInitiatedDate)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] uppercase block">Completion Date</span>
                            <span className="font-medium text-slate-800">{formatIndianDate(s.settlementCompletionDate)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] uppercase block">Allocated to Voucher</span>
                            <span className="font-mono font-bold text-sky-700">{formatINR(mapping?.allocatedSettlementAmount)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] uppercase block">Accounting Ref</span>
                            <span className="font-mono text-slate-700">{s.accountingReference || '—'}</span>
                          </div>
                        </div>

                        {s.remarks && (
                          <div className="text-[11px] text-slate-500 italic">
                            Accounting Note: {s.remarks}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: VENDOR PAYMENTS */}
          {activeTab === 'vendorPayments' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Direct Vendor Bookings & Personal Payments
                </h3>
                <span className="text-xs text-slate-500">
                  Personal Outstanding: <strong className="font-mono text-amber-700">{formatINR(summary.adminOutstandingRecovery)}</strong>
                </span>
              </div>

              {linkedPayments.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-xs">
                  No vendor payments linked to this voucher.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {linkedPayments.map((p) => {
                    const isPersonal = p.paymentSource === 'Personal Funds';
                    return (
                      <div key={p.id} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs text-xs">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{p.vendorName}</span>
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[11px]">
                              {p.expenseCategory}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded font-semibold text-[11px] ${
                              isPersonal ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-sky-800'
                            }`}>
                              {p.paymentSource}
                            </span>
                            <span className="font-mono font-bold text-slate-900 text-sm">
                              {formatINR(p.amountPaid)}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600 py-1.5 border-t border-slate-100">
                          <div>Booking Ref: <strong className="font-mono">{p.bookingRef || '—'}</strong></div>
                          <div>Paid On: <strong>{formatIndianDate(p.paymentDate)}</strong></div>
                          <div>Method: <strong>{p.paymentMethod}</strong></div>
                          <div>Recovery: <strong className="text-slate-800">{p.recoveryStatus}</strong></div>
                        </div>

                        {p.remarks && (
                          <div className="text-[11px] text-slate-500 italic mt-1">
                            Note: {p.remarks}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: ACCOUNTS RECOVERY */}
          {activeTab === 'recoveries' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Combined Accounts Recovery Requests
                </h3>
              </div>

              {linkedRecoveries.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-xs">
                  No personal payments under combined recovery requests for this voucher.
                </div>
              ) : (
                <div className="space-y-3">
                  {linkedRecoveries.map((r) => {
                    const mappings = linkedRecoveryMappings.filter((m) => m.recoveryRecordId === r.id);
                    const voucherRequested = mappings.reduce((sum, m) => sum + m.amountRequestedForRecovery, 0);
                    const voucherRecovered = mappings.reduce((sum, m) => sum + m.amountRecovered, 0);

                    return (
                      <div key={r.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-xs">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-violet-800 bg-violet-50 px-2 py-0.5 rounded">
                              {r.recoveryRef}
                            </span>
                            <span className="text-slate-500">Submitted: {formatIndianDate(r.requestDate)}</span>
                          </div>
                          <span className="font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                            {r.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-2 border-y border-slate-100 my-2">
                          <div>
                            <span className="text-slate-400 text-[10px] uppercase block">This Voucher Claim</span>
                            <span className="font-mono font-bold text-slate-900">{formatINR(voucherRequested)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] uppercase block">Actually Recovered</span>
                            <span className="font-mono font-bold text-emerald-700">{formatINR(voucherRecovered)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] uppercase block">Outstanding</span>
                            <span className="font-mono font-bold text-amber-700">{formatINR(voucherRequested - voucherRecovered)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] uppercase block">Accounts Ref</span>
                            <span className="font-mono text-slate-700">{r.accountsSubmissionRef || '—'}</span>
                          </div>
                        </div>

                        {r.remarks && <div className="text-[11px] text-slate-500 italic">{r.remarks}</div>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 7: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  WhatsApp Notification History
                </h3>
              </div>

              {linkedNotifications.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-xs">
                  No notifications recorded yet for this voucher.
                </div>
              ) : (
                <div className="space-y-3">
                  {linkedNotifications.map((notif) => (
                    <div key={notif.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{notif.notificationType}</span>
                          <span className="text-slate-400 font-mono text-[11px]">+{notif.recipientNumber}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded font-semibold text-[11px] ${
                          notif.status === 'Manually Confirmed Sent'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {notif.status}
                        </span>
                      </div>

                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-slate-700 text-[11px] leading-relaxed">
                        {notif.messageContent}
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>Initiated: {new Date(notif.initiatedTimestamp).toLocaleString('en-IN')}</span>
                        {notif.manuallyConfirmedSentDateTime && (
                          <span className="text-emerald-700 font-semibold">
                            Sent Confirmed: {new Date(notif.manuallyConfirmedSentDateTime).toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 8: ACTIVITY TIMELINE */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Chronological Audit History
              </h3>

              {linkedActivities.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-xs">
                  No activity history logged yet.
                </div>
              ) : (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {linkedActivities.map((act) => (
                    <div key={act.id} className="relative text-xs">
                      <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-indigo-600 ring-4 ring-white" />
                      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-900">{act.activityType}</span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {formatIndianDate(act.activityDate)}
                          </span>
                        </div>
                        {act.remarks && <p className="text-slate-600 text-[11px] leading-relaxed">{act.remarks}</p>}
                        {act.amount !== undefined && act.amount > 0 && (
                          <div className="mt-1 font-mono font-semibold text-indigo-600 text-[11px]">
                            Transaction Amount: {formatINR(act.amount)}
                          </div>
                        )}
                        <div className="mt-1 text-[10px] text-slate-400">
                          Recorded by {act.recordedBy} at {new Date(act.createdAt).toLocaleTimeString('en-IN')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-white flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-mono">
            Voucher ID: {voucher.id}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg min-h-[44px]"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
