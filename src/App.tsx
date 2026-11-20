import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/common/Header';
import { BottomTabBar } from './components/common/BottomTabBar';
import { DashboardView } from './views/DashboardView';
import { ProjectsView } from './views/ProjectsView';
import { VouchersView } from './views/VouchersView';
import { AdvancesView } from './views/AdvancesView';
import { DisbursementsView } from './views/DisbursementsView';
import { SettlementsView } from './views/SettlementsView';
import { VendorPaymentsView } from './views/VendorPaymentsView';
import { RecoveriesView } from './views/RecoveriesView';
import { TeamMembersView } from './views/TeamMembersView';
import { ReportsView } from './views/ReportsView';
import { ActivityLogView } from './views/ActivityLogView';
import { SettingsView } from './views/SettingsView';

// Modals
import { ProjectModal } from './components/projects/ProjectModal';
import { VoucherModal } from './components/vouchers/VoucherModal';
import { VoucherDetailModal } from './components/vouchers/VoucherDetailModal';
import { AdvanceModal } from './components/advances/AdvanceModal';
import { DisbursementModal } from './components/disbursements/DisbursementModal';
import { SettlementModal } from './components/settlements/SettlementModal';
import { VendorPaymentModal } from './components/vendorPayments/VendorPaymentModal';
import { RecoveryModal } from './components/recoveries/RecoveryModal';
import { AllocateReceiptModal } from './components/recoveries/AllocateReceiptModal';
import { TeamModal } from './components/team/TeamModal';
import { WhatsAppModal } from './components/whatsapp/WhatsAppModal';
import { GoogleSheetsModal } from './components/googleSheets/GoogleSheetsModal';

import type {
  ProjectRecord,
  TravelVoucher,
  AdvanceRecord,
  EmployeeDisbursement,
  SettlementRecord,
  VendorPaymentRecord,
  AccountsRecoveryRequest,
  TeamMember,
} from './types';
import {
  Briefcase,
  FileSpreadsheet,
  History,
  Settings as SettingsIcon,
  Users,
  CreditCard,
  RefreshCw,
  ArrowDownToLine,
  X,
  Plane,
} from 'lucide-react';

const MainLayout: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    selectedVoucherId,
    setSelectedVoucherId,
    isGoogleSheetsModalOpen,
    setIsGoogleSheetsModalOpen,
  } = useApp();

  // Modal states
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<ProjectRecord | null>(null);

  const [voucherModalOpen, setVoucherModalOpen] = useState(false);
  const [voucherToEdit, setVoucherToEdit] = useState<TravelVoucher | null>(null);

  const [advanceModalOpen, setAdvanceModalOpen] = useState(false);
  const [advanceToEdit, setAdvanceToEdit] = useState<AdvanceRecord | null>(null);

  const [disbursementModalOpen, setDisbursementModalOpen] = useState(false);
  const [disbursementToEdit, setDisbursementToEdit] = useState<EmployeeDisbursement | null>(null);
  const [disbursementDefaultAdvanceId, setDisbursementDefaultAdvanceId] = useState<string | undefined>();

  const [settlementModalOpen, setSettlementModalOpen] = useState(false);
  const [settlementToEdit, setSettlementToEdit] = useState<SettlementRecord | null>(null);
  const [settlementDefaultAdvanceId, setSettlementDefaultAdvanceId] = useState<string | undefined>();

  const [vendorPaymentModalOpen, setVendorPaymentModalOpen] = useState(false);
  const [paymentToEdit, setPaymentToEdit] = useState<VendorPaymentRecord | null>(null);
  const [paymentDefaultVoucherId, setPaymentDefaultVoucherId] = useState<string | undefined>();

  const [recoveryModalOpen, setRecoveryModalOpen] = useState(false);
  const [recoveryToEdit, setRecoveryToEdit] = useState<AccountsRecoveryRequest | null>(null);

  const [allocateReceiptRecovery, setAllocateReceiptRecovery] = useState<AccountsRecoveryRequest | null>(null);

  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<TeamMember | null>(null);

  const [moreDrawerOpen, setMoreDrawerOpen] = useState(false);

  // Quick Action Handler
  const handleQuickAction = (
    action: 'voucher' | 'advance' | 'settlement' | 'disbursement' | 'payment' | 'recovery' | 'project'
  ) => {
    if (action === 'project') {
      setProjectToEdit(null);
      setProjectModalOpen(true);
    } else if (action === 'voucher') {
      setVoucherToEdit(null);
      setVoucherModalOpen(true);
    } else if (action === 'advance') {
      setAdvanceToEdit(null);
      setAdvanceModalOpen(true);
    } else if (action === 'settlement') {
      setSettlementToEdit(null);
      setSettlementDefaultAdvanceId(undefined);
      setSettlementModalOpen(true);
    } else if (action === 'disbursement') {
      setDisbursementToEdit(null);
      setDisbursementDefaultAdvanceId(undefined);
      setDisbursementModalOpen(true);
    } else if (action === 'payment') {
      setPaymentToEdit(null);
      setPaymentDefaultVoucherId(undefined);
      setVendorPaymentModalOpen(true);
    } else if (action === 'recovery') {
      setRecoveryToEdit(null);
      setRecoveryModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
      {/* Top Header */}
      <Header onOpenQuickAction={handleQuickAction} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-4 pb-28 lg:py-6">
        {activeTab === 'dashboard' && (
          <DashboardView onOpenQuickAction={handleQuickAction} />
        )}
        {activeTab === 'projects' && (
          <ProjectsView
            onAddProject={() => {
              setProjectToEdit(null);
              setProjectModalOpen(true);
            }}
            onEditProject={(p) => {
              setProjectToEdit(p);
              setProjectModalOpen(true);
            }}
          />
        )}
        {activeTab === 'vouchers' && (
          <VouchersView
            onAddVoucher={() => {
              setVoucherToEdit(null);
              setVoucherModalOpen(true);
            }}
            onEditVoucher={(v) => {
              setVoucherToEdit(v);
              setVoucherModalOpen(true);
            }}
            onViewVoucher={(vId) => setSelectedVoucherId(vId)}
          />
        )}
        {activeTab === 'advances' && (
          <AdvancesView
            onAddAdvance={() => {
              setAdvanceToEdit(null);
              setAdvanceModalOpen(true);
            }}
            onEditAdvance={(adv) => {
              setAdvanceToEdit(adv);
              setAdvanceModalOpen(true);
            }}
            onRecordDisbursement={(advId) => {
              setDisbursementToEdit(null);
              setDisbursementDefaultAdvanceId(advId);
              setDisbursementModalOpen(true);
            }}
            onRaiseSettlement={(advId) => {
              setSettlementToEdit(null);
              setSettlementDefaultAdvanceId(advId);
              setSettlementModalOpen(true);
            }}
          />
        )}
        {activeTab === 'disbursements' && (
          <DisbursementsView
            onAddDisbursement={() => {
              setDisbursementToEdit(null);
              setDisbursementDefaultAdvanceId(undefined);
              setDisbursementModalOpen(true);
            }}
            onEditDisbursement={(d) => {
              setDisbursementToEdit(d);
              setDisbursementModalOpen(true);
            }}
          />
        )}
        {activeTab === 'settlements' && (
          <SettlementsView
            onAddSettlement={() => {
              setSettlementToEdit(null);
              setSettlementModalOpen(true);
            }}
            onEditSettlement={(s) => {
              setSettlementToEdit(s);
              setSettlementModalOpen(true);
            }}
          />
        )}
        {activeTab === 'vendorPayments' && (
          <VendorPaymentsView
            onAddPayment={() => {
              setPaymentToEdit(null);
              setPaymentDefaultVoucherId(undefined);
              setVendorPaymentModalOpen(true);
            }}
            onEditPayment={(p) => {
              setPaymentToEdit(p);
              setVendorPaymentModalOpen(true);
            }}
            onCreateRecoveryForPayment={(_pid) => {
              setRecoveryToEdit(null);
              setRecoveryModalOpen(true);
            }}
          />
        )}
        {activeTab === 'recoveries' && (
          <RecoveriesView
            onAddRecovery={() => {
              setRecoveryToEdit(null);
              setRecoveryModalOpen(true);
            }}
            onEditRecovery={(r) => {
              setRecoveryToEdit(r);
              setRecoveryModalOpen(true);
            }}
            onAllocateReceipt={(r) => {
              setAllocateReceiptRecovery(r);
            }}
          />
        )}
        {activeTab === 'team' && (
          <TeamMembersView
            onAddMember={() => {
              setMemberToEdit(null);
              setTeamModalOpen(true);
            }}
            onEditMember={(m) => {
              setMemberToEdit(m);
              setTeamModalOpen(true);
            }}
          />
        )}
        {activeTab === 'reports' && <ReportsView />}
        {activeTab === 'history' && <ActivityLogView />}
        {activeTab === 'settings' && <SettingsView />}
      </main>

      {/* Mobile Bottom Thumb Tab Bar */}
      <BottomTabBar onOpenMoreMenu={() => setMoreDrawerOpen(true)} />

      {/* Mobile "More Menu" Bottom Sheet */}
      {moreDrawerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div
            className="flex-1"
            onClick={() => setMoreDrawerOpen(false)}
          />
          <div className="bg-white rounded-t-3xl shadow-2xl p-5 space-y-4 max-h-[80vh] overflow-y-auto">
            {/* Grab handle */}
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto -mt-1 mb-2" />

            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">More Operations</h3>
              <button
                onClick={() => setMoreDrawerOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => {
                  setActiveTab('projects');
                  setMoreDrawerOpen(false);
                }}
                className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-left font-medium text-slate-800 flex items-center gap-2.5 min-h-[48px]"
              >
                <Briefcase className="w-4 h-4 text-emerald-600" />
                <span>Projects</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('vouchers');
                  setMoreDrawerOpen(false);
                }}
                className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-left font-medium text-slate-800 flex items-center gap-2.5 min-h-[48px]"
              >
                <Plane className="w-4 h-4 text-indigo-600" />
                <span>Travel Vouchers</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('disbursements');
                  setMoreDrawerOpen(false);
                }}
                className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-left font-medium text-slate-800 flex items-center gap-2.5 min-h-[48px]"
              >
                <ArrowDownToLine className="w-4 h-4 text-sky-600" />
                <span>Disbursements</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('settlements');
                  setMoreDrawerOpen(false);
                }}
                className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-left font-medium text-slate-800 flex items-center gap-2.5 min-h-[48px]"
              >
                <RefreshCw className="w-4 h-4 text-indigo-600" />
                <span>Settlements</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('vendorPayments');
                  setMoreDrawerOpen(false);
                }}
                className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-left font-medium text-slate-800 flex items-center gap-2.5 min-h-[48px]"
              >
                <CreditCard className="w-4 h-4 text-amber-600" />
                <span>Vendor Payments</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('team');
                  setMoreDrawerOpen(false);
                }}
                className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-left font-medium text-slate-800 flex items-center gap-2.5 min-h-[48px]"
              >
                <Users className="w-4 h-4 text-emerald-600" />
                <span>Team Roster</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('reports');
                  setMoreDrawerOpen(false);
                }}
                className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-left font-medium text-slate-800 flex items-center gap-2.5 min-h-[48px]"
              >
                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                <span>Reports & CSV</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('history');
                  setMoreDrawerOpen(false);
                }}
                className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-left font-medium text-slate-800 flex items-center gap-2.5 min-h-[48px]"
              >
                <History className="w-4 h-4 text-violet-600" />
                <span>Activity History</span>
              </button>

              <button
                onClick={() => {
                  setMoreDrawerOpen(false);
                  setIsGoogleSheetsModalOpen(true);
                }}
                className="col-span-2 p-3 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 text-left font-semibold text-emerald-900 flex items-center justify-between min-h-[48px]"
              >
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Google Sheets Cloud Sync</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800 font-bold">
                  Link & Sync
                </span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('settings');
                  setMoreDrawerOpen(false);
                }}
                className="col-span-2 p-3 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-300 text-left font-medium text-slate-900 flex items-center justify-between min-h-[48px]"
              >
                <div className="flex items-center gap-2.5">
                  <SettingsIcon className="w-4 h-4 text-slate-700" />
                  <span>Settings & Data Management</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-semibold">
                  Wipe & Sync
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}

      {/* 0. Project Modal */}
      {projectModalOpen && (
        <ProjectModal
          projectToEdit={projectToEdit}
          onClose={() => {
            setProjectModalOpen(false);
            setProjectToEdit(null);
          }}
        />
      )}

      {/* 1. Voucher Modal */}
      {voucherModalOpen && (
        <VoucherModal
          voucherToEdit={voucherToEdit}
          onClose={() => {
            setVoucherModalOpen(false);
            setVoucherToEdit(null);
          }}
          onOpenAddProject={() => {
            setProjectToEdit(null);
            setProjectModalOpen(true);
          }}
        />
      )}

      {/* 2. Voucher Detail Inspector */}
      {selectedVoucherId && (
        <VoucherDetailModal
          voucherId={selectedVoucherId}
          onClose={() => setSelectedVoucherId(null)}
          onEdit={() => {
            const v = useApp().vouchers.find((item) => item.id === selectedVoucherId);
            setSelectedVoucherId(null);
            if (v) {
              setVoucherToEdit(v);
              setVoucherModalOpen(true);
            }
          }}
        />
      )}

      {/* 3. Advance Modal */}
      {advanceModalOpen && (
        <AdvanceModal
          advanceToEdit={advanceToEdit}
          onClose={() => {
            setAdvanceModalOpen(false);
            setAdvanceToEdit(null);
          }}
          onOpenAddProject={() => {
            setProjectToEdit(null);
            setProjectModalOpen(true);
          }}
        />
      )}

      {/* 4. Disbursement Modal */}
      {disbursementModalOpen && (
        <DisbursementModal
          disbursementToEdit={disbursementToEdit}
          defaultAdvanceId={disbursementDefaultAdvanceId}
          onClose={() => {
            setDisbursementModalOpen(false);
            setDisbursementToEdit(null);
            setDisbursementDefaultAdvanceId(undefined);
          }}
        />
      )}

      {/* 5. Settlement Modal */}
      {settlementModalOpen && (
        <SettlementModal
          settlementToEdit={settlementToEdit}
          defaultAdvanceId={settlementDefaultAdvanceId}
          onClose={() => {
            setSettlementModalOpen(false);
            setSettlementToEdit(null);
            setSettlementDefaultAdvanceId(undefined);
          }}
        />
      )}

      {/* 6. Vendor Payment Modal */}
      {vendorPaymentModalOpen && (
        <VendorPaymentModal
          paymentToEdit={paymentToEdit}
          defaultVoucherId={paymentDefaultVoucherId}
          onClose={() => {
            setVendorPaymentModalOpen(false);
            setPaymentToEdit(null);
            setPaymentDefaultVoucherId(undefined);
          }}
        />
      )}

      {/* 7. Recovery Modal */}
      {recoveryModalOpen && (
        <RecoveryModal
          recoveryToEdit={recoveryToEdit}
          onClose={() => {
            setRecoveryModalOpen(false);
            setRecoveryToEdit(null);
          }}
        />
      )}

      {/* 8. Allocate Receipt Modal */}
      {allocateReceiptRecovery && (
        <AllocateReceiptModal
          recovery={allocateReceiptRecovery}
          onClose={() => setAllocateReceiptRecovery(null)}
        />
      )}

      {/* 9. Team Modal */}
      {teamModalOpen && (
        <TeamModal
          memberToEdit={memberToEdit}
          onClose={() => {
            setTeamModalOpen(false);
            setMemberToEdit(null);
          }}
        />
      )}

      {/* 10. WhatsApp Click-to-Chat Preview Modal */}
      <WhatsAppModal />

      {/* 11. Google Sheets Integration Modal */}
      <GoogleSheetsModal
        isOpen={isGoogleSheetsModalOpen}
        onClose={() => setIsGoogleSheetsModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
