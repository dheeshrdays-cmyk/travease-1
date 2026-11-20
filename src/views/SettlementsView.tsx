import React, { useState } from 'react';
import {
  RefreshCw,
  Plus,
  Search,
  IndianRupee,
  Calendar,
  CheckCircle,
  Clock,
  Edit2,
  Trash2,
  Plane,
  Wallet,
  X,
  Save,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatINR, formatIndianDate } from '../utils/calculations';
import type { SettlementRecord, SettlementAccountingStatus } from '../types';

interface SettlementsViewProps {
  onAddSettlement: () => void;
  onEditSettlement: (settlement: SettlementRecord) => void;
}

export const SettlementsView: React.FC<SettlementsViewProps> = ({
  onAddSettlement,
  onEditSettlement,
}) => {
  const {
    settlements,
    settlementVoucherMappings,
    vouchers,
    advances,
    updateSettlement,
    deleteSettlement,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingSettlement, setUpdatingSettlement] = useState<SettlementRecord | null>(null);
  const [targetStatus, setTargetStatus] = useState<SettlementAccountingStatus>('Closed');
  const [completionDate, setCompletionDate] = useState<string>('');
  const [actualSettled, setActualSettled] = useState<number>(0);
  const [accountingRef, setAccountingRef] = useState<string>('');
  const [updateRemarks, setUpdateRemarks] = useState<string>('');

  const filtered = settlements.filter((s) => {
    if (statusFilter !== 'all' && s.accountingStatus !== statusFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchId = s.settlementId.toLowerCase().includes(q);
      const matchAdv = s.advanceId?.toLowerCase().includes(q) || false;
      const matchRef = s.accountingReference?.toLowerCase().includes(q) || false;
      const matchRemarks = s.remarks?.toLowerCase().includes(q) || false;

      const mappings = settlementVoucherMappings.filter((m) => m.settlementRecordId === s.id);
      const matchVoucher = mappings.some((m) => {
        const v = vouchers.find((item) => item.id === m.voucherRecordId);
        return v?.voucherNo.toLowerCase().includes(q) || v?.projectName.toLowerCase().includes(q);
      });

      if (!matchId && !matchAdv && !matchRef && !matchRemarks && !matchVoucher) return false;
    }
    return true;
  });

  const handleOpenUpdate = (s: SettlementRecord) => {
    setUpdatingSettlement(s);
    setTargetStatus(s.accountingStatus === 'Closed' || s.accountingStatus === 'Completed' ? 'Closed' : 'Closed');
    setCompletionDate(s.settlementCompletionDate || new Date().toISOString().split('T')[0]);
    setActualSettled(s.actualAmountSettled || s.settlementAmount);
    setAccountingRef(s.accountingReference || '');
    setUpdateRemarks(s.remarks || '');
  };

  const handleSaveUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!updatingSettlement) return;

    const isMarkedClosed = targetStatus === 'Closed' || targetStatus === 'Completed';

    updateSettlement(updatingSettlement.id, {
      accountingStatus: targetStatus,
      settlementCompletionDate:
        isMarkedClosed
          ? completionDate || new Date().toISOString().split('T')[0]
          : completionDate || undefined,
      actualAmountSettled: Number(actualSettled) || updatingSettlement.settlementAmount,
      accountingReference: accountingRef.trim() || undefined,
      remarks: updateRemarks.trim() || updatingSettlement.remarks,
    });

    setUpdatingSettlement(null);
  };

  return (
    <div className="space-y-5 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Settlement Management Register
            </h1>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
              {filtered.length} records
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Accounting software settlement IDs · Supports one settlement covering multiple vouchers
          </p>
        </div>

        <button
          onClick={onAddSettlement}
          className="px-4 py-2.5 text-xs font-semibold bg-sky-600 hover:bg-sky-700 active:scale-95 text-white rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-all min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          <span>Record Settlement</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search Settlement ID, journal ref, vouchers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none">
          {['all', 'Initiated in Accounting Software', 'Pending Processing', 'Closed', 'Completed'].map(
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

      {/* Settlements List */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
          <RefreshCw className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="font-semibold text-slate-700">No settlement records found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((s) => {
            const mappings = settlementVoucherMappings.filter(
              (m) => m.settlementRecordId === s.id
            );
            const isCompleted = s.accountingStatus === 'Completed' || s.accountingStatus === 'Closed';

            return (
              <div
                key={s.id}
                className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center font-bold">
                      <RefreshCw className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-base font-bold text-slate-900">
                          {s.settlementId}
                        </span>
                        <span className="text-xs font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          {s.id}
                        </span>
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded ${
                            isCompleted
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-sky-50 text-sky-800 border border-sky-200'
                          }`}
                        >
                          {s.accountingStatus}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 mt-0.5">
                        <span>Initiated {formatIndianDate(s.settlementInitiatedDate)} · {s.settlementType || 'Settlement'}</span>
                        {(s.advanceId || s.advanceRecordId) && (
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <Wallet className="w-3 h-3 text-emerald-600" />
                            <span>Advance: {s.advanceId || advances.find((a) => a.id === s.advanceRecordId)?.advanceId}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    <button
                      type="button"
                      onClick={() => handleOpenUpdate(s)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 min-h-[40px] shadow-2xs transition-all ${
                        isCompleted
                          ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow-xs'
                      }`}
                      title="Update settlement workflow status and mark closed in accounting software"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>{isCompleted ? 'Closed in Accounts (Update)' : 'Update & Mark Closed'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onEditSettlement(s)}
                      className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 min-h-[40px] min-w-[40px] flex items-center justify-center"
                      title="Edit Settlement Details"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteSettlement(s.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 min-h-[40px] min-w-[40px] flex items-center justify-center"
                      title="Delete Settlement"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-semibold block">Settlement Amount</span>
                    <span className="font-mono text-sm font-bold text-slate-900">{formatINR(s.settlementAmount)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-semibold block">Actual Settled</span>
                    <span className="font-mono text-sm font-bold text-emerald-800">
                      {formatINR(s.actualAmountSettled || s.settlementAmount)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-semibold block">Completion Date</span>
                    <span className="text-sm font-medium text-slate-800">
                      {formatIndianDate(s.settlementCompletionDate)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-semibold block">Accounting Ref</span>
                    <span className="font-mono text-sm text-slate-700">
                      {s.accountingReference || '—'}
                    </span>
                  </div>
                </div>

                {/* Mapped Vouchers */}
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2">
                    Vouchers Settled Under This Record ({mappings.length})
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {mappings.map((m) => {
                      const v = vouchers.find((item) => item.id === m.voucherRecordId);
                      let vBadgeBg = 'bg-slate-100 text-slate-700 border border-slate-200';
                      if (v?.overallStatus === 'Completed') {
                        vBadgeBg = 'bg-emerald-50 text-emerald-800 border border-emerald-200';
                      } else if (v?.overallStatus === 'Settlement Initiated') {
                        vBadgeBg = 'bg-cyan-50 text-cyan-800 border border-cyan-200';
                      } else if (v?.overallStatus === 'Pending for Settlement') {
                        vBadgeBg = 'bg-amber-50 text-amber-800 border border-amber-200';
                      } else if (v?.overallStatus === 'Advance Raised') {
                        vBadgeBg = 'bg-purple-50 text-purple-700 border border-purple-200';
                      } else if (v?.overallStatus === 'Received') {
                        vBadgeBg = 'bg-blue-50 text-blue-700 border border-blue-200';
                      }

                      return (
                        <div
                          key={m.id}
                          className="p-2.5 bg-slate-50/80 rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="flex flex-wrap items-center gap-1.5 font-bold text-slate-800">
                              <Plane className="w-3.5 h-3.5 text-sky-600" />
                              <span>{v?.voucherNo}</span>
                              {v && (
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${vBadgeBg}`}>
                                  {v.overallStatus}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {v?.travelTo} · {v?.projectName}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-sky-700 text-xs block">
                              {formatINR(m.allocatedSettlementAmount)}
                            </span>
                            <span className="text-[10px] text-slate-400">Settled Share</span>
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

      {/* Update Settlement & Mark Closed Modal */}
      {updatingSettlement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Update Settlement Workflow</h3>
                  <p className="text-xs text-slate-300 font-mono">
                    {updatingSettlement.settlementId}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUpdatingSettlement(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUpdate} className="p-6 space-y-4">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950">
                <span className="font-bold block mb-1">Accounting Software Workflow Sync</span>
                Marking this settlement as <strong className="text-emerald-700">Closed</strong> will complete the workflow and automatically update the status of the mapped advance to <strong className="text-emerald-700">Closed</strong> and all mapped travel vouchers to <strong className="text-emerald-700">Closed</strong> across all tabs.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Accounting Workflow Status <span className="text-rose-500">*</span>
                </label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value as SettlementAccountingStatus)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                >
                  <option value="Closed">Closed (Completed in Accounting Software)</option>
                  <option value="Completed">Completed (Closed in Accounting)</option>
                  <option value="Initiated">Initiated (Under Process / Audit)</option>
                  <option value="Pending Processing">Pending Processing</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Completion Date
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={completionDate}
                      onChange={(e) => setCompletionDate(e.target.value)}
                      className="w-full px-3 py-2 pl-9 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Actual Settled (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={actualSettled}
                    onChange={(e) => setActualSettled(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Accounting / ERP Reference Voucher No.
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tally JVN-2026/0491 or SAP Document #94821"
                  value={accountingRef}
                  onChange={(e) => setAccountingRef(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Workflow Remarks / Audit Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Verified by Accounts Head. TDS deducted and journal passed."
                  value={updateRemarks}
                  onChange={(e) => setUpdateRemarks(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setUpdatingSettlement(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors min-h-[40px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-2 shadow-xs transition-colors min-h-[40px]"
                >
                  <Save className="w-4 h-4" />
                  <span>Update & Save Status</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
