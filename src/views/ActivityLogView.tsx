import React, { useState } from 'react';
import {
  History,
  Search,
  Calendar,
  IndianRupee,
  User,
  Plane,
  Wallet,
  Send,
  RefreshCw,
  CreditCard,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatINR, formatIndianDate } from '../utils/calculations';
import type { ActivityType } from '../types';

export const ActivityLogView: React.FC = () => {
  const { activities, vouchers, setSelectedVoucherId } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const filtered = activities.filter((act) => {
    if (typeFilter !== 'all' && act.activityType !== typeFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const voucher = vouchers.find((v) => v.id === act.voucherRecordId);
      const matchType = act.activityType.toLowerCase().includes(q);
      const matchRemarks = act.remarks?.toLowerCase().includes(q) || false;
      const matchVoucher = voucher?.voucherNo.toLowerCase().includes(q) || false;
      const matchBy = act.recordedBy.toLowerCase().includes(q);

      if (!matchType && !matchRemarks && !matchVoucher && !matchBy) return false;
    }
    return true;
  });

  return (
    <div className="space-y-5 pb-20">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Transaction Activity Audit History
          </h1>
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
            {filtered.length} entries
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          Append-only audit trail preserving exact historical transaction dates, amounts, and recorded events
        </p>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search activity remarks, voucher no, type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg"
          />
        </div>

        <div className="w-full sm:w-auto">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full sm:w-64 px-3 py-2 border border-slate-300 rounded-lg bg-white"
          >
            <option value="all">All Activity Types</option>
            <option value="Voucher Created">Voucher Created</option>
            <option value="Voucher Verified">Voucher Verified</option>
            <option value="Voucher Approved">Voucher Approved</option>
            <option value="Advance Raised">Advance Raised</option>
            <option value="Funds Received">Funds Received</option>
            <option value="Employee Disbursement Made">Employee Disbursement Made</option>
            <option value="Vendor Payment Made">Vendor Payment Made</option>
            <option value="Settlement Initiated">Settlement Initiated</option>
            <option value="Settlement Completed">Settlement Completed</option>
            <option value="Recovery Request Submitted">Recovery Request Submitted</option>
            <option value="Recovery Received">Recovery Received</option>
            <option value="WhatsApp Notification Initiated">WhatsApp Notification Initiated</option>
            <option value="WhatsApp Message Confirmed Sent">WhatsApp Message Confirmed Sent</option>
          </select>
        </div>
      </div>

      {/* Audit Timeline */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs">
            No activity log entries match the search.
          </div>
        ) : (
          <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
            {filtered.map((act) => {
              const voucher = vouchers.find((v) => v.id === act.voucherRecordId);

              return (
                <div key={act.id} className="relative text-xs">
                  <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-indigo-600 ring-4 ring-white" />
                  <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{act.activityType}</span>
                        {voucher && (
                          <button
                            type="button"
                            onClick={() => setSelectedVoucherId(voucher.id)}
                            className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded transition-colors"
                          >
                            {voucher.voucherNo}
                          </button>
                        )}
                        <span className="text-[10px] font-mono text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          {act.id}
                        </span>
                      </div>
                      <div className="text-right text-[11px] text-slate-500 font-mono">
                        Event Date: <strong className="text-slate-800">{formatIndianDate(act.activityDate)}</strong>
                      </div>
                    </div>

                    {act.remarks && (
                      <p className="text-slate-700 text-xs mt-1.5 leading-relaxed">
                        {act.remarks}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-200/60 text-[10px] text-slate-400">
                      <div>
                        Recorded by <span className="font-semibold text-slate-600">{act.recordedBy}</span> at{' '}
                        {new Date(act.createdAt).toLocaleString('en-IN')}
                      </div>
                      {act.amount !== undefined && act.amount > 0 && (
                        <div className="font-mono font-bold text-indigo-700 text-xs">
                          {formatINR(act.amount)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
