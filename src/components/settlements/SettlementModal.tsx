import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Save, IndianRupee, Plus, Trash2, AlertCircle, Wallet, CheckCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatINR, formatIndianDate } from '../../utils/calculations';
import { getVouchersEligibleForSettlement } from '../../utils/validations';
import type { SettlementRecord } from '../../types';

interface SettlementModalProps {
  settlementToEdit?: SettlementRecord | null;
  defaultAdvanceId?: string;
  onClose: () => void;
}

export const SettlementModal: React.FC<SettlementModalProps> = ({
  settlementToEdit,
  defaultAdvanceId,
  onClose,
}) => {
  const {
    settlements,
    addSettlement,
    updateSettlement,
    vouchers,
    advances,
    advanceVoucherMappings,
    settlementVoucherMappings,
    teamMembers,
  } = useApp();

  const [settlementId, setSettlementId] = useState('');
  const [advanceRecordId, setAdvanceRecordId] = useState('');
  const [settlementInitiatedDate, setSettlementInitiatedDate] = useState('');
  const [settlementAmount, setSettlementAmount] = useState<number>(0);
  const [accountingStatus, setAccountingStatus] = useState<string>('Initiated in Accounting Software');
  const [settlementCompletionDate, setSettlementCompletionDate] = useState('');
  const [actualAmountSettled, setActualAmountSettled] = useState<number>(0);
  const [accountingReference, setAccountingReference] = useState('');
  const [remarks, setRemarks] = useState('');
  const [formError, setFormError] = useState('');

  // Voucher mappings
  const [mappedVouchers, setMappedVouchers] = useState<
    { voucherRecordId: string; allocatedAmount: number }[]
  >([]);

  useEffect(() => {
    if (settlementToEdit) {
      setSettlementId(settlementToEdit.settlementId);
      setSettlementInitiatedDate(settlementToEdit.settlementInitiatedDate);
      setSettlementAmount(settlementToEdit.settlementAmount);
      setAccountingStatus(settlementToEdit.accountingStatus || 'Initiated in Accounting Software');
      setSettlementCompletionDate(settlementToEdit.settlementCompletionDate || '');
      setActualAmountSettled(settlementToEdit.actualAmountSettled ?? settlementToEdit.settlementAmount);
      setAccountingReference(settlementToEdit.accountingReference || '');
      setRemarks(settlementToEdit.remarks || '');

      // Load existing advance mapping
      if (settlementToEdit.advanceRecordId) {
        setAdvanceRecordId(settlementToEdit.advanceRecordId);
      } else if (settlementToEdit.advanceId) {
        const matchingAdv = advances.find((a) => a.advanceId === settlementToEdit.advanceId);
        if (matchingAdv) setAdvanceRecordId(matchingAdv.id);
      } else if (advances.length > 0) {
        setAdvanceRecordId(advances[0].id);
      }

      const existing = settlementVoucherMappings
        .filter((m) => m.settlementRecordId === settlementToEdit.id)
        .map((m) => ({ voucherRecordId: m.voucherRecordId, allocatedAmount: m.allocatedSettlementAmount }));
      setMappedVouchers(existing);
    } else {
      const today = new Date().toISOString().split('T')[0];
      setSettlementInitiatedDate(today);
      const nextSeq = String(settlements.length + 1).padStart(3, '0');
      setSettlementId(`Settlement/dheerendrak@dexitglobal.com/${nextSeq}`);
      setAccountingStatus('Initiated in Accounting Software');
      setSettlementCompletionDate('');
      setActualAmountSettled(0);
      setAccountingReference('');

      // Preselect advance (defaultAdvanceId if provided, or first disbursed advance)
      const eligibleAdvances = advances.filter(
        (a) => a.status === 'Disbursed' || (a.amountDisbursed && a.amountDisbursed > 0) || a.id === defaultAdvanceId
      );
      const targetAdv = (defaultAdvanceId && advances.find((a) => a.id === defaultAdvanceId)) || (eligibleAdvances.length > 0 ? eligibleAdvances[0] : null);
      if (targetAdv) {
        setAdvanceRecordId(targetAdv.id);

        // Find vouchers mapped to this advance
        const linkedVoucherMappings = advanceVoucherMappings.filter((m) => m.advanceRecordId === targetAdv.id);
        if (linkedVoucherMappings.length > 0) {
          const autoVouchers = linkedVoucherMappings.map((lvm) => ({
            voucherRecordId: lvm.voucherRecordId,
            allocatedAmount: lvm.allocatedAdvanceAmount,
          }));
          setMappedVouchers(autoVouchers);
          const totalAdvAlloc = autoVouchers.reduce((s, item) => s + item.allocatedAmount, 0);
          setSettlementAmount(totalAdvAlloc || targetAdv.amountActuallyReceived || targetAdv.requestedAmount || 0);
        } else if (vouchers.length > 0) {
          setMappedVouchers([
            {
              voucherRecordId: vouchers[0].id,
              allocatedAmount: vouchers[0].approvedAmount || vouchers[0].claimedAmount || 5000,
            },
          ]);
          setSettlementAmount(vouchers[0].approvedAmount || vouchers[0].claimedAmount || 5000);
        }
      }
    }
  }, [settlementToEdit, defaultAdvanceId, vouchers, advances, advanceVoucherMappings, settlementVoucherMappings]);

  // When user changes the selected Advance ID
  const handleAdvanceChange = (advId: string) => {
    setAdvanceRecordId(advId);
    setFormError('');

    const selectedAdv = advances.find((a) => a.id === advId);
    if (selectedAdv) {
      // Find vouchers mapped to this advance
      const linked = advanceVoucherMappings.filter((m) => m.advanceRecordId === advId);
      if (linked.length > 0) {
        const autoVouchers = linked.map((m) => ({
          voucherRecordId: m.voucherRecordId,
          allocatedAmount: m.allocatedAdvanceAmount,
        }));
        setMappedVouchers(autoVouchers);
        const total = autoVouchers.reduce((s, item) => s + item.allocatedAmount, 0);
        setSettlementAmount(total || selectedAdv.amountActuallyReceived || selectedAdv.requestedAmount);
      } else {
        // If advance has no vouchers mapped, check if advance employee has a voucher
        const empVoucher = selectedAdv.teamMemberId
          ? vouchers.find((v) => v.teamMemberId === selectedAdv.teamMemberId)
          : null;
        if (empVoucher) {
          setMappedVouchers([
            {
              voucherRecordId: empVoucher.id,
              allocatedAmount: selectedAdv.amountActuallyReceived || selectedAdv.requestedAmount || 0,
            },
          ]);
          setSettlementAmount(selectedAdv.amountActuallyReceived || selectedAdv.requestedAmount || 0);
        }
      }
    }
  };

  const selectedAdvance = advances.find((a) => a.id === advanceRecordId);
  const advanceTeamMember = selectedAdvance?.teamMemberId
    ? teamMembers.find((m) => m.id === selectedAdvance.teamMemberId)
    : null;

  const totalAllocated = mappedVouchers.reduce(
    (sum, m) => sum + (Number(m.allocatedAmount) || 0),
    0
  );

  const eligibleSettlementVouchers = React.useMemo(() => {
    return getVouchersEligibleForSettlement(vouchers, settlementVoucherMappings, settlementToEdit?.id);
  }, [vouchers, settlementVoucherMappings, settlementToEdit]);

  const handleAddVoucherRow = () => {
    const unmapped = eligibleSettlementVouchers.filter(
      (v) => !mappedVouchers.some((m) => m.voucherRecordId === v.id)
    );
    if (unmapped.length > 0) {
      const v = unmapped[0];
      setMappedVouchers([
        ...mappedVouchers,
        { voucherRecordId: v.id, allocatedAmount: v.approvedAmount || v.claimedAmount || 0 },
      ]);
    } else {
      setFormError('All available pending travel vouchers are already mapped to this settlement. Closed or already settled vouchers cannot be settled again.');
    }
  };

  const handleRemoveVoucherRow = (idx: number) => {
    setMappedVouchers(mappedVouchers.filter((_, i) => i !== idx));
    setFormError('');
  };

  const handleUpdateAllocation = (idx: number, field: string, val: any) => {
    setFormError('');
    const updated = [...mappedVouchers];
    if (field === 'voucherRecordId') {
      const duplicate = mappedVouchers.some((m, i) => i !== idx && m.voucherRecordId === val);
      if (duplicate) {
        setFormError('This voucher is already included in this settlement. Duplicate voucher mappings are prevented.');
        return;
      }
      const target = vouchers.find((v) => v.id === val);
      if (target && (target.overallStatus === 'Closed' || target.overallStatus === 'Completed')) {
        setFormError('This voucher is already closed or completed. Closed vouchers cannot be settled again.');
        return;
      }
      updated[idx].voucherRecordId = val;
      if (target && (!updated[idx].allocatedAmount || updated[idx].allocatedAmount === 0)) {
        updated[idx].allocatedAmount = target.approvedAmount || target.claimedAmount || 0;
      }
    } else if (field === 'allocatedAmount') {
      updated[idx].allocatedAmount = Number(val);
    }
    setMappedVouchers(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!settlementId.trim()) {
      setFormError('Settlement ID is required');
      return;
    }
    if (!advanceRecordId) {
      setFormError('Every settlement must be mapped with an Advance ID. Please select an advance.');
      return;
    }
    if (settlementAmount <= 0) {
      setFormError('Settlement Amount must be greater than 0');
      return;
    }

    const finalCompletionDate =
      accountingStatus === 'Completed'
        ? settlementCompletionDate || new Date().toISOString().split('T')[0]
        : settlementCompletionDate || undefined;
    const finalActualSettled =
      actualAmountSettled > 0 ? Number(actualAmountSettled) : Number(settlementAmount);

    const selectedAdv = advances.find((a) => a.id === advanceRecordId);
    const advanceIdVal = selectedAdv?.advanceId || '';

    if (settlementToEdit) {
      updateSettlement(settlementToEdit.id, {
        settlementId: settlementId.trim(),
        advanceRecordId,
        advanceId: advanceIdVal,
        settlementInitiatedDate,
        settlementAmount: Number(settlementAmount),
        remarks,
        settlementType: settlementToEdit.settlementType || 'Advance Adjustment & Final Settlement',
        accountingStatus: accountingStatus as any,
        settlementCompletionDate: finalCompletionDate,
        actualAmountSettled: finalActualSettled,
        accountingReference: accountingReference.trim() || undefined,
      });
    } else {
      addSettlement(
        {
          settlementId: settlementId.trim(),
          advanceRecordId,
          advanceId: advanceIdVal,
          settlementInitiatedDate,
          settlementAmount: Number(settlementAmount),
          remarks,
          settlementType: 'Advance Adjustment & Final Settlement',
          accountingStatus: accountingStatus as any,
          settlementCompletionDate: finalCompletionDate,
          actualAmountSettled: finalActualSettled,
          accountingReference: accountingReference.trim() || undefined,
        },
        mappedVouchers.filter((m) => m.voucherRecordId && m.allocatedAmount > 0)
      );
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                {settlementToEdit ? `Edit Settlement ${settlementToEdit.settlementId}` : 'Raise / Record Accounting Settlement'}
              </h2>
              <span className="text-[11px] text-slate-500">
                Mapped to Advance ID · Records settlement against travel vouchers
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg font-semibold text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Section 1: Advance Mapping (Mandatory requirement: Every settlement mapped with Advance ID) */}
          <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-emerald-950 flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-emerald-700" />
                <span>Mapped Advance ID *</span>
              </label>
              <span className="text-[11px] text-emerald-800 font-semibold bg-emerald-100/80 px-2 py-0.5 rounded">
                Mandatory Mapping
              </span>
            </div>

            <select
              required
              value={advanceRecordId}
              onChange={(e) => handleAdvanceChange(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2 border border-emerald-300 rounded-lg bg-white focus:ring-1 focus:ring-emerald-500 text-slate-900 min-h-[40px]"
            >
              <option value="">Select Disbursed Advance to Settle</option>
              {advances
                .filter(
                  (adv) =>
                    adv.status === 'Disbursed' ||
                    (adv.amountDisbursed && adv.amountDisbursed > 0) ||
                    adv.id === settlementToEdit?.advanceRecordId
                )
                .map((adv) => {
                  const member = adv.teamMemberId ? teamMembers.find((m) => m.id === adv.teamMemberId) : null;
                  const recAmt = adv.amountDisbursed || adv.amountActuallyReceived || adv.requestedAmount;
                  return (
                    <option key={adv.id} value={adv.id}>
                      {adv.advanceId} · Disbursed: ₹{recAmt.toLocaleString('en-IN')} [{adv.status}] {member ? `· ${member.fullName}` : ''} {adv.projectName ? `[${adv.projectName}]` : ''}
                    </option>
                  );
                })}
            </select>
            {advances.filter(
              (adv) =>
                adv.status === 'Disbursed' ||
                (adv.amountDisbursed && adv.amountDisbursed > 0) ||
                adv.id === settlementToEdit?.advanceRecordId
            ).length === 0 && (
              <p className="text-[11px] text-amber-800 font-semibold mt-1">
                ⚠️ No Disbursed advances found. Advances must be Disbursed before creating an Accounting Settlement.
              </p>
            )}

            {selectedAdvance && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] text-emerald-900">
                <div>
                  <span className="text-emerald-700/80 block text-[10px] uppercase font-semibold">Advance ID</span>
                  <span className="font-mono font-bold">{selectedAdvance.advanceId}</span>
                </div>
                <div>
                  <span className="text-emerald-700/80 block text-[10px] uppercase font-semibold">Raised Date</span>
                  <span className="font-medium">{formatIndianDate(selectedAdvance.advanceRaisedDate)}</span>
                </div>
                <div>
                  <span className="text-emerald-700/80 block text-[10px] uppercase font-semibold">Advance Amount</span>
                  <span className="font-mono font-bold text-emerald-800">
                    {formatINR(selectedAdvance.amountActuallyReceived || selectedAdvance.requestedAmount)}
                  </span>
                </div>
                <div>
                  <span className="text-emerald-700/80 block text-[10px] uppercase font-semibold">Status / Team</span>
                  <span className="font-medium truncate block">
                    {selectedAdvance.status} {advanceTeamMember ? `(${advanceTeamMember.fullName})` : ''}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Settlement Master Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Settlement ID *
              </label>
              <input
                type="text"
                required
                value={settlementId}
                onChange={(e) => setSettlementId(e.target.value)}
                placeholder="e.g. Settlement/dheerendrak@dexitglobal.com/001"
                className="w-full font-mono font-medium px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-sky-500 min-h-[40px]"
              />
              <div className="flex items-center justify-between text-[10px] text-slate-500 mt-0.5">
                <span>Format: Settlement/dheerendrak@dexitglobal.com/[Number] · Fully editable</span>
                <button
                  type="button"
                  onClick={() => {
                    const nextSeq = String(settlements.length + 1).padStart(3, '0');
                    setSettlementId(`Settlement/dheerendrak@dexitglobal.com/${nextSeq}`);
                  }}
                  className="text-sky-700 hover:text-sky-900 font-semibold underline"
                >
                  Reset format
                </button>
              </div>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Settlement Initiated Date *
              </label>
              <input
                type="date"
                required
                value={settlementInitiatedDate}
                onChange={(e) => setSettlementInitiatedDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-sky-500 min-h-[40px]"
              />
            </div>
          </div>

          {/* Section 3: Settlement Amount */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <label className="block font-semibold text-slate-700 mb-1">
              Settlement Amount (₹) *
            </label>
            <div className="relative max-w-sm">
              <IndianRupee className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="number"
                required
                min="1"
                value={settlementAmount || ''}
                onChange={(e) => setSettlementAmount(Number(e.target.value))}
                placeholder="0"
                className="w-full pl-8 font-mono text-sm font-semibold px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-sky-500 min-h-[40px]"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Enter the settlement or claimed amount being adjusted against the selected advance.
            </p>
          </div>

          {/* Section 4: Mapped Vouchers Covered by this Settlement */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <div>
                <label className="font-bold text-slate-800 block">
                  Map Vouchers Covered By This Settlement
                </label>
                <span className="text-[11px] text-slate-500">
                  Select travel vouchers and allocated settlement amounts
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddVoucherRow}
                className="px-2.5 py-1 text-[11px] font-semibold bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-md flex items-center gap-1 min-h-[36px]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Voucher</span>
              </button>
            </div>

            {mappedVouchers.length === 0 ? (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-500 text-xs">
                No vouchers currently linked. Click "Add Voucher" above to allocate settlement funds to a voucher.
              </div>
            ) : (
              <div className="space-y-2">
                {mappedVouchers.map((item, idx) => {
                  const targetV = vouchers.find((v) => v.id === item.voucherRecordId);
                  const targetMem = targetV ? teamMembers.find((m) => m.id === targetV.teamMemberId) : null;

                  return (
                    <div key={idx} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex-1">
                        <select
                          value={item.voucherRecordId}
                          onChange={(e) => handleUpdateAllocation(idx, 'voucherRecordId', e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs min-h-[36px] font-medium"
                        >
                          <option value="">-- Select Travel Voucher --</option>
                          {vouchers
                            .filter(
                              (v) =>
                                v.id === item.voucherRecordId ||
                                eligibleSettlementVouchers.some((ev) => ev.id === v.id)
                            )
                            .map((v) => {
                              const mem = teamMembers.find((m) => m.id === v.teamMemberId);
                              const claimedStr = (v.claimedAmount || 0).toLocaleString('en-IN');
                              const approvedStr = (v.approvedAmount || v.claimedAmount || 0).toLocaleString('en-IN');
                              return (
                                <option key={v.id} value={v.id}>
                                  {v.voucherNo} · {mem ? `${mem.fullName} · ` : ''}{v.travelTo} ({v.projectName}) | Claimed: ₹{claimedStr} | Approved: ₹{approvedStr}
                                </option>
                              );
                            })}
                        </select>
                        {targetV && (
                          <div className="flex flex-wrap items-center gap-2 mt-1 px-1 text-[10px] text-slate-500">
                            <span className="font-semibold text-slate-700">
                              Claimed: <strong className="font-mono text-slate-800">{formatINR(targetV.claimedAmount)}</strong>
                            </span>
                            <span>•</span>
                            <span className="font-semibold text-emerald-700">
                              Approved: <strong className="font-mono text-emerald-800">{formatINR(targetV.approvedAmount || targetV.claimedAmount)}</strong>
                            </span>
                            <span>•</span>
                            <span className="text-slate-500">
                              {targetMem?.fullName} ({targetV.travelTo})
                            </span>
                          </div>
                        )}
                      </div>
                    <div className="w-full sm:w-36 flex items-center gap-2">
                      <div className="relative flex-1">
                        <IndianRupee className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="number"
                          min="0"
                          value={item.allocatedAmount || ''}
                          onChange={(e) => handleUpdateAllocation(idx, 'allocatedAmount', e.target.value)}
                          placeholder="Settled ₹"
                          className="w-full pl-6 pr-2 py-1.5 font-mono text-xs border border-slate-300 rounded-lg bg-white min-h-[36px]"
                        />
                      </div>
                      {mappedVouchers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveVoucherRow(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center shrink-0"
                          title="Remove voucher"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              </div>
            )}

            <div className="mt-2 text-right text-[11px] text-slate-500">
              Total Mapped to Vouchers: <strong className="font-mono text-slate-800">{formatINR(totalAllocated)}</strong>
            </div>
          </div>

          {/* Section 5: Accounting Workflow Status & Closure */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Accounting Workflow Status & Closure *</span>
              </label>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                accountingStatus === 'Closed' || accountingStatus === 'Completed'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-sky-100 text-sky-800 border border-sky-300'
              }`}>
                {accountingStatus === 'Closed' || accountingStatus === 'Completed' ? 'Closed in Accounting' : 'In Progress'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { id: 'Closed', label: 'Closed', desc: 'Accounting JV booked; advance & vouchers marked Closed' },
                { id: 'Initiated in Accounting Software', label: 'Initiated in Software', desc: 'Settlement ID generated, pending JV' },
                { id: 'Pending Processing', label: 'Pending Processing', desc: 'Under review by accounts team' },
              ].map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => {
                    setAccountingStatus(item.id);
                    if ((item.id === 'Closed' || item.id === 'Completed') && !settlementCompletionDate) {
                      setSettlementCompletionDate(new Date().toISOString().split('T')[0]);
                    }
                    if ((item.id === 'Closed' || item.id === 'Completed') && (!actualAmountSettled || actualAmountSettled === 0)) {
                      setActualAmountSettled(settlementAmount || 0);
                    }
                  }}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    accountingStatus === item.id || (item.id === 'Closed' && accountingStatus === 'Completed')
                      ? 'border-emerald-500 bg-emerald-50/80 ring-1 ring-emerald-500 font-semibold text-emerald-950'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold">{item.label}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{item.desc}</div>
                </button>
              ))}
            </div>

            {(accountingStatus === 'Closed' || accountingStatus === 'Completed') && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Completion Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={settlementCompletionDate || new Date().toISOString().split('T')[0]}
                    onChange={(e) => setSettlementCompletionDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Actual Settled Amount (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    value={actualAmountSettled || settlementAmount || ''}
                    onChange={(e) => setActualAmountSettled(Number(e.target.value))}
                    className="w-full font-mono px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Accounting Ref / JV No.
                  </label>
                  <input
                    type="text"
                    value={accountingReference}
                    onChange={(e) => setAccountingReference(e.target.value)}
                    placeholder="e.g. JV/2026/0912"
                    className="w-full font-mono px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>
            )}
            <p className="text-[10px] text-slate-500">
              Marking as <strong>Closed in Accounting</strong> automatically transitions all linked travel vouchers to <strong>Completed</strong> status across all tabs.
            </p>
          </div>

          {/* Section 6: Remarks */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Internal Remarks & Reconciliation Notes <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Advance adjusted against travel voucher bills"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-sky-500 min-h-[40px]"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm min-h-[44px] flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{settlementToEdit ? 'Save Changes' : 'Record Settlement'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
