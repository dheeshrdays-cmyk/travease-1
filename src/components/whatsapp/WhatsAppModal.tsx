import React, { useState } from 'react';
import {
  MessageSquare,
  Copy,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  X,
  ShieldCheck,
  User,
  Phone,
  Layers,
  Send,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  normalizeIndianPhone,
  buildWhatsAppClickToChatUrl,
  buildWhatsAppNotificationText,
} from '../../utils/calculations';
import type { NotificationType } from '../../types';

export interface BatchNotificationItem {
  employeeName: string;
  employeePhone: string;
  employeeId: string;
  voucherRecordId: string;
  voucherNo: string;
  projectName?: string;
  startDate?: string;
  endDate?: string;
  advanceAmount?: number;
  disbursedAmount?: number;
  disbursementDate?: string;
  settlementAmount?: number;
}

export const WhatsAppModal: React.FC = () => {
  const {
    whatsAppModalData,
    setWhatsAppModalData,
    initiateWhatsAppNotification,
    confirmWhatsAppSent,
    notifications,
  } = useApp();

  const [copied, setCopied] = useState(false);
  const [createdNotifId, setCreatedNotifId] = useState<string | null>(null);
  const [allowDuplicateSend, setAllowDuplicateSend] = useState(false);
  const [sentConfirmed, setSentConfirmed] = useState(false);
  const [activeItemIndex, setActiveItemIndex] = useState(0);

  if (!whatsAppModalData) return null;

  const isBatch = Boolean(
    whatsAppModalData.batchItems && whatsAppModalData.batchItems.length > 1
  );

  const batchItems: BatchNotificationItem[] = isBatch
    ? whatsAppModalData.batchItems
    : [
        {
          employeeName: whatsAppModalData.employeeName,
          employeePhone: whatsAppModalData.employeePhone,
          employeeId: whatsAppModalData.employeeId,
          voucherRecordId: whatsAppModalData.voucherRecordId,
          voucherNo: whatsAppModalData.voucherNo,
          projectName: whatsAppModalData.projectName,
          startDate: whatsAppModalData.startDate,
          endDate: whatsAppModalData.endDate,
          advanceAmount: whatsAppModalData.advanceAmount,
          disbursedAmount: whatsAppModalData.disbursedAmount,
          disbursementDate: whatsAppModalData.disbursementDate,
          settlementAmount: whatsAppModalData.settlementAmount,
        },
      ];

  const currentItem = batchItems[activeItemIndex] || batchItems[0];
  const type = whatsAppModalData.type as NotificationType;

  const messageText = buildWhatsAppNotificationText(type, {
    employeeName: currentItem.employeeName,
    voucherNo: currentItem.voucherNo,
    projectName: currentItem.projectName,
    startDate: currentItem.startDate,
    endDate: currentItem.endDate,
    advanceAmount: currentItem.advanceAmount,
    disbursedAmount: currentItem.disbursedAmount,
    disbursementDate: currentItem.disbursementDate,
    settlementAmount: currentItem.settlementAmount,
  });

  const normalizedPhone = normalizeIndianPhone(currentItem.employeePhone);
  const waUrl = buildWhatsAppClickToChatUrl(normalizedPhone, messageText);

  // Check if this notification has already been sent
  const existingSent = notifications.find(
    (n) =>
      n.voucherRecordId === currentItem.voucherRecordId &&
      n.notificationType === type &&
      n.status === 'Manually Confirmed Sent'
  );

  const handleSendAndRecord = (item = currentItem) => {
    const itemMsg = buildWhatsAppNotificationText(type, {
      employeeName: item.employeeName,
      voucherNo: item.voucherNo,
      projectName: item.projectName,
      startDate: item.startDate,
      endDate: item.endDate,
      advanceAmount: item.advanceAmount,
      disbursedAmount: item.disbursedAmount,
      disbursementDate: item.disbursementDate,
      settlementAmount: item.settlementAmount,
    });
    const phone = normalizeIndianPhone(item.employeePhone);

    const notif = initiateWhatsAppNotification(type, {
      employeeId: item.employeeId,
      voucherRecordId: item.voucherRecordId,
      messageContent: itemMsg,
      recipientNumber: phone,
    });
    confirmWhatsAppSent(notif.id, 'Dispatched & recorded to voucher audit log');
    setCreatedNotifId(notif.id);

    try {
      navigator.clipboard.writeText(itemMsg);
      setCopied(true);
    } catch {
      // Ignore clipboard error
    }

    try {
      const url = buildWhatsAppClickToChatUrl(phone, itemMsg);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      // Ignore window open error
    }

    setSentConfirmed(true);
    setTimeout(() => {
      if (isBatch && activeItemIndex < batchItems.length - 1) {
        setActiveItemIndex((prev) => prev + 1);
        setSentConfirmed(false);
        setCreatedNotifId(null);
        setCopied(false);
      } else {
        setWhatsAppModalData(null);
      }
    }, 1200);
  };

  const handleOpenWhatsApp = (item = currentItem) => {
    const itemMsg = buildWhatsAppNotificationText(type, {
      employeeName: item.employeeName,
      voucherNo: item.voucherNo,
      projectName: item.projectName,
      startDate: item.startDate,
      endDate: item.endDate,
      advanceAmount: item.advanceAmount,
      disbursedAmount: item.disbursedAmount,
      disbursementDate: item.disbursementDate,
      settlementAmount: item.settlementAmount,
    });
    const phone = normalizeIndianPhone(item.employeePhone);

    const notif = initiateWhatsAppNotification(type, {
      employeeId: item.employeeId,
      voucherRecordId: item.voucherRecordId,
      messageContent: itemMsg,
      recipientNumber: phone,
    });
    setCreatedNotifId(notif.id);

    const url = buildWhatsAppClickToChatUrl(phone, itemMsg);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleConfirmSent = () => {
    if (createdNotifId) {
      confirmWhatsAppSent(createdNotifId, 'Sent via WhatsApp Web / Mobile');
    } else {
      const notif = initiateWhatsAppNotification(type, {
        employeeId: currentItem.employeeId,
        voucherRecordId: currentItem.voucherRecordId,
        messageContent: messageText,
        recipientNumber: normalizedPhone,
      });
      confirmWhatsAppSent(notif.id, 'Confirmed sent by administrator');
    }
    setSentConfirmed(true);
    setTimeout(() => {
      if (isBatch && activeItemIndex < batchItems.length - 1) {
        setActiveItemIndex((prev) => prev + 1);
        setSentConfirmed(false);
        setCreatedNotifId(null);
      } else {
        setWhatsAppModalData(null);
      }
    }, 1200);
  };

  const handleConfirmAllBatchSent = () => {
    batchItems.forEach((item) => {
      const itemMsg = buildWhatsAppNotificationText(type, {
        employeeName: item.employeeName,
        voucherNo: item.voucherNo,
        projectName: item.projectName,
        startDate: item.startDate,
        endDate: item.endDate,
        advanceAmount: item.advanceAmount,
        disbursedAmount: item.disbursedAmount,
        disbursementDate: item.disbursementDate,
        settlementAmount: item.settlementAmount,
      });
      const phone = normalizeIndianPhone(item.employeePhone);
      const notif = initiateWhatsAppNotification(type, {
        employeeId: item.employeeId,
        voucherRecordId: item.voucherRecordId,
        messageContent: itemMsg,
        recipientNumber: phone,
      });
      confirmWhatsAppSent(notif.id, 'Confirmed sent via batch dispatch');
    });

    setSentConfirmed(true);
    setTimeout(() => {
      setWhatsAppModalData(null);
    }, 1200);
  };

  const handleClose = () => {
    setWhatsAppModalData(null);
    setCreatedNotifId(null);
    setSentConfirmed(false);
    setActiveItemIndex(0);
  };

  // Past notifications for the currently inspected voucher
  const voucherPastNotifs = notifications.filter(
    (n) => n.voucherRecordId === currentItem.voucherRecordId
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                  WhatsApp Notification Dispatch
                </h2>
                {isBatch && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {batchItems.length} Mapped Vouchers
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-500">
                {isBatch
                  ? 'Notify all mapped vouchers for this transaction'
                  : 'Sends WhatsApp message & records complete history in voucher card'}
              </span>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* If batch, show mapped vouchers selector tabs */}
          {isBatch && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-emerald-600" />
                <span>Mapped Vouchers ({batchItems.length})</span>
              </label>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {batchItems.map((item, idx) => {
                  const isActive = activeItemIndex === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setActiveItemIndex(idx);
                        setSentConfirmed(false);
                        setCreatedNotifId(null);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
                        isActive
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {item.voucherNo} · {item.employeeName.split(' ')[0]}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recipient & Voucher Info Bar */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <div className="truncate">
                <span className="text-[10px] uppercase text-slate-400 block font-semibold">Recipient</span>
                <span className="font-semibold text-slate-800 truncate block">{currentItem.employeeName}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <div className="truncate">
                <span className="text-[10px] uppercase text-slate-400 block font-semibold">WhatsApp Number</span>
                <span className="font-mono text-slate-800 block">+{normalizedPhone}</span>
              </div>
            </div>
          </div>

          {/* Past notification status info banner */}
          {existingSent && (
            <div className="p-2.5 bg-sky-50 rounded-xl border border-sky-200 text-xs text-sky-900 flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Previously Sent Update</span>
                <span className="text-[11px] text-sky-700">
                  A &apos;{type}&apos; notification was already recorded on{' '}
                  {existingSent.manuallyConfirmedSentDateTime
                    ? new Date(existingSent.manuallyConfirmedSentDateTime).toLocaleString('en-IN')
                    : 'earlier'}. You can send an updated notification below anytime.
                </span>
              </div>
            </div>
          )}

          {/* Privacy and Policy Safeguard Badge */}
          <div className="flex items-center gap-2 text-[11px] text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Standard Rule: Advance ID is masked. Voucher No. ({currentItem.voucherNo}) is used.
            </span>
          </div>

          {/* Message Preview Box */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">
                Message Content ({type})
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copied ? 'Copied!' : 'Copy Text'}</span>
              </button>
            </div>
            <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-200 text-xs text-slate-800 leading-relaxed font-sans relative">
              <p className="whitespace-pre-wrap">{messageText}</p>
            </div>
          </div>

          {/* History of messages previously sent for this voucher */}
          {voucherPastNotifs.length > 0 && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Past Notifications Sent for this Voucher ({voucherPastNotifs.length})
                </span>
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {voucherPastNotifs.map((n) => (
                  <div
                    key={n.id}
                    className="p-2 bg-white rounded-lg border border-slate-200 text-[11px] space-y-1"
                  >
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="font-semibold text-slate-800">{n.notificationType}</span>
                      <span className="font-mono text-[10px]">
                        {n.manuallyConfirmedSentDateTime
                          ? new Date(n.manuallyConfirmedSentDateTime).toLocaleString('en-IN')
                          : n.initiatedTimestamp}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[10px] line-clamp-2">{n.messageContent}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Batch Quick Action if multiple items */}
          {isBatch && (
            <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  Batch Dispatch for All {batchItems.length} Mapped Vouchers:
                </span>
                <button
                  type="button"
                  onClick={handleConfirmAllBatchSent}
                  className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs flex items-center gap-1.5"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Confirm All Sent</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCopy}
            className="w-full sm:w-auto px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 min-h-[44px] flex items-center justify-center gap-1.5"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copied ? 'Copied to Clipboard' : 'Copy Message'}</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* 1-Click Send and Record to Voucher History */}
            <button
              type="button"
              onClick={() => handleSendAndRecord(currentItem)}
              disabled={sentConfirmed}
              className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold text-white rounded-lg shadow-sm min-h-[44px] flex items-center justify-center gap-1.5 transition-colors ${
                sentConfirmed
                  ? 'bg-emerald-700 cursor-default'
                  : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95'
              }`}
            >
              {sentConfirmed ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Recorded in Voucher History ✓</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send & Record in History</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
