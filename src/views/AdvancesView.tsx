import React, { useState } from 'react';
import {
  Wallet,
  Plus,
  Search,
  IndianRupee,
  Calendar,
  Building,
  CheckCircle,
  Clock,
  ArrowDownToLine,
  Edit2,
  Trash2,
  MessageSquare,
  AlertTriangle,
  Plane,
  User,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  formatINR,
  formatIndianDate,
  calcAdvanceFundsAvailable,
  calcAdvanceTotalAllocated,
} from '../utils/calculations';
import type { AdvanceRecord } from '../types';

interface AdvancesViewProps {
  onAddAdvance: () => void;
  onEditAdvance: (advance: AdvanceRecord) => void;
  onRecordDisbursement: (advanceId: string) => void;
  onRaiseSettlement?: (advanceId: string) => void;
}

export const AdvancesView: React.FC<AdvancesViewProps> = ({
  onAddAdvance,
  onEditAdvance,
  onRecordDisbursement,
  onRaiseSettlement,
}) => {
  const {
    advances,
    advanceVoucherMappings,
    disbursements,
    vouchers,
    teamMembers,
    deleteAdvance,
    openWhatsAppModal,
    updateAdvance,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredAdvances = advances.filter((adv) => {
    if (statusFilter !== 'all' && adv.status !== statusFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchAdvId = adv.advanceId.toLowerCase().includes(q);
      const matchBank = adv.bankCashReceiptRef?.toLowerCase().includes(q) || false;
      const matchRemarks = adv.remarks?.toLowerCase().includes(q) || false;
      const matchProject = adv.projectName?.toLowerCase().includes(q) || false;
      
      const assignedMember = adv.teamMemberId ? teamMembers.find((m) => m.id === adv.teamMemberId) : null;
      const matchEmpName = assignedMember?.fullName.toLowerCase().includes(q) || false;

      // Also match mapped vouchers
      const mappings = advanceVoucherMappings.filter((m) => m.advanceRecordId === adv.id);
      const matchVoucher = mappings.some((m) => {
        const v = vouchers.find((item) => item.id === m.voucherRecordId);
        const vm = v ? teamMembers.find((item) => item.id === v.teamMemberId) : null;
        return (
          v?.voucherNo.toLowerCase().includes(q) ||
          v?.projectName.toLowerCase().includes(q) ||
          vm?.fullName.toLowerCase().includes(q)
        );
      });

      if (!matchAdvId && !matchBank && !matchRemarks && !matchProject && !matchEmpName && !matchVoucher) {
        return false;
      }
    }
    return true;
  });

  const handleNotifyAdvanceRaised = (adv: AdvanceRecord) => {
    // Collect all mapped vouchers for this advance
    const mappings = advanceVoucherMappings.filter((m) => m.advanceRecordId === adv.id);
    const notifType = adv.status === 'Approved' ? 'Advance Approved' : adv.status === 'Disbursed' ? 'Amount Disbursed' : 'Advance Raised';

    if (mappings.length > 0) {
      const batchItems = mappings
        .map((m) => {
          const v = vouchers.find((item) => item.id === m.voucherRecordId);
          const member = v ? teamMembers.find((mem) => mem.id === v.teamMemberId) : null;
          if (!v || !member) return null;
          return {
            employeeName: member.fullName,
            employeePhone: member.whatsappNumber,
            employeeId: member.id,
            voucherRecordId: v.id,
            voucherNo: v.voucherNo,
            projectName: v.projectName,
            startDate: v.travelStartDate,
            endDate: v.travelEndDate,
            advanceAmount: m.allocatedAdvanceAmount || adv.requestedAmount,
            disbursedAmount: m.allocatedAdvanceAmount || adv.requestedAmount,
          };
        })
        .filter(Boolean) as any[];

      if (batchItems.length > 0) {
        openWhatsAppModal({
          type: notifType,
          employeeName: batchItems[0].employeeName,
          employeePhone: batchItems[0].employeePhone,
          employeeId: batchItems[0].employeeId,
          voucherRecordId: batchItems[0].voucherRecordId,
          voucherNo: batchItems[0].voucherNo,
          projectName: batchItems[0].projectName,
          advanceAmount: batchItems[0].advanceAmount,
          disbursedAmount: batchItems[0].disbursedAmount,
          batchItems: batchItems.length > 1 ? batchItems : undefined,
        });
        return;
      }
    }

    // If no voucher mapped yet, check if advance has assigned employee
    if (adv.teamMemberId) {
      const member = teamMembers.find((m) => m.id === adv.teamMemberId);
      if (member) {
        openWhatsAppModal({
          type: notifType,
          employeeName: member.fullName,
          employeePhone: member.whatsappNumber,
          employeeId: member.id,
          voucherRecordId: '',
          voucherNo: 'Unmapped Advance',
          projectName: adv.projectName || 'Corporate Travel',
          advanceAmount: adv.requestedAmount,
        });
      }
    }
  };

  return (
    <div className="space-y-5 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Advance Management Register
            </h1>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {filteredAdvances.length} records
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Single Advance ID per accounting transaction · Mappable across multiple vouchers without duplicating amounts
          </p>
        </div>

        <button
          onClick={onAddAdvance}
          className="px-4 py-2.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-all min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          <span>Raise Advance Request</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search Advance ID, vouchers, bank ref..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none">
          {['all', 'Raised', 'Approved', 'Disbursed', 'Closed'].map(
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

      {/* Advance Cards */}
      {filteredAdvances.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
          <Wallet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="font-semibold text-slate-700">No advances match your filter.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAdvances.map((adv) => {
            const availableFunds = calcAdvanceFundsAvailable(adv, disbursements);
            const totalAllocated = calcAdvanceTotalAllocated(adv.id, advanceVoucherMappings);
            const mappings = advanceVoucherMappings.filter((m) => m.advanceRecordId === adv.id);
            const assignedMember = adv.teamMemberId ? teamMembers.find((m) => m.id === adv.teamMemberId) : null;
            const pctDisbursed =
              adv.amountActuallyReceived > 0
                ? Math.min(100, Math.round((adv.amountDisbursed / adv.amountActuallyReceived) * 100))
                : 0;

            const statusBadgeColor =
              adv.status === 'Raised'
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : adv.status === 'Approved'
                ? 'bg-blue-50 text-blue-800 border-blue-200'
                : adv.status === 'Disbursed'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-slate-100 text-slate-700 border-slate-300';

            return (
              <div
                key={adv.id}
                className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-base font-bold text-slate-900">
                          {adv.advanceId}
                        </span>
                        <span className="text-xs font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          {adv.id}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${statusBadgeColor}`}>
                          {adv.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap text-xs text-slate-500 mt-0.5">
                        <span>Raised on {formatIndianDate(adv.advanceRaisedDate)}</span>
                        {assignedMember && (
                          <span className="flex items-center gap-1 font-medium text-slate-700">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>{assignedMember.fullName}</span>
                          </span>
                        )}
                        {adv.projectName && (
                          <span className="flex items-center gap-1 text-slate-600">
                            <Building className="w-3.5 h-3.5 text-slate-400" />
                            <span>{adv.projectName}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    {/* One-click Approve Advance button when status is Raised */}
                    {adv.status === 'Raised' && (
                      <button
                        type="button"
                        onClick={() => {
                          const approvedAmt =
                            adv.approvedAmount !== undefined && adv.approvedAmount > 0
                              ? adv.approvedAmount
                              : adv.requestedAmount;
                          const today = new Date().toISOString().split('T')[0];
                          updateAdvance(
                            adv.id,
                            {
                              status: 'Approved',
                              approvedAmount: approvedAmt,
                              amountActuallyReceived: approvedAmt,
                              approvalDate: adv.approvalDate || today,
                              fundsReceivedDate: adv.fundsReceivedDate || today,
                            },
                            undefined,
                            `Advance approved with actual received amount ₹${approvedAmt.toLocaleString('en-IN')}`
                          );
                        }}
                        title="Approve Advance and sync mapped vouchers to Advance Approved"
                        className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs flex items-center gap-1.5 min-h-[40px] transition-colors"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleNotifyAdvanceRaised(adv)}
                      title={mappings.length > 1 ? `Notify all ${mappings.length} mapped vouchers via WhatsApp` : 'Send WhatsApp Notification'}
                      className="px-3 py-1.5 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg flex items-center gap-1.5 min-h-[40px] transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{mappings.length > 1 ? `Notify All (${mappings.length})` : 'Notify'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onRecordDisbursement(adv.id)}
                      disabled={adv.status === 'Raised' || adv.status === 'Closed' || (availableFunds <= 0 && adv.amountActuallyReceived > 0)}
                      title={
                        adv.status === 'Raised'
                          ? 'Advance must be Approved before disbursement'
                          : adv.status === 'Closed'
                          ? 'Advance is Closed'
                          : 'Record Disbursement'
                      }
                      className="px-3 py-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white rounded-lg shadow-sm flex items-center gap-1.5 min-h-[40px] disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                    >
                      <ArrowDownToLine className="w-3.5 h-3.5" />
                      <span>Disburse</span>
                    </button>

                    {onRaiseSettlement && (
                      <button
                        type="button"
                        onClick={() => onRaiseSettlement(adv.id)}
                        disabled={adv.status !== 'Disbursed' && adv.amountDisbursed <= 0}
                        className="px-3 py-1.5 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg flex items-center gap-1.5 min-h-[40px] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        title={
                          adv.status !== 'Disbursed' && adv.amountDisbursed <= 0
                            ? 'Advance must be Disbursed before Settlement'
                            : `Raise Accounting Settlement mapped to ${adv.advanceId}`
                        }
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Settle</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onEditAdvance(adv)}
                      className="px-3 py-1.5 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg shadow-2xs flex items-center gap-1.5 min-h-[40px] transition-colors"
                      aria-label={`Edit Advance ${adv.advanceId}`}
                    >
                      <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                      <span>Edit</span>
                    </button>
                  </div>
                </div>

                {/* Amounts Breakdown Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-semibold block">Requested</span>
                    <span className="font-mono text-sm font-bold text-slate-700">{formatINR(adv.requestedAmount)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-semibold block">Approved</span>
                    <span className="font-mono text-sm font-bold text-slate-700">{formatINR(adv.approvedAmount)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-semibold block">Actually Received</span>
                    <span className="font-mono text-sm font-bold text-emerald-800">{formatINR(adv.amountActuallyReceived)}</span>
                    {adv.bankCashReceiptRef && (
                      <span className="text-[10px] text-slate-400 block font-mono truncate">{adv.bankCashReceiptRef}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-semibold block">Available to Disburse</span>
                    <span className="font-mono text-sm font-bold text-sky-700">{formatINR(availableFunds)}</span>
                  </div>
                </div>

                {/* Disbursement Progress Bar */}
                {adv.amountActuallyReceived > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Disbursement Progress: {formatINR(adv.amountDisbursed)} / {formatINR(adv.amountActuallyReceived)}</span>
                      <span className="font-mono font-semibold">{pctDisbursed}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full rounded-full transition-all"
                        style={{ width: `${pctDisbursed}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Mapped Vouchers Section */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                      Vouchers Covered Under This Advance ({mappings.length})
                    </span>
                    {mappings.length > 0 && (
                      <button
                        type="button"
                        onClick={() => onEditAdvance(adv)}
                        className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Change Mappings</span>
                      </button>
                    )}
                  </div>

                  {mappings.length === 0 ? (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                        <div>
                          <span className="font-semibold text-slate-800">Unmapped Advance (No vouchers linked)</span>
                          <p className="text-[11px] text-slate-500">This advance is raised independently. You can map travel vouchers anytime.</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onEditAdvance(adv)}
                        className="px-3 py-1.5 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg flex items-center gap-1.5 self-start sm:self-auto min-h-[36px] transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Map Voucher</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {mappings.map((m) => {
                        const targetVoucher = vouchers.find((v) => v.id === m.voucherRecordId);
                        const member = teamMembers.find((item) => item.id === targetVoucher?.teamMemberId);

                        let vBadgeBg = 'bg-slate-100 text-slate-700 border border-slate-200';
                        if (targetVoucher?.overallStatus === 'Received') {
                          vBadgeBg = 'bg-blue-50 text-blue-700 border border-blue-200';
                        } else if (targetVoucher?.overallStatus === 'Advance Raised') {
                          vBadgeBg = 'bg-purple-50 text-purple-700 border border-purple-200';
                        } else if (targetVoucher?.overallStatus === 'Pending for Settlement') {
                          vBadgeBg = 'bg-amber-50 text-amber-800 border border-amber-200';
                        } else if (targetVoucher?.overallStatus === 'Settlement Initiated') {
                          vBadgeBg = 'bg-cyan-50 text-cyan-800 border border-cyan-200';
                        } else if (targetVoucher?.overallStatus === 'Completed') {
                          vBadgeBg = 'bg-emerald-50 text-emerald-800 border border-emerald-200';
                        }

                        return (
                          <div
                            key={m.id}
                            className="p-2.5 bg-slate-50/80 rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="flex flex-wrap items-center gap-1.5 font-bold text-slate-800">
                                <Plane className="w-3.5 h-3.5 text-indigo-600" />
                                <span>{targetVoucher?.voucherNo || 'Voucher'}</span>
                                <span className="text-[11px] font-normal text-slate-500">({member?.fullName || 'Unassigned'})</span>
                                {targetVoucher && (
                                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${vBadgeBg}`}>
                                    {targetVoucher.overallStatus}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                {targetVoucher?.travelTo} · {targetVoucher?.projectName}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-mono font-bold text-indigo-700 text-xs block">
                                {formatINR(m.allocatedAdvanceAmount)}
                              </span>
                              <span className="text-[10px] text-slate-400">Allocated</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
