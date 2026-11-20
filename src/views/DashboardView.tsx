import React from 'react';
import {
  Plane,
  Wallet,
  ArrowDownToLine,
  RefreshCw,
  CreditCard,
  Send,
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
  IndianRupee,
  Plus,
  ArrowUpRight,
  TrendingUp,
  History,
  FileSpreadsheet,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatINR, formatIndianDate, calcAdvanceFundsAvailable } from '../utils/calculations';
import type { NavigationTab } from '../context/AppContext';
import { ExpenseDistributionChart } from '../components/dashboard/ExpenseDistributionChart';

interface DashboardViewProps {
  onOpenQuickAction: (action: 'voucher' | 'advance' | 'settlement' | 'disbursement' | 'payment' | 'recovery') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onOpenQuickAction }) => {
  const {
    vouchers,
    advances,
    disbursements,
    settlements,
    vendorPayments,
    recoveries,
    activities,
    teamMembers,
    setActiveTab,
    setGlobalFilter,
    setSelectedVoucherId,
  } = useApp();

  // 1. Total Active Vouchers (not completed or cancelled)
  const activeVouchers = vouchers.filter(
    (v) => v.overallStatus !== 'Completed' && v.overallStatus !== 'Cancelled'
  );

  // 2. Vouchers Awaiting Verification
  const vouchersAwaitingVerification = vouchers.filter(
    (v) => v.verificationStatus === 'Awaiting Voucher' || v.verificationStatus === 'Voucher Received' || v.verificationStatus === 'Under Verification'
  );

  // 3. Vouchers Awaiting Approval
  const vouchersAwaitingApproval = vouchers.filter(
    (v) => v.verificationStatus === 'Verified' || (v.verificationStatus !== 'Approved' && v.overallStatus === 'Under Verification')
  );

  // 4. Advances Awaiting Approval
  const advancesAwaitingApproval = advances.filter(
    (a) => a.status === 'Raised in Accounting Software' || a.status === 'Awaiting Approval'
  );

  // 5. Advances Awaiting Funds
  const advancesAwaitingFunds = advances.filter(
    (a) => a.status === 'Approved' || a.status === 'Awaiting Funds' || (a.approvedAmount && a.amountActuallyReceived === 0)
  );

  // 6. Funds Received but Not Fully Disbursed
  const advancesPartiallyDisbursed = advances.filter((a) => {
    const available = calcAdvanceFundsAvailable(a, disbursements);
    return available > 0 && a.amountActuallyReceived > 0;
  });

  // 7. Vouchers Awaiting Settlement
  const vouchersAwaitingSettlement = vouchers.filter(
    (v) => v.overallStatus === 'Settlement Pending' || (v.verificationStatus === 'Approved' && v.settlementStatus !== 'Completed')
  );

  // 8. Settlements Pending Completion
  const settlementsPendingCompletion = settlements.filter(
    (s) => s.accountingStatus !== 'Completed' && s.accountingStatus !== 'Cancelled'
  );

  // 9. Personal Vendor Payments Outstanding for Recovery
  const personalPaymentsOutstanding = vendorPayments.filter(
    (p) => p.paymentSource === 'Personal Funds' && p.recoveryStatus !== 'Fully Recovered'
  );

  // 10. Recovery Requests Awaiting Approval
  const recoveryRequestsAwaitingApproval = recoveries.filter(
    (r) => r.status === 'Submitted to Accounts' || r.status === 'Awaiting Approval'
  );

  // 11. Approved Recoveries Awaiting Receipt
  const approvedRecoveriesAwaitingReceipt = recoveries.filter(
    (r) => r.status === 'Approved' || (r.status === 'Partially Received' && r.outstandingAmount > 0)
  );

  // 12. Total Outstanding Personal Recovery (₹)
  const totalOutstandingPersonalRecoveryAmount = recoveries
    .reduce((sum, r) => sum + (r.outstandingAmount || 0), 0);

  // 13. Monthly Travel Expenses (Current month total approved + direct payments)
  const totalApprovedClaimsAmount = vouchers.reduce(
    (sum, v) => sum + (v.approvedAmount || 0),
    0
  );

  const totalDirectCompanyPayments = vendorPayments
    .filter((p) => p.paymentSource === 'Company Funds')
    .reduce((sum, p) => sum + p.amountPaid, 0);

  const monthlyTravelExpensesAmount = totalApprovedClaimsAmount + totalDirectCompanyPayments;

  // Navigate to filtered view helper
  const navigateWithFilter = (tab: NavigationTab, filterUpdates: { status?: string; search?: string }) => {
    setGlobalFilter((prev) => ({
      ...prev,
      ...filterUpdates,
    }));
    setActiveTab(tab);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner & Quick Actions */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Travel Operations Control Center
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Administering 5 team members · 3 distinct travel scenarios · Zero duplicate transactions
            </p>
          </div>

          {/* Quick Action Button Strip: Raise Advance, Add Voucher, Raise Settlement */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => onOpenQuickAction('advance')}
              className="px-3.5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg shadow-sm transition-all flex items-center gap-1.5 min-h-[44px]"
            >
              <Wallet className="w-4 h-4" />
              <span>Raise Advance</span>
            </button>
            <button
              onClick={() => onOpenQuickAction('voucher')}
              className="px-3.5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-lg shadow-sm transition-all flex items-center gap-1.5 min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              <span>Add Voucher</span>
            </button>
            <button
              onClick={() => onOpenQuickAction('settlement')}
              className="px-3.5 py-2 text-xs font-semibold bg-sky-600 hover:bg-sky-700 active:scale-95 text-white rounded-lg shadow-sm transition-all flex items-center gap-1.5 min-h-[44px]"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Raise Settlement</span>
            </button>
            <button
              onClick={() => onOpenQuickAction('disbursement')}
              className="px-3 py-2 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg shadow-xs transition-all flex items-center gap-1.5 min-h-[44px]"
            >
              <ArrowDownToLine className="w-3.5 h-3.5 text-sky-600" />
              <span>Disburse</span>
            </button>
            <button
              onClick={() => onOpenQuickAction('payment')}
              className="px-3 py-2 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg shadow-xs transition-all flex items-center gap-1.5 min-h-[44px]"
            >
              <CreditCard className="w-3.5 h-3.5 text-amber-600" />
              <span>Vendor Payment</span>
            </button>
            <button
              onClick={() => onOpenQuickAction('recovery')}
              className="px-3 py-2 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg shadow-xs transition-all flex items-center gap-1.5 min-h-[44px]"
            >
              <Send className="w-3.5 h-3.5 text-violet-600" />
              <span>Accounts Recovery</span>
            </button>
            </div>
          </div>
        </div>

      {/* Primary Workflow Actions Grid (Raise Advance · Add Voucher · Raise Settlement) */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 text-white shadow-md border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                Primary Travel Operations Workflow
              </span>
              <span className="text-[10px] bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 px-2 py-0.5 rounded-full font-mono">
                Step-by-Step
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Every settlement mapped with Advance ID · Complete reconciliation & zero duplicate records
            </p>
          </div>
          <button
            onClick={() => setActiveTab('reports')}
            className="px-3 py-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 active:scale-95 text-white border border-white/20 rounded-lg flex items-center gap-1.5 transition-all self-start sm:self-auto min-h-[36px]"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-300" />
            <span>Complete Lifecycle Report</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Step 1: Raise Advance */}
          <div className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 transition-all flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
                  STEP 1
                </span>
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <h3 className="font-bold text-sm text-white">Raise Advance</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Record accounting Advance ID before employee journey. Disburse funds & link vouchers dynamically.
              </p>
            </div>
            <button
              onClick={() => onOpenQuickAction('advance')}
              className="mt-3 w-full py-2 px-3 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-all min-h-[40px]"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>+ Raise Advance</span>
            </button>
          </div>

          {/* Step 2: Add Voucher */}
          <div className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 transition-all flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono font-bold text-indigo-400 bg-indigo-950/60 border border-indigo-800/60 px-2 py-0.5 rounded">
                  STEP 2
                </span>
                <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Plus className="w-4 h-4" />
                </div>
              </div>
              <h3 className="font-bold text-sm text-white">Add Voucher</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Create master voucher with travel dates, project, destination, verification workflow, and itemized bills.
              </p>
            </div>
            <button
              onClick={() => onOpenQuickAction('voucher')}
              className="mt-3 w-full py-2 px-3 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-all min-h-[40px]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Voucher</span>
            </button>
          </div>

          {/* Step 3: Raise Settlement */}
          <div className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 transition-all flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono font-bold text-sky-400 bg-sky-950/60 border border-sky-800/60 px-2 py-0.5 rounded">
                  STEP 3 · MAPPED TO ADVANCE ID
                </span>
                <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <RefreshCw className="w-4 h-4" />
                </div>
              </div>
              <h3 className="font-bold text-sm text-white">Raise Settlement</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Map settlement directly to an Advance ID. Close advance pool and record final journal voucher in accounts.
              </p>
            </div>
            <button
              onClick={() => onOpenQuickAction('settlement')}
              className="mt-3 w-full py-2 px-3 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-all min-h-[40px]"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>+ Raise Settlement</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3 High-Impact Key Financial Balances (Section 13) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Outstanding Personal Recovery */}
        <div
          onClick={() => navigateWithFilter('recoveries', { status: 'Partially Received' })}
          className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-violet-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Outstanding Personal Recovery
            </span>
            <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold font-mono text-violet-950">
              {formatINR(totalOutstandingPersonalRecoveryAmount)}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
              <span>{personalPaymentsOutstanding.length} personal vendor payments</span>
              <span className="text-violet-600 font-semibold flex items-center gap-0.5">
                View Recoveries <ArrowUpRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>

        {/* Monthly Travel Expenses */}
        <div
          onClick={() => setActiveTab('reports')}
          className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Travel Expenditure
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900">
              {formatINR(monthlyTravelExpensesAmount)}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
              <span>Approved claims & company direct bookings</span>
              <span className="text-indigo-600 font-semibold flex items-center gap-0.5">
                Full Report <ArrowUpRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>

        {/* Total Approved Claims */}
        <div
          onClick={() => navigateWithFilter('vouchers', { status: 'Approved' })}
          className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Approved Voucher Claims
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-950">
              {formatINR(totalApprovedClaimsAmount)}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
              <span>Across {vouchers.length} master voucher records</span>
              <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
                View Vouchers <ArrowUpRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recharts Monthly Expense Distribution by Category */}
      <ExpenseDistributionChart
        vouchers={vouchers}
        vendorPayments={vendorPayments}
        onNavigateToCategory={(cat) => navigateWithFilter('vendorPayments', { search: cat })}
      />

      {/* 11 Section 13 Interactive Action Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Operational Workflows & Status Queues
          </h2>
          <span className="text-xs text-slate-500">
            Click any metric card to open its filtered register
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {/* Card 1: Total Active Vouchers */}
          <div
            onClick={() => setActiveTab('vouchers')}
            className="p-4 bg-white rounded-xl border border-slate-200 hover:border-indigo-400 hover:shadow-xs transition-all cursor-pointer"
          >
            <span className="text-[11px] font-semibold text-slate-500 block truncate">
              Total Active Vouchers
            </span>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
              {activeVouchers.length}
            </div>
            <span className="text-[10px] text-indigo-600 font-medium mt-1 block">
              In flight or pending settlement
            </span>
          </div>

          {/* Card 2: Vouchers Received */}
          <div
            onClick={() => navigateWithFilter('vouchers', { status: 'Received' })}
            className="p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-xs transition-all cursor-pointer"
          >
            <span className="text-[11px] font-semibold text-slate-500 block truncate">
              Vouchers Received
            </span>
            <div className="text-2xl font-bold font-mono text-blue-700 mt-1">
              {vouchers.filter((v) => v.overallStatus === 'Received').length}
            </div>
            <span className="text-[10px] text-blue-600 font-medium mt-1 block">
              Recorded · Ready for advance
            </span>
          </div>

          {/* Card 3: Vouchers with Advance Raised */}
          <div
            onClick={() => navigateWithFilter('vouchers', { status: 'Advance Raised' })}
            className="p-4 bg-white rounded-xl border border-slate-200 hover:border-purple-400 hover:shadow-xs transition-all cursor-pointer"
          >
            <span className="text-[11px] font-semibold text-slate-500 block truncate">
              Advance Raised
            </span>
            <div className="text-2xl font-bold font-mono text-purple-700 mt-1">
              {vouchers.filter((v) => v.overallStatus === 'Advance Raised').length}
            </div>
            <span className="text-[10px] text-purple-600 font-medium mt-1 block">
              Linked to advance requests
            </span>
          </div>

          {/* Card 4: Advances Awaiting Approval */}
          <div
            onClick={() => navigateWithFilter('advances', { status: 'Raised in Accounting Software' })}
            className="p-4 bg-white rounded-xl border border-slate-200 hover:border-indigo-400 hover:shadow-xs transition-all cursor-pointer"
          >
            <span className="text-[11px] font-semibold text-slate-500 block truncate">
              Advances Awaiting Approval
            </span>
            <div className="text-2xl font-bold font-mono text-indigo-700 mt-1">
              {advancesAwaitingApproval.length}
            </div>
            <span className="text-[10px] text-slate-500 font-medium mt-1 block">
              Pending Accounts signoff
            </span>
          </div>

          {/* Card 5: Advances Awaiting Funds */}
          <div
            onClick={() => navigateWithFilter('advances', { status: 'Awaiting Funds' })}
            className="p-4 bg-white rounded-xl border border-slate-200 hover:border-amber-400 hover:shadow-xs transition-all cursor-pointer"
          >
            <span className="text-[11px] font-semibold text-slate-500 block truncate">
              Advances Awaiting Funds
            </span>
            <div className="text-2xl font-bold font-mono text-amber-700 mt-1">
              {advancesAwaitingFunds.length}
            </div>
            <span className="text-[10px] text-slate-500 font-medium mt-1 block">
              Approved, waiting bank receipt
            </span>
          </div>

          {/* Card 6: Funds Received but Not Fully Disbursed */}
          <div
            onClick={() => navigateWithFilter('advances', { status: 'Funds Received' })}
            className="p-4 bg-white rounded-xl border border-slate-200 hover:border-sky-400 hover:shadow-xs transition-all cursor-pointer"
          >
            <span className="text-[11px] font-semibold text-slate-500 block truncate">
              Received Not Fully Disbursed
            </span>
            <div className="text-2xl font-bold font-mono text-sky-700 mt-1">
              {advancesPartiallyDisbursed.length}
            </div>
            <span className="text-[10px] text-sky-600 font-medium mt-1 block">
              Pool available for payout
            </span>
          </div>

          {/* Card 7: Vouchers Pending Settlement */}
          <div
            onClick={() => navigateWithFilter('vouchers', { status: 'Pending for Settlement' })}
            className="p-4 bg-white rounded-xl border border-slate-200 hover:border-amber-400 hover:shadow-xs transition-all cursor-pointer"
          >
            <span className="text-[11px] font-semibold text-slate-500 block truncate">
              Pending for Settlement
            </span>
            <div className="text-2xl font-bold font-mono text-amber-700 mt-1">
              {vouchers.filter((v) => v.overallStatus === 'Pending for Settlement').length}
            </div>
            <span className="text-[10px] text-amber-600 font-medium mt-1 block">
              Disbursed · Ready for closure
            </span>
          </div>

          {/* Card 8: Settlements Pending Completion */}
          <div
            onClick={() => navigateWithFilter('settlements', { status: 'Initiated in Accounting Software' })}
            className="p-4 bg-white rounded-xl border border-slate-200 hover:border-sky-400 hover:shadow-xs transition-all cursor-pointer"
          >
            <span className="text-[11px] font-semibold text-slate-500 block truncate">
              Settlements In Processing
            </span>
            <div className="text-2xl font-bold font-mono text-sky-800 mt-1">
              {settlementsPendingCompletion.length}
            </div>
            <span className="text-[10px] text-slate-500 font-medium mt-1 block">
              Settlement ID entered, unclosed
            </span>
          </div>

          {/* Card 9: Personal Vendor Payments Outstanding for Recovery */}
          <div
            onClick={() => navigateWithFilter('vendorPayments', { search: 'Personal' })}
            className="p-4 bg-white rounded-xl border border-slate-200 hover:border-amber-400 hover:shadow-xs transition-all cursor-pointer"
          >
            <span className="text-[11px] font-semibold text-slate-500 block truncate">
              Personal Payments Outstanding
            </span>
            <div className="text-2xl font-bold font-mono text-amber-800 mt-1">
              {personalPaymentsOutstanding.length}
            </div>
            <span className="text-[10px] text-amber-600 font-medium mt-1 block">
              Admin personal funds to recover
            </span>
          </div>

          {/* Card 10: Recovery Requests Awaiting Approval */}
          <div
            onClick={() => navigateWithFilter('recoveries', { status: 'Submitted to Accounts' })}
            className="p-4 bg-white rounded-xl border border-slate-200 hover:border-violet-400 hover:shadow-xs transition-all cursor-pointer"
          >
            <span className="text-[11px] font-semibold text-slate-500 block truncate">
              Recoveries Awaiting Approval
            </span>
            <div className="text-2xl font-bold font-mono text-violet-800 mt-1">
              {recoveryRequestsAwaitingApproval.length}
            </div>
            <span className="text-[10px] text-slate-500 font-medium mt-1 block">
              Submitted to Accounts team
            </span>
          </div>

          {/* Card 11: Approved Recoveries Awaiting Receipt */}
          <div
            onClick={() => navigateWithFilter('recoveries', { status: 'Approved' })}
            className="p-4 bg-white rounded-xl border border-slate-200 hover:border-emerald-400 hover:shadow-xs transition-all cursor-pointer"
          >
            <span className="text-[11px] font-semibold text-slate-500 block truncate">
              Approved Recoveries Awaiting Fund
            </span>
            <div className="text-2xl font-bold font-mono text-emerald-800 mt-1">
              {approvedRecoveriesAwaitingReceipt.length}
            </div>
            <span className="text-[10px] text-emerald-600 font-medium mt-1 block">
              Ready for bank receipt allocation
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Recent Activity Stream & Active Team Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity Log Stream (2 columns on lg) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Recent Transaction Audit Trail (Section 12)
              </h3>
            </div>
            <button
              onClick={() => setActiveTab('history')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              View Full History →
            </button>
          </div>

          <div className="space-y-3">
            {activities.slice(0, 5).map((act) => {
              const linkedVoucher = vouchers.find((v) => v.id === act.voucherRecordId);
              return (
                <div
                  key={act.id}
                  onClick={() => {
                    if (act.voucherRecordId) {
                      setSelectedVoucherId(act.voucherRecordId);
                    }
                  }}
                  className={`p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-100/60 transition-colors ${
                    act.voucherRecordId ? 'cursor-pointer' : ''
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{act.activityType}</span>
                      {linkedVoucher && (
                        <span className="font-mono text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                          {linkedVoucher.voucherNo}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {formatIndianDate(act.activityDate)}
                    </span>
                  </div>
                  {act.remarks && (
                    <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                      {act.remarks}
                    </p>
                  )}
                  {act.amount !== undefined && act.amount > 0 && (
                    <div className="mt-1 font-mono font-semibold text-indigo-600 text-[11px]">
                      Amount: {formatINR(act.amount)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Team Summary Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Team Roster ({teamMembers.length})
              </h3>
            </div>
            <button
              onClick={() => setActiveTab('team')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              Manage →
            </button>
          </div>

          <div className="space-y-2.5">
            {teamMembers.map((member) => {
              const memberVouchers = vouchers.filter((v) => v.teamMemberId === member.id);
              return (
                <div
                  key={member.id}
                  className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-800">{member.fullName}</div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {member.empId} · {member.baseLocation}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-[11px] font-semibold text-indigo-600 block">
                      {memberVouchers.length} vouchers
                    </span>
                    <span className={`text-[9px] font-semibold px-1.5 py-0.2 rounded ${
                      member.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {member.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
