import React, { useState, useEffect } from 'react';
import { X, ArrowDownToLine, Save, IndianRupee, AlertCircle, CheckCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatINR, formatIndianDate } from '../../utils/calculations';
import type { AccountsRecoveryRequest } from '../../types';

interface AllocateReceiptModalProps {
  recovery: AccountsRecoveryRequest;
  onClose: () => void;
}

export const AllocateReceiptModal: React.FC<AllocateReceiptModalProps> = ({
  recovery,
  onClose,
}) => {
  const {
    recoveryPaymentMappings,
    vendorPayments,
    vouchers,
    allocateRecoveryReceipt,
  } = useApp();

  const [receiptDate, setReceiptDate] = useState('');
  const [receiptRef, setReceiptRef] = useState('');
  const [amountReceivedNow, setAmountReceivedNow] = useState<number>(0);
  const [allocations, setAllocations] = useState<{ paymentId: string; allocatedAmount: number }[]>([]);
  const [formError, setFormError] = useState('');

  // Find all mapped payments under this recovery
  const mappings = recoveryPaymentMappings.filter((m) => m.recoveryRecordId === recovery.id);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setReceiptDate(today);
    setReceiptRef(`RTGS-REC-${Date.now().toString().slice(-6)}`);

    // Default amount received to outstanding amount
    const remaining = Math.max(0, recovery.requestedAmount - recovery.amountReceived);
    setAmountReceivedNow(remaining);

    // Initial allocations: distribute proportionally or sequentially
    let remainingToDistribute = remaining;
    const initialAlloc = mappings.map((m) => {
      const needed = m.amountRequestedForRecovery - m.amountRecovered;
      const alloc = Math.min(needed, remainingToDistribute);
      remainingToDistribute -= alloc;
      return {
        paymentId: m.vendorPaymentRecordId,
        allocatedAmount: alloc,
      };
    });
    setAllocations(initialAlloc);
  }, [recovery, recoveryPaymentMappings]);

  const totalAllocatedNow = allocations.reduce((sum, a) => sum + (Number(a.allocatedAmount) || 0), 0);

  const handleAllocationChange = (paymentId: string, val: number) => {
    setAllocations((prev) =>
      prev.map((a) => (a.paymentId === paymentId ? { ...a, allocatedAmount: Number(val) } : a))
    );
  };

  const handleAutoDistribute = (amount: number) => {
    setAmountReceivedNow(amount);
    let remaining = amount;
    const newAlloc = mappings.map((m) => {
      const needed = Math.max(0, m.amountRequestedForRecovery - m.amountRecovered);
      const alloc = Math.min(needed, remaining);
      remaining -= alloc;
      return {
        paymentId: m.vendorPaymentRecordId,
        allocatedAmount: alloc,
      };
    });
    setAllocations(newAlloc);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amountReceivedNow <= 0) {
      setFormError('Amount received must be greater than 0');
      return;
    }
    if (totalAllocatedNow !== amountReceivedNow) {
      setFormError(
        `Allocated sum (${formatINR(totalAllocatedNow)}) must exactly match received amount (${formatINR(amountReceivedNow)})`
      );
      return;
    }

    allocateRecoveryReceipt(
      recovery.id,
      amountReceivedNow,
      receiptDate,
      receiptRef.trim(),
      allocations
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden text-xs">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <ArrowDownToLine className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                Record Accounts Reimbursement Receipt
              </h2>
              <span className="text-[11px] text-slate-500">
                Recovery Request: <strong className="font-mono">{recovery.recoveryRef}</strong>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg font-semibold text-rose-700">
              {formError}
            </div>
          )}

          {/* Current Request Balance State */}
          <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <div>
              <span className="text-slate-400 text-[10px] uppercase block">Total Requested</span>
              <span className="font-mono font-bold text-slate-800">{formatINR(recovery.requestedAmount)}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase block">Previously Received</span>
              <span className="font-mono font-bold text-emerald-700">{formatINR(recovery.amountReceived)}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase block">Outstanding</span>
              <span className="font-mono font-bold text-amber-700">
                {formatINR(recovery.requestedAmount - recovery.amountReceived)}
              </span>
            </div>
          </div>

          {/* Receipt Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Amount Received Now from Accounts (₹) *
              </label>
              <div className="relative">
                <IndianRupee className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  required
                  min="1"
                  max={recovery.requestedAmount - recovery.amountReceived}
                  value={amountReceivedNow || ''}
                  onChange={(e) => handleAutoDistribute(Number(e.target.value))}
                  placeholder="0"
                  className="w-full font-mono pl-8 pr-3 py-2 border border-slate-300 rounded-lg bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Receipt Date *
              </label>
              <input
                type="date"
                required
                value={receiptDate}
                onChange={(e) => setReceiptDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Receipt Transaction / RTGS / UTR Reference
            </label>
            <input
              type="text"
              value={receiptRef}
              onChange={(e) => setReceiptRef(e.target.value)}
              placeholder="e.g. RTGS-ACC-9901"
              className="w-full font-mono px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          {/* Payment Item Allocation Breakdown (Section 10) */}
          <div className="pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <label className="font-bold text-slate-900 block">
                Allocate Received Funds Across Personal Payment Records
              </label>
              <span className="text-[11px] text-slate-500 font-mono">
                Allocated: {formatINR(totalAllocatedNow)} / {formatINR(amountReceivedNow)}
              </span>
            </div>

            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {mappings.map((m) => {
                const payment = vendorPayments.find((p) => p.id === m.vendorPaymentRecordId);
                const voucher = vouchers.find((v) => v.id === m.voucherRecordId);
                const currentAlloc = allocations.find((a) => a.paymentId === m.vendorPaymentRecordId)?.allocatedAmount || 0;
                const outstandingOnItem = m.amountRequestedForRecovery - m.amountRecovered;

                return (
                  <div key={m.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-800">{payment?.vendorName}</span>
                        <span className="text-[11px] font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded ml-2">
                          {voucher?.voucherNo}
                        </span>
                      </div>
                      <div className="text-right text-[11px] text-slate-500">
                        Item Claim: <strong className="font-mono text-slate-800">{formatINR(m.amountRequestedForRecovery)}</strong> · Pending: <span className="font-mono font-bold text-amber-700">{formatINR(outstandingOnItem)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-600">Allocate from this receipt:</span>
                      <div className="w-36 ml-auto">
                        <div className="relative">
                          <IndianRupee className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="number"
                            min="0"
                            max={outstandingOnItem}
                            value={currentAlloc || ''}
                            onChange={(e) => handleAllocationChange(m.vendorPaymentRecordId, Number(e.target.value))}
                            placeholder="0"
                            className="w-full pl-6 pr-2 py-1 font-mono text-xs border border-slate-300 rounded-lg bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
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
            className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm min-h-[44px] flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Confirm & Allocate Receipt</span>
          </button>
        </div>
      </div>
    </div>
  );
};
