import React, { useState } from 'react';
import {
  ArrowDownToLine,
  Plus,
  Search,
  IndianRupee,
  Calendar,
  User,
  Plane,
  Edit2,
  Trash2,
  MessageSquare,
  Wallet,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatINR, formatIndianDate } from '../utils/calculations';
import type { EmployeeDisbursement } from '../types';

interface DisbursementsViewProps {
  onAddDisbursement: () => void;
  onEditDisbursement: (disbursement: EmployeeDisbursement) => void;
}

export const DisbursementsView: React.FC<DisbursementsViewProps> = ({
  onAddDisbursement,
  onEditDisbursement,
}) => {
  const {
    disbursements,
    teamMembers,
    vouchers,
    advances,
    advanceVoucherMappings,
    deleteDisbursement,
    openWhatsAppModal,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('all');

  const filtered = disbursements.filter((d) => {
    if (employeeFilter !== 'all' && d.employeeId !== employeeFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const member = teamMembers.find((m) => m.id === d.employeeId);
      const voucher = vouchers.find((v) => v.id === d.voucherRecordId);
      const adv = advances.find((a) => a.id === d.advanceRecordId);
      const matchEmp = member?.fullName.toLowerCase().includes(q) || false;
      const matchVoucher = voucher?.voucherNo.toLowerCase().includes(q) || false;
      const matchAdv = adv?.advanceId.toLowerCase().includes(q) || false;
      const matchRef = d.transactionRef.toLowerCase().includes(q);

      if (!matchEmp && !matchVoucher && !matchAdv && !matchRef) return false;
    }
    return true;
  });

  const handleNotifyDisbursement = (d: EmployeeDisbursement) => {
    const member = teamMembers.find((m) => m.id === d.employeeId);
    const voucher = vouchers.find((v) => v.id === d.voucherRecordId);
    if (!member || !voucher) return;

    // Check if the advance has multiple mapped vouchers
    const advanceMappings = d.advanceRecordId
      ? advanceVoucherMappings.filter((m) => m.advanceRecordId === d.advanceRecordId)
      : [];

    if (advanceMappings.length > 1) {
      const batchItems = advanceMappings
        .map((m) => {
          const v = vouchers.find((item) => item.id === m.voucherRecordId);
          const mem = v ? teamMembers.find((item) => item.id === v.teamMemberId) : null;
          if (!v || !mem) return null;
          const disbRecord = disbursements.find(
            (item) => item.voucherRecordId === v.id && item.advanceRecordId === d.advanceRecordId
          );
          return {
            employeeName: mem.fullName,
            employeePhone: mem.whatsappNumber,
            employeeId: mem.id,
            voucherRecordId: v.id,
            voucherNo: v.voucherNo,
            projectName: v.projectName,
            startDate: v.travelStartDate,
            endDate: v.travelEndDate,
            disbursedAmount: disbRecord?.amountDisbursed || m.allocatedAdvanceAmount || d.amountDisbursed,
            disbursementDate: disbRecord?.disbursementDate || d.disbursementDate,
          };
        })
        .filter(Boolean) as any[];

      openWhatsAppModal({
        type: 'Amount Disbursed',
        employeeName: member.fullName,
        employeePhone: member.whatsappNumber,
        employeeId: member.id,
        voucherRecordId: voucher.id,
        voucherNo: voucher.voucherNo,
        projectName: voucher.projectName,
        disbursedAmount: d.amountDisbursed,
        disbursementDate: d.disbursementDate,
        batchItems: batchItems.length > 1 ? batchItems : undefined,
      });
      return;
    }

    openWhatsAppModal({
      type: 'Amount Disbursed',
      employeeName: member.fullName,
      employeePhone: member.whatsappNumber,
      employeeId: member.id,
      voucherRecordId: voucher.id,
      voucherNo: voucher.voucherNo,
      projectName: voucher.projectName,
      disbursedAmount: d.amountDisbursed,
      disbursementDate: d.disbursementDate,
    });
  };

  const totalDisbursed = filtered.reduce((sum, d) => sum + d.amountDisbursed, 0);

  return (
    <div className="space-y-5 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Employee Disbursement Register
            </h1>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
              {filtered.length} records · {formatINR(totalDisbursed)}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Tracks actual funds transferred to individual employees against specific advance allocations
          </p>
        </div>

        <button
          onClick={onAddDisbursement}
          className="px-4 py-2.5 text-xs font-semibold bg-sky-600 hover:bg-sky-700 active:scale-95 text-white rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-all min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          <span>Record Disbursement</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search employee, voucher, UTR ref..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg"
          />
        </div>

        <div className="w-full sm:w-auto">
          <select
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            className="w-full sm:w-60 px-3 py-2 border border-slate-300 rounded-lg bg-white"
          >
            <option value="all">All Employees</option>
            {teamMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.fullName} ({m.empId})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Disbursements List */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
          <ArrowDownToLine className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="font-semibold text-slate-700">No disbursements recorded yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => {
            const member = teamMembers.find((m) => m.id === d.employeeId);
            const voucher = vouchers.find((v) => v.id === d.voucherRecordId);
            const advance = advances.find((a) => a.id === d.advanceRecordId);

            return (
              <div
                key={d.id}
                className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:border-slate-300 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">
                      {member?.fullName}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      ({member?.empId})
                    </span>
                    <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                      {voucher?.voucherNo}
                    </span>
                    {voucher && (
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          voucher.overallStatus === 'Pending for Settlement'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : voucher.overallStatus === 'Completed'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : voucher.overallStatus === 'Settlement Initiated'
                            ? 'bg-cyan-50 text-cyan-800 border border-cyan-200'
                            : voucher.overallStatus === 'Advance Raised'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {voucher.overallStatus}
                      </span>
                    )}
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {d.paymentMethod}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-slate-500 text-[11px]">
                    <div>Date: <strong>{formatIndianDate(d.disbursementDate)}</strong></div>
                    <div>Funding Advance: <strong className="font-mono text-slate-700">{advance?.advanceId}</strong></div>
                    <div>Transaction Ref: <strong className="font-mono text-slate-700">{d.transactionRef}</strong></div>
                  </div>

                  {d.remarks && <div className="text-[11px] text-slate-600 italic">{d.remarks}</div>}
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="text-right">
                    <span className="font-mono text-base font-bold text-sky-800 block">
                      {formatINR(d.amountDisbursed)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{d.id}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleNotifyDisbursement(d)}
                      title="Send WhatsApp Notification"
                      className="px-2.5 py-1.5 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg flex items-center gap-1 min-h-[36px]"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Notify</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onEditDisbursement(d)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 min-h-[36px] min-w-[36px] flex items-center justify-center"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteDisbursement(d.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 min-h-[36px] min-w-[36px] flex items-center justify-center"
                      title="Delete Disbursement"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
