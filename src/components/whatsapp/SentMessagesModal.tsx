import React, { useState } from 'react';
import {
  X,
  MessageSquare,
  Search,
  CheckCircle,
  Clock,
  Copy,
  ExternalLink,
  Filter,
  ShieldCheck,
  User,
  Phone,
  Calendar,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  formatIndianDate,
  buildWhatsAppClickToChatUrl,
  normalizeIndianPhone,
} from '../../utils/calculations';

interface SentMessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultVoucherId?: string;
}

export const SentMessagesModal: React.FC<SentMessagesModalProps> = ({
  isOpen,
  onClose,
  defaultVoucherId,
}) => {
  const { notifications, teamMembers, vouchers } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredLogs = notifications.filter((log) => {
    if (defaultVoucherId && log.voucherRecordId !== defaultVoucherId) {
      return false;
    }
    if (typeFilter !== 'all' && log.notificationType !== typeFilter) {
      return false;
    }
    if (statusFilter !== 'all' && log.status !== statusFilter) {
      return false;
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const member = teamMembers.find((m) => m.id === log.employeeId);
      const voucher = vouchers.find((v) => v.id === log.voucherRecordId);
      const matchEmp = member?.fullName.toLowerCase().includes(q) || false;
      const matchPhone = log.recipientNumber.toLowerCase().includes(q);
      const matchVoucher = voucher?.voucherNo.toLowerCase().includes(q) || false;
      const matchContent = log.messageContent.toLowerCase().includes(q);
      const matchType = log.notificationType.toLowerCase().includes(q);

      if (!matchEmp && !matchPhone && !matchVoucher && !matchContent && !matchType) {
        return false;
      }
    }
    return true;
  });

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleResend = (log: typeof notifications[0]) => {
    const url = buildWhatsAppClickToChatUrl(log.recipientNumber, log.messageContent);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 leading-tight">
                  WhatsApp Notification Register & Audit Log
                </h2>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {notifications.length} total messages
                </span>
              </div>
              <span className="text-[11px] text-slate-500">
                Complete record of status notifications sent to employees via WhatsApp
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-slate-100 bg-white space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search employee, phone, voucher, text..."
                className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="all">All Message Status Types</option>
                <option value="Voucher Approved">Voucher Approved</option>
                <option value="Approved">Approved</option>
                <option value="Advance Raised">Advance Raised</option>
                <option value="Advance Approved">Advance Approved</option>
                <option value="Amount Disbursed">Amount Disbursed</option>
                <option value="Pending for Settlement">Pending for Settlement</option>
                <option value="Settlement Initiated">Settlement Initiated</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="all">All Delivery States</option>
                <option value="Manually Confirmed Sent">Manually Confirmed Sent</option>
                <option value="Opened in WhatsApp">Opened in WhatsApp</option>
              </select>
            </div>
          </div>
        </div>

        {/* Message Log Table / Cards */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="font-semibold text-slate-600">No sent notification records match your filter.</p>
              <p className="text-slate-400 mt-0.5">Click &apos;Notify&apos; on any travel voucher or advance to dispatch WhatsApp messages.</p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const member = teamMembers.find((m) => m.id === log.employeeId);
              const voucher = vouchers.find((v) => v.id === log.voucherRecordId);
              const isConfirmed = log.status === 'Manually Confirmed Sent';

              return (
                <div
                  key={log.id}
                  className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:border-slate-300 transition-all space-y-2.5"
                >
                  {/* Top Row: Employee, Voucher, Type, Timestamp */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900 flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {member?.fullName || 'Employee'}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        +{log.recipientNumber}
                      </span>
                      {voucher && (
                        <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {voucher.voucherNo}
                        </span>
                      )}
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {log.notificationType}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded flex items-center gap-1 ${
                          isConfirmed
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-sky-50 text-sky-700 border border-sky-200'
                        }`}
                      >
                        {isConfirmed ? (
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Clock className="w-3 h-3 text-sky-600" />
                        )}
                        <span>{log.status}</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(log.initiatedTimestamp).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Message Content */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-wrap">
                    {log.messageContent}
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-[10px] text-slate-400 font-mono">
                      Log ID: {log.id} {log.remarks ? `· ${log.remarks}` : ''}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopy(log.id, log.messageContent)}
                        className="px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-md flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copiedId === log.id ? 'Copied' : 'Copy Text'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleResend(log)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Resend via WhatsApp</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>All messages logged permanently in system audit register.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-white rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
