import React, { useState } from 'react';
import {
  CreditCard,
  Plus,
  Search,
  IndianRupee,
  Calendar,
  Building,
  CheckCircle,
  Clock,
  Edit2,
  Trash2,
  Send,
  Plane,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatINR, formatIndianDate, calcPaymentOutstandingRecovery } from '../utils/calculations';
import type { VendorPaymentRecord } from '../types';

interface VendorPaymentsViewProps {
  onAddPayment: () => void;
  onEditPayment: (payment: VendorPaymentRecord) => void;
  onCreateRecoveryForPayment: (paymentId: string) => void;
}

export const VendorPaymentsView: React.FC<VendorPaymentsViewProps> = ({
  onAddPayment,
  onEditPayment,
  onCreateRecoveryForPayment,
}) => {
  const {
    vendorPayments,
    vouchers,
    teamMembers,
    recoveryPaymentMappings,
    deleteVendorPayment,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const filtered = vendorPayments.filter((p) => {
    if (sourceFilter !== 'all' && p.paymentSource !== sourceFilter) return false;
    if (categoryFilter !== 'all' && p.expenseCategory !== categoryFilter) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const voucher = vouchers.find((v) => v.id === p.voucherRecordId);
      const member = teamMembers.find((m) => m.id === p.employeeId);

      const matchVendor = p.vendorName.toLowerCase().includes(q);
      const matchBooking = p.bookingRef?.toLowerCase().includes(q) || false;
      const matchInvoice = p.vendorInvoiceNo?.toLowerCase().includes(q) || false;
      const matchVoucher = voucher?.voucherNo.toLowerCase().includes(q) || false;
      const matchEmp = member?.fullName.toLowerCase().includes(q) || false;

      if (!matchVendor && !matchBooking && !matchInvoice && !matchVoucher && !matchEmp) {
        return false;
      }
    }
    return true;
  });

  const totalPersonalPaid = vendorPayments
    .filter((p) => p.paymentSource === 'Personal Funds')
    .reduce((sum, p) => sum + p.amountPaid, 0);

  const totalCompanyPaid = vendorPayments
    .filter((p) => p.paymentSource === 'Company Funds')
    .reduce((sum, p) => sum + p.amountPaid, 0);

  return (
    <div className="space-y-5 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Direct Travel Bookings & Vendor Payments
            </h1>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
              {filtered.length} records
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Strict separation between administrator personal funds and direct company funds
          </p>
        </div>

        <button
          onClick={onAddPayment}
          className="px-4 py-2.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-all min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          <span>Record Vendor Payment</span>
        </button>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200 flex items-center justify-between">
          <div>
            <span className="text-amber-800 font-semibold block">Total Administrator Personal Payments:</span>
            <span className="text-[11px] text-amber-700">Eligible for Accounts recovery reimbursement</span>
          </div>
          <span className="text-lg font-bold font-mono text-amber-950">
            {formatINR(totalPersonalPaid)}
          </span>
        </div>

        <div className="p-3.5 bg-sky-50/70 rounded-xl border border-sky-200 flex items-center justify-between">
          <div>
            <span className="text-sky-800 font-semibold block">Total Direct Company Bookings:</span>
            <span className="text-[11px] text-sky-700">Paid from corporate credit card / company bank</span>
          </div>
          <span className="text-lg font-bold font-mono text-sky-950">
            {formatINR(totalCompanyPaid)}
          </span>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search vendor, booking ref, invoice, voucher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg bg-white"
          >
            <option value="all">All Sources</option>
            <option value="Personal Funds">Administrator Personal Funds</option>
            <option value="Company Funds">Company Funds</option>
            <option value="Employee Personal Funds">Employee Personal Funds</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg bg-white"
          >
            <option value="all">All Categories</option>
            <option value="Flight">Flight</option>
            <option value="Train">Train</option>
            <option value="Hotel">Hotel</option>
            <option value="Taxi / Cab">Taxi / Cab</option>
            <option value="Meals">Meals</option>
          </select>
        </div>
      </div>

      {/* Payment Cards */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
          <CreditCard className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="font-semibold text-slate-700">No vendor payments found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((payment) => {
            const voucher = vouchers.find((v) => v.id === payment.voucherRecordId);
            const member = teamMembers.find((m) => m.id === payment.employeeId);
            const isPersonal = payment.paymentSource === 'Personal Funds';
            const outstanding = calcPaymentOutstandingRecovery(payment, recoveryPaymentMappings);

            return (
              <div
                key={payment.id}
                className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:border-slate-300 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">
                      {payment.vendorName}
                    </span>
                    <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                      {voucher?.voucherNo}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 font-medium text-slate-700">
                      {payment.expenseCategory}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded font-semibold text-[11px] ${
                        isPersonal
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-sky-100 text-sky-800'
                      }`}
                    >
                      {payment.paymentSource}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-slate-500 text-[11px]">
                    <div>Traveller: <strong className="text-slate-800">{member?.fullName}</strong></div>
                    <div>Paid On: <strong>{formatIndianDate(payment.paymentDate)}</strong></div>
                    <div>Booking Ref: <strong className="font-mono">{payment.bookingRef || '—'}</strong></div>
                    <div>Invoice: <strong className="font-mono">{payment.vendorInvoiceNo || '—'}</strong></div>
                    <div>Method: <strong>{payment.paymentMethod}</strong></div>
                  </div>

                  {isPersonal && (
                    <div className="flex items-center gap-2 text-[11px] mt-0.5">
                      <span className="text-slate-500">Recovery Status:</span>
                      <span className="font-semibold text-amber-800">{payment.recoveryStatus}</span>
                      {outstanding > 0 && (
                        <span className="font-mono text-amber-700">
                          (Pending: {formatINR(outstanding)})
                        </span>
                      )}
                    </div>
                  )}

                  {payment.remarks && <div className="text-[11px] text-slate-600 italic">{payment.remarks}</div>}
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="text-right">
                    <span className="font-mono text-base font-bold text-slate-900 block">
                      {formatINR(payment.amountPaid)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{payment.id}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isPersonal && payment.recoveryStatus === 'Not Requested' && (
                      <button
                        type="button"
                        onClick={() => onCreateRecoveryForPayment(payment.id)}
                        className="px-2.5 py-1.5 text-xs font-semibold bg-violet-50 hover:bg-violet-100 text-violet-800 border border-violet-200 rounded-lg flex items-center gap-1 min-h-[36px]"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Recover</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onEditPayment(payment)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 min-h-[36px] min-w-[36px] flex items-center justify-center"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteVendorPayment(payment.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 min-h-[36px] min-w-[36px] flex items-center justify-center"
                      title="Delete Vendor Payment"
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
