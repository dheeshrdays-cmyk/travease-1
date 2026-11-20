import React, { useState } from 'react';
import {
  Send,
  Plus,
  Search,
  IndianRupee,
  Calendar,
  CheckCircle,
  Clock,
  ArrowDownToLine,
  Edit2,
  Trash2,
  CreditCard,
  Plane,
  AlertCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatINR, formatIndianDate } from '../utils/calculations';
import type { AccountsRecoveryRequest } from '../types';

interface RecoveriesViewProps {
  onAddRecovery: () => void;
  onEditRecovery: (recovery: AccountsRecoveryRequest) => void;
  onAllocateReceipt: (recovery: AccountsRecoveryRequest) => void;
}

export const RecoveriesView: React.FC<RecoveriesViewProps> = ({
  onAddRecovery,
  onEditRecovery,
  onAllocateReceipt,
}) => {
  const {
    recoveries,
    recoveryPaymentMappings,
    vendorPayments,
    vouchers,
    teamMembers,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = recoveries.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchRef = r.recoveryRef.toLowerCase().includes(q);
      const matchSubmission = r.accountsSubmissionRef?.toLowerCase().includes(q) || false;
      const matchReceipt = r.receiptTransactionRef?.toLowerCase().includes(q) || false;
      const matchRemarks = r.remarks?.toLowerCase().includes(q) || false;

      const mappings = recoveryPaymentMappings.filter((m) => m.recoveryRecordId === r.id);
      const matchVoucher = mappings.some((m) => {
        const v = vouchers.find((item) => item.id === m.voucherRecordId);
        return v?.voucherNo.toLowerCase().includes(q);
      });

      if (!matchRef && !matchSubmission && !matchReceipt && !matchRemarks && !matchVoucher) {
        return false;
      }
    }
    return true;
  });

  const totalOutstanding = recoveries.reduce((sum, r) => sum + r.outstandingAmount, 0);
  const totalReceived = recoveries.reduce((sum, r) => sum + r.amountReceived, 0);

  return (
    <div className="space-y-5 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Combined Accounts Recovery Register
            </h1>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">
              {filtered.length} claims
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Bundles administrator personal vendor payments across vouchers for company reimbursement
          </p>
        </div>

        <button
          onClick={onAddRecovery}
          className="px-4 py-2.5 text-xs font-semibold bg-violet-600 hover:bg-violet-700 active:scale-95 text-white rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-all min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          <span>Create Combined Recovery</span>
        </button>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="p-4 bg-violet-50/70 rounded-xl border border-violet-200 flex items-center justify-between">
          <div>
            <span className="text-violet-800 font-semibold block">Total Pending Recovery from Accounts:</span>
            <span className="text-[11px] text-violet-700">Awaiting release or partial balance</span>
          </div>
          <span className="text-xl font-bold font-mono text-violet-950">
            {formatINR(totalOutstanding)}
          </span>
        </div>

        <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200 flex items-center justify-between">
          <div>
            <span className="text-emerald-800 font-semibold block">Total Reimbursed & Allocated:</span>
            <span className="text-[11px] text-emerald-700">Money actually received into administrator account</span>
          </div>
          <span className="text-xl font-bold font-mono text-emerald-950">
            {formatINR(totalReceived)}
          </span>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search recovery ref, memo, vouchers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none">
          {['all', 'Submitted to Accounts', 'Approved', 'Partially Received', 'Fully Recovered'].map(
            (st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-colors min-h-[36px] ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st === 'all' ? 'All' : st}
              </button>
            )
          )}
        </div>
      </div>

      {/* Recoveries List */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
          <Send className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="font-semibold text-slate-700">No recovery requests found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((recovery) => {
            const mappings = recoveryPaymentMappings.filter(
              (m) => m.recoveryRecordId === recovery.id
            );
            const isFull = recovery.status === 'Fully Recovered';
            const pctRecovered =
              recovery.requestedAmount > 0
                ? Math.min(100, Math.round((recovery.amountReceived / recovery.requestedAmount) * 100))
                : 0;

            return (
              <div
                key={recovery.id}
                className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-700 flex items-center justify-center font-bold">
                      <Send className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-base font-bold text-slate-900">
                          {recovery.recoveryRef}
                        </span>
                        <span className="text-xs font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          {recovery.id}
                        </span>
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded ${
                            isFull
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-violet-50 text-violet-800 border border-violet-200'
                          }`}
                        >
                          {recovery.status}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">
                        Requested on {formatIndianDate(recovery.requestDate)} · Memo: {recovery.accountsSubmissionRef || '—'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    {recovery.outstandingAmount > 0 && (
                      <button
                        type="button"
                        onClick={() => onAllocateReceipt(recovery)}
                        className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm flex items-center gap-1.5 min-h-[40px]"
                      >
                        <ArrowDownToLine className="w-3.5 h-3.5" />
                        <span>Record Accounts Receipt</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onEditRecovery(recovery)}
                      className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 min-h-[40px] min-w-[40px] flex items-center justify-center"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Amounts Breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-semibold block">Requested Claim</span>
                    <span className="font-mono text-sm font-bold text-slate-900">{formatINR(recovery.requestedAmount)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-semibold block">Approved by Accounts</span>
                    <span className="font-mono text-sm font-bold text-slate-800">
                      {formatINR(recovery.approvedAmount || recovery.requestedAmount)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-semibold block">Received & Deposited</span>
                    <span className="font-mono text-sm font-bold text-emerald-800">
                      {formatINR(recovery.amountReceived)}
                    </span>
                    {recovery.receiptTransactionRef && (
                      <span className="text-[10px] text-slate-400 block font-mono truncate">{recovery.receiptTransactionRef}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-semibold block">Outstanding Pending</span>
                    <span className="font-mono text-sm font-bold text-amber-800">{formatINR(recovery.outstandingAmount)}</span>
                  </div>
                </div>

                {/* Recovery Progress Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Reimbursement Progress: {formatINR(recovery.amountReceived)} / {formatINR(recovery.requestedAmount)}</span>
                    <span className="font-mono font-semibold">{pctRecovered}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full rounded-full transition-all"
                      style={{ width: `${pctRecovered}%` }}
                    />
                  </div>
                </div>

                {/* Included Personal Payment Items */}
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2">
                    Personal Vendor Payments Grouped in This Claim ({mappings.length})
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {mappings.map((m) => {
                      const payment = vendorPayments.find((p) => p.id === m.vendorPaymentRecordId);
                      const voucher = vouchers.find((v) => v.id === m.voucherRecordId);
                      const member = teamMembers.find((item) => item.id === payment?.employeeId);
                      const itemOutstanding = m.amountRequestedForRecovery - m.amountRecovered;

                      return (
                        <div
                          key={m.id}
                          className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-1.5 font-bold text-slate-800">
                              <CreditCard className="w-3.5 h-3.5 text-violet-600" />
                              <span>{payment?.vendorName}</span>
                              <span className="text-[10px] text-slate-400">({payment?.expenseCategory})</span>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {voucher?.voucherNo} · {member?.fullName} · Paid {formatIndianDate(payment?.paymentDate)}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-slate-900 text-xs block">
                              {formatINR(m.amountRequestedForRecovery)}
                            </span>
                            <span className={`text-[10px] font-medium ${
                              itemOutstanding === 0 ? 'text-emerald-700' : 'text-amber-700'
                            }`}>
                              {itemOutstanding === 0 ? 'Fully Recovered' : `Pending: ${formatINR(itemOutstanding)}`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
