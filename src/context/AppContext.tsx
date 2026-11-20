import React, { createContext, useContext, useState, useEffect } from 'react';
import type {
  TeamMember,
  ProjectRecord,
  TravelVoucher,
  AdvanceRecord,
  AdvanceVoucherMapping,
  EmployeeDisbursement,
  SettlementRecord,
  SettlementVoucherMapping,
  VendorPaymentRecord,
  AccountsRecoveryRequest,
  RecoveryPaymentMapping,
  NotificationLog,
  ActivityLog,
  NotificationType,
  ActivityType,
  VoucherOverallStatus,
  VoucherVerificationStatus,
  VoucherSettlementStatus,
  AdvanceStatus,
} from '../types';
import { deriveVoucherStatus } from '../utils/calculations';
import { isVoucherDisbursed } from '../utils/validations';
import type { FullAppDataPayload } from '../services/googleSheetsSerializer';
import {
  initialTeamMembers,
  initialProjects,
  initialVouchers,
  initialAdvances,
  initialAdvanceVoucherMappings,
  initialDisbursements,
  initialSettlements,
  initialSettlementVoucherMappings,
  initialVendorPayments,
  initialRecoveries,
  initialRecoveryPaymentMappings,
  initialNotifications,
  initialActivities,
} from '../data/initialData';

export type NavigationTab =
  | 'dashboard'
  | 'vouchers'
  | 'advances'
  | 'disbursements'
  | 'settlements'
  | 'vendorPayments'
  | 'recoveries'
  | 'projects'
  | 'team'
  | 'reports'
  | 'history'
  | 'settings';

export interface GlobalFilterState {
  search: string;
  employeeId?: string;
  projectName?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  quickFilter?: string; // e.g. 'awaiting_approval', 'awaiting_funds', etc.
}

interface AppContextType {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  selectedVoucherId: string | null;
  setSelectedVoucherId: (id: string | null) => void;
  globalFilter: GlobalFilterState;
  setGlobalFilter: React.Dispatch<React.SetStateAction<GlobalFilterState>>;
  clearFilter: () => void;

  // Data collections
  projects: ProjectRecord[];
  teamMembers: TeamMember[];
  vouchers: TravelVoucher[];
  advances: AdvanceRecord[];
  advanceVoucherMappings: AdvanceVoucherMapping[];
  disbursements: EmployeeDisbursement[];
  settlements: SettlementRecord[];
  settlementVoucherMappings: SettlementVoucherMapping[];
  vendorPayments: VendorPaymentRecord[];
  recoveries: AccountsRecoveryRequest[];
  recoveryPaymentMappings: RecoveryPaymentMapping[];
  notifications: NotificationLog[];
  activities: ActivityLog[];

  // Mutators
  addProject: (project: Omit<ProjectRecord, 'id' | 'createdAt'>) => ProjectRecord;
  updateProject: (id: string, updates: Partial<ProjectRecord>) => void;
  toggleProjectStatus: (id: string) => void;
  deleteProject: (id: string) => void;

  addTeamMember: (member: Omit<TeamMember, 'id' | 'createdAt'>) => TeamMember;
  updateTeamMember: (id: string, updates: Partial<TeamMember>) => void;
  toggleTeamMemberStatus: (id: string) => void;

  addVoucher: (voucher: Omit<TravelVoucher, 'id' | 'createdAt' | 'updatedAt'>) => TravelVoucher;
  updateVoucher: (id: string, updates: Partial<TravelVoucher>, activityRemark?: string) => void;
  deleteVoucher: (id: string) => void;

  addAdvance: (
    advance: Omit<AdvanceRecord, 'id' | 'createdAt' | 'updatedAt' | 'amountDisbursed'>,
    mappedVouchers?: { voucherRecordId: string; allocatedAmount: number }[]
  ) => AdvanceRecord;
  updateAdvance: (
    id: string,
    updates: Partial<AdvanceRecord>,
    mappedVouchers?: { voucherRecordId: string; allocatedAmount: number }[],
    changeSummary?: string
  ) => void;
  mapAdvanceToVoucher: (mapping: Omit<AdvanceVoucherMapping, 'id'>) => void;
  deleteAdvance: (id: string) => void;

  addDisbursement: (disbursement: Omit<EmployeeDisbursement, 'id' | 'createdAt'>) => EmployeeDisbursement;
  updateDisbursement: (id: string, updates: Partial<EmployeeDisbursement>) => void;
  deleteDisbursement: (id: string) => void;

  addSettlement: (
    settlement: Omit<SettlementRecord, 'id' | 'createdAt' | 'updatedAt'>,
    mappedVouchers?: { voucherRecordId: string; allocatedAmount: number }[]
  ) => SettlementRecord;
  updateSettlement: (id: string, updates: Partial<SettlementRecord>) => void;
  deleteSettlement: (id: string) => void;

  addVendorPayment: (payment: Omit<VendorPaymentRecord, 'id' | 'createdAt'>) => VendorPaymentRecord;
  updateVendorPayment: (id: string, updates: Partial<VendorPaymentRecord>) => void;
  deleteVendorPayment: (id: string) => void;

  createCombinedRecovery: (
    recovery: Omit<AccountsRecoveryRequest, 'id' | 'createdAt' | 'updatedAt' | 'amountReceived' | 'outstandingAmount'>,
    paymentIds: string[]
  ) => AccountsRecoveryRequest;
  updateRecovery: (id: string, updates: Partial<AccountsRecoveryRequest>) => void;
  allocateRecoveryReceipt: (
    recoveryId: string,
    amountReceivedNow: number,
    receiptDate: string,
    receiptRef: string,
    allocations: { paymentId: string; allocatedAmount: number }[]
  ) => void;

  logActivity: (
    type: ActivityType,
    params: {
      voucherRecordId?: string;
      relatedRecordId?: string;
      activityDate?: string;
      amount?: number;
      remarks?: string;
    }
  ) => void;

  // WhatsApp
  initiateWhatsAppNotification: (
    type: NotificationType,
    params: {
      employeeId: string;
      voucherRecordId: string;
      messageContent: string;
      recipientNumber: string;
    }
  ) => NotificationLog;
  confirmWhatsAppSent: (notificationId: string, remarks?: string) => void;

  // Backup & Reset
  resetToSampleData: () => void;
  clearTransactionsOnly: () => void;
  clearAllData: () => void;
  exportBackupJson: () => string;
  importBackupJson: (jsonData: string) => boolean;

  // Quick Action helper
  openWhatsAppModal: (data: {
    type: NotificationType | string;
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
    batchItems?: any[];
  }) => void;
  whatsAppModalData: any;
  setWhatsAppModalData: (data: any) => void;

  // Google Sheets Integration
  linkedSpreadsheetId: string | null;
  linkedSpreadsheetTitle: string | null;
  linkedSpreadsheetUrl: string | null;
  lastSyncedAt: string | null;
  isGoogleSheetsModalOpen: boolean;
  setIsGoogleSheetsModalOpen: (open: boolean) => void;
  setLinkedSpreadsheet: (meta: { id: string; title: string; url: string }) => void;
  clearLinkedSpreadsheet: () => void;
  updateLastSyncedAt: (timestamp?: string) => void;
  loadCloudData: (
    payloadData: FullAppDataPayload,
    meta?: { id: string; title: string; url: string },
    syncedAt?: string
  ) => void;
}

const STORAGE_KEY = 'TEM_APP_DATA_STORAGE_V1';
const INITIALIZED_KEY = `${STORAGE_KEY}_is_initialized`;

function loadStoredOrDefault<T>(key: string, defaultValue: T): T {
  try {
    const isInitialized = typeof window !== 'undefined' ? localStorage.getItem(INITIALIZED_KEY) : null;
    const stored = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
    if (stored !== null) {
      return JSON.parse(stored);
    }
    // If system was already initialized, cleared arrays stay empty and do not revert to sample data
    if (isInitialized === 'true' && Array.isArray(defaultValue)) {
      return [] as unknown as T;
    }
    return defaultValue;
  } catch {
    return defaultValue;
  }
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [selectedVoucherId, setSelectedVoucherId] = useState<string | null>(null);
  const [globalFilter, setGlobalFilter] = useState<GlobalFilterState>({ search: '' });
  const [whatsAppModalData, setWhatsAppModalData] = useState<any>(null);

  // Mark initialized on mount
  useEffect(() => {
    try {
      if (localStorage.getItem(INITIALIZED_KEY) !== 'true') {
        localStorage.setItem(INITIALIZED_KEY, 'true');
      }
    } catch (e) {
      console.warn('LocalStorage not accessible', e);
    }
  }, []);

  // States with persistent lazy init
  const [projects, setProjects] = useState<ProjectRecord[]>(() =>
    loadStoredOrDefault(`${STORAGE_KEY}_projects`, initialProjects)
  );

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(() =>
    loadStoredOrDefault(`${STORAGE_KEY}_team`, initialTeamMembers)
  );

  const [vouchers, setVouchers] = useState<TravelVoucher[]>(() =>
    loadStoredOrDefault(`${STORAGE_KEY}_vouchers`, initialVouchers)
  );

  const [advances, setAdvances] = useState<AdvanceRecord[]>(() =>
    loadStoredOrDefault(`${STORAGE_KEY}_advances`, initialAdvances)
  );

  const [advanceVoucherMappings, setAdvanceVoucherMappings] = useState<AdvanceVoucherMapping[]>(() =>
    loadStoredOrDefault(`${STORAGE_KEY}_avm`, initialAdvanceVoucherMappings)
  );

  const [disbursements, setDisbursements] = useState<EmployeeDisbursement[]>(() =>
    loadStoredOrDefault(`${STORAGE_KEY}_disbursements`, initialDisbursements)
  );

  const [settlements, setSettlements] = useState<SettlementRecord[]>(() =>
    loadStoredOrDefault(`${STORAGE_KEY}_settlements`, initialSettlements)
  );

  const [settlementVoucherMappings, setSettlementVoucherMappings] = useState<SettlementVoucherMapping[]>(() =>
    loadStoredOrDefault(`${STORAGE_KEY}_svm`, initialSettlementVoucherMappings)
  );

  const [vendorPayments, setVendorPayments] = useState<VendorPaymentRecord[]>(() =>
    loadStoredOrDefault(`${STORAGE_KEY}_payments`, initialVendorPayments)
  );

  const [recoveries, setRecoveries] = useState<AccountsRecoveryRequest[]>(() =>
    loadStoredOrDefault(`${STORAGE_KEY}_recoveries`, initialRecoveries)
  );

  const [recoveryPaymentMappings, setRecoveryPaymentMappings] = useState<RecoveryPaymentMapping[]>(() =>
    loadStoredOrDefault(`${STORAGE_KEY}_rpm`, initialRecoveryPaymentMappings)
  );

  const [notifications, setNotifications] = useState<NotificationLog[]>(() =>
    loadStoredOrDefault(`${STORAGE_KEY}_notifications`, initialNotifications)
  );

  const [activities, setActivities] = useState<ActivityLog[]>(() =>
    loadStoredOrDefault(`${STORAGE_KEY}_activities`, initialActivities)
  );

  // Google Sheets integration state
  const [linkedSpreadsheetId, setLinkedSpreadsheetId] = useState<string | null>(() => {
    return localStorage.getItem(`${STORAGE_KEY}_sheet_id`) || null;
  });
  const [linkedSpreadsheetTitle, setLinkedSpreadsheetTitle] = useState<string | null>(() => {
    return localStorage.getItem(`${STORAGE_KEY}_sheet_title`) || null;
  });
  const [linkedSpreadsheetUrl, setLinkedSpreadsheetUrl] = useState<string | null>(() => {
    return localStorage.getItem(`${STORAGE_KEY}_sheet_url`) || null;
  });
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => {
    return localStorage.getItem(`${STORAGE_KEY}_sheet_synced_at`) || null;
  });
  const [isGoogleSheetsModalOpen, setIsGoogleSheetsModalOpen] = useState(false);

  const setLinkedSpreadsheet = (meta: { id: string; title: string; url: string }) => {
    setLinkedSpreadsheetId(meta.id);
    setLinkedSpreadsheetTitle(meta.title);
    setLinkedSpreadsheetUrl(meta.url);
    localStorage.setItem(`${STORAGE_KEY}_sheet_id`, meta.id);
    localStorage.setItem(`${STORAGE_KEY}_sheet_title`, meta.title);
    localStorage.setItem(`${STORAGE_KEY}_sheet_url`, meta.url);
  };

  const clearLinkedSpreadsheet = () => {
    setLinkedSpreadsheetId(null);
    setLinkedSpreadsheetTitle(null);
    setLinkedSpreadsheetUrl(null);
    setLastSyncedAt(null);
    localStorage.removeItem(`${STORAGE_KEY}_sheet_id`);
    localStorage.removeItem(`${STORAGE_KEY}_sheet_title`);
    localStorage.removeItem(`${STORAGE_KEY}_sheet_url`);
    localStorage.removeItem(`${STORAGE_KEY}_sheet_synced_at`);
  };

  const updateLastSyncedAt = (timestamp?: string) => {
    const timeStr = timestamp || new Date().toLocaleString('en-IN');
    setLastSyncedAt(timeStr);
    localStorage.setItem(`${STORAGE_KEY}_sheet_synced_at`, timeStr);
  };

  // Synchronize voucher statuses to ensure 100% consistency across all tabs:
  // 1. Default status -> Received
  // 2. Advance raised/mapped -> Advance Raised
  // 3. Amount disbursed -> Pending for Settlement
  // Synchronize voucher and advance statuses across all tabs:
  // 1. Voucher default -> Approved
  // 2. Advance raised against voucher -> Advance Raised
  // 3. Advance status edited from Raised to Approved -> Advance Approved
  // 4. Amount disbursed -> Pending for Settlement (Advance status: Disbursed)
  // 5. Settlement initiated -> Settlement Initiated
  // 6. Once settlement done -> Closed (Settlement, Advance, and Voucher all Closed)
  useEffect(() => {
    setVouchers((prevVouchers) => {
      let changed = false;
      const updated = prevVouchers.map((v) => {
        const derived = deriveVoucherStatus(
          v,
          advances,
          advanceVoucherMappings,
          disbursements,
          settlements,
          settlementVoucherMappings
        );
        if (v.overallStatus !== derived) {
          changed = true;
          return {
            ...v,
            overallStatus: derived,
            verificationStatus: 'Approved' as VoucherVerificationStatus,
            settlementStatus: (
              derived === 'Closed' || derived === 'Completed'
                ? 'Closed'
                : derived === 'Settlement Initiated'
                ? 'Settlement Initiated'
                : derived === 'Pending for Settlement'
                ? 'Pending for Settlement'
                : derived === 'Advance Approved' || derived === 'Advance Raised'
                ? 'Advance Raised'
                : 'Not Initiated'
            ) as VoucherSettlementStatus,
          };
        }
        return v;
      });
      return changed ? updated : prevVouchers;
    });
  }, [advances, advanceVoucherMappings, disbursements, settlements, settlementVoucherMappings]);

  // Synchronize advance statuses when settlements are closed or disbursements recorded
  useEffect(() => {
    setAdvances((prevAdvances) => {
      let changed = false;
      const updated = prevAdvances.map((adv) => {
        // 1. If any linked settlement is closed/completed, advance status is Closed
        const isSettledClosed = settlements.some(
          (s) =>
            (s.advanceRecordId === adv.id || s.advanceId === adv.advanceId) &&
            (s.accountingStatus === 'Closed' || s.accountingStatus === 'Completed')
        );
        if (isSettledClosed && adv.status !== 'Closed') {
          changed = true;
          return { ...adv, status: 'Closed' as AdvanceStatus };
        }

        // 2. If any disbursement exists against this advance and it's not Closed, mark Disbursed
        const hasDisb =
          (adv.amountDisbursed !== undefined && adv.amountDisbursed > 0) ||
          disbursements.some((d) => d.advanceRecordId === adv.id);
        if (hasDisb && adv.status !== 'Closed' && adv.status !== 'Disbursed') {
          changed = true;
          return { ...adv, status: 'Disbursed' as AdvanceStatus };
        }

        return adv;
      });
      return changed ? updated : prevAdvances;
    });
  }, [settlements, disbursements]);

  // Sync state changes to localStorage
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_projects`, JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_team`, JSON.stringify(teamMembers));
  }, [teamMembers]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_vouchers`, JSON.stringify(vouchers));
  }, [vouchers]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_advances`, JSON.stringify(advances));
  }, [advances]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_avm`, JSON.stringify(advanceVoucherMappings));
  }, [advanceVoucherMappings]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_disbursements`, JSON.stringify(disbursements));
  }, [disbursements]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_settlements`, JSON.stringify(settlements));
  }, [settlements]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_svm`, JSON.stringify(settlementVoucherMappings));
  }, [settlementVoucherMappings]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_payments`, JSON.stringify(vendorPayments));
  }, [vendorPayments]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_recoveries`, JSON.stringify(recoveries));
  }, [recoveries]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_rpm`, JSON.stringify(recoveryPaymentMappings));
  }, [recoveryPaymentMappings]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_notifications`, JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_activities`, JSON.stringify(activities));
  }, [activities]);

  // Safeguard: Heal any vouchers that have no disbursement record from being wrongly stuck in 'Pending for Settlement'
  useEffect(() => {
    setVouchers((prev) => {
      let changed = false;
      const updated: TravelVoucher[] = prev.map((v): TravelVoucher => {
        if (v.overallStatus === 'Pending for Settlement') {
          const hasDisbursement = disbursements.some((d) => d.voucherRecordId === v.id);
          if (!hasDisbursement) {
            changed = true;
            const mapping = advanceVoucherMappings.find((m) => m.voucherRecordId === v.id);
            if (mapping) {
              const adv = advances.find((a) => a.id === mapping.advanceRecordId);
              const targetStatus: VoucherOverallStatus = adv?.status === 'Raised' ? 'Advance Raised' : 'Advance Approved';
              const targetSettlement: VoucherSettlementStatus = 'Advance Raised';
              return { ...v, overallStatus: targetStatus, settlementStatus: targetSettlement };
            } else {
              const targetOverall: VoucherOverallStatus = 'Approved';
              const targetSettlement: VoucherSettlementStatus = 'Not Initiated';
              return { ...v, overallStatus: targetOverall, settlementStatus: targetSettlement };
            }
          }
        }
        return v;
      });
      return changed ? updated : prev;
    });
  }, [disbursements, advanceVoucherMappings, advances]);

  const clearFilter = () => {
    setGlobalFilter({ search: '' });
  };

  const logActivity = (
    type: ActivityType,
    params: {
      voucherRecordId?: string;
      relatedRecordId?: string;
      activityDate?: string;
      amount?: number;
      remarks?: string;
    }
  ) => {
    const newLog: ActivityLog = {
      id: `ACT-${Date.now().toString().slice(-6)}`,
      voucherRecordId: params.voucherRecordId,
      relatedRecordId: params.relatedRecordId,
      activityType: type,
      activityDate: params.activityDate || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      amount: params.amount,
      recordedBy: 'Dheerendra Katara (Admin)',
      remarks: params.remarks,
    };
    setActivities((prev) => [newLog, ...prev]);
  };

  // Project actions
  const addProject = (projectData: Omit<ProjectRecord, 'id' | 'createdAt'>): ProjectRecord => {
    const year = new Date().getFullYear();
    const count = projects.length + 1;
    const newId = `PRJ-${year}-${String(count).padStart(3, '0')}`;
    const newProject: ProjectRecord = {
      ...projectData,
      id: newId,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };
    setProjects((prev) => [...prev, newProject]);
    logActivity('Record Updated', {
      remarks: `Registered new project: ${newProject.name} (${newProject.code || newProject.id})`,
    });
    return newProject;
  };

  const updateProject = (id: string, updates: Partial<ProjectRecord>) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const updated = {
            ...p,
            ...updates,
            updatedAt: new Date().toISOString().split('T')[0],
          };
          logActivity('Record Updated', {
            remarks: `Updated project details: ${updated.name}`,
          });
          return updated;
        }
        return p;
      })
    );
  };

  const toggleProjectStatus = (id: string) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const newStatus = p.status === 'Active' ? 'Inactive' : 'Active';
          logActivity('Record Updated', {
            remarks: `Changed status of project "${p.name}" to ${newStatus}`,
          });
          return { ...p, status: newStatus, updatedAt: new Date().toISOString().split('T')[0] };
        }
        return p;
      })
    );
  };

  const deleteProject = (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    logActivity('Record Updated', {
      remarks: `Removed project record: ${id}`,
    });
  };

  // Team Member actions
  const addTeamMember = (member: Omit<TeamMember, 'id' | 'createdAt'>): TeamMember => {
    const newId = `TM-${Date.now().toString().slice(-4)}`;
    const newMember: TeamMember = {
      ...member,
      id: newId,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setTeamMembers((prev) => [...prev, newMember]);
    logActivity('Record Updated', {
      remarks: `Registered new team member: ${newMember.fullName} (${newMember.empId})`,
    });
    return newMember;
  };

  const updateTeamMember = (id: string, updates: Partial<TeamMember>) => {
    setTeamMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updates } : m))
    );
  };

  const toggleTeamMemberStatus = (id: string) => {
    setTeamMembers((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          const newStatus = m.status === 'Active' ? 'Inactive' : 'Active';
          logActivity('Record Updated', {
            remarks: `Changed status of ${m.fullName} to ${newStatus}`,
          });
          return { ...m, status: newStatus };
        }
        return m;
      })
    );
  };

  // Voucher actions
  const addVoucher = (voucher: Omit<TravelVoucher, 'id' | 'createdAt' | 'updatedAt'>): TravelVoucher => {
    const nextSeq = vouchers.length + 1;
    const internalId = `VCH-2026-${String(nextSeq).padStart(3, '0')}`;
    const newVoucher: TravelVoucher = {
      ...voucher,
      id: internalId,
      overallStatus: voucher.overallStatus || 'Approved',
      verificationStatus: voucher.verificationStatus || 'Approved',
      approvedAmount: voucher.approvedAmount !== undefined ? voucher.approvedAmount : voucher.claimedAmount,
      voucherApprovedDate: voucher.voucherApprovedDate || new Date().toISOString().split('T')[0],
      settlementStatus: voucher.settlementStatus || 'Not Initiated',
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };

    setVouchers((prev) => [newVoucher, ...prev]);
    logActivity('Voucher Created', {
      voucherRecordId: internalId,
      activityDate: newVoucher.travelStartDate || newVoucher.createdAt,
      amount: newVoucher.claimedAmount,
      remarks: `Travel voucher ${newVoucher.voucherNo} created with status Approved for ${newVoucher.projectName} (${newVoucher.travelScenario})`,
    });
    return newVoucher;
  };

  const updateVoucher = (id: string, updates: Partial<TravelVoucher>, activityRemark?: string) => {
    setVouchers((prev) =>
      prev.map((v) => {
        if (v.id === id) {
          const updated = {
            ...v,
            ...updates,
            updatedAt: new Date().toISOString().split('T')[0],
          };

          // Determine activity type if verification or approval changed
          let actType: ActivityType = 'Record Updated';
          if (updates.verificationStatus === 'Verified' && v.verificationStatus !== 'Verified') {
            actType = 'Voucher Verified';
          } else if (updates.verificationStatus === 'Approved' && v.verificationStatus !== 'Approved') {
            actType = 'Voucher Approved';
          } else if (updates.overallStatus === 'Completed' && v.overallStatus !== 'Completed') {
            actType = 'Voucher Closed';
          }

          logActivity(actType, {
            voucherRecordId: id,
            activityDate: updates.voucherApprovedDate || updates.voucherVerificationDate || new Date().toISOString().split('T')[0],
            amount: updates.approvedAmount !== undefined ? updates.approvedAmount : v.approvedAmount,
            remarks: activityRemark || `Updated voucher ${v.voucherNo} details`,
          });

          return updated;
        }
        return v;
      })
    );
  };

  const deleteVoucher = (id: string) => {
    const target = vouchers.find((v) => v.id === id);
    if (!target) return;
    // Soft cancel instead of permanent loss
    updateVoucher(id, { overallStatus: 'Cancelled', verificationStatus: 'Draft', settlementStatus: 'Cancelled' }, `Voucher cancelled`);
  };

  // Advance actions
  const addAdvance = (
    advanceData: Omit<AdvanceRecord, 'id' | 'createdAt' | 'updatedAt' | 'amountDisbursed'>,
    mappedVouchers?: { voucherRecordId: string; allocatedAmount: number }[]
  ): AdvanceRecord => {
    // Generate unique internal ID safely
    const existingSeqNumbers = advances.map((a) => {
      const match = a.id.match(/\d+$/);
      return match ? parseInt(match[0], 10) : 0;
    });
    const maxSeq = existingSeqNumbers.length > 0 ? Math.max(...existingSeqNumbers, advances.length) : advances.length;
    const internalId = `ADV-REC-${String(maxSeq + 1).padStart(3, '0')}`;

    const newAdvance: AdvanceRecord = {
      ...advanceData,
      id: internalId,
      status: advanceData.status || 'Raised',
      amountDisbursed: 0,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };

    setAdvances((prev) => [newAdvance, ...prev]);

    // Create mappings if provided (preventing duplicate mappings of the same voucher)
    if (mappedVouchers && mappedVouchers.length > 0) {
      const seenVouchers = new Set<string>();
      const uniqueMapped = mappedVouchers.filter((mv) => {
        if (!mv.voucherRecordId || mv.allocatedAmount <= 0) return false;
        if (seenVouchers.has(mv.voucherRecordId)) return false;
        seenVouchers.add(mv.voucherRecordId);
        return true;
      });

      if (uniqueMapped.length > 0) {
        const newMappings: AdvanceVoucherMapping[] = uniqueMapped.map((mv, idx) => ({
          id: `AVM-${Date.now().toString().slice(-5)}-${idx}`,
          advanceRecordId: internalId,
          voucherRecordId: mv.voucherRecordId,
          allocatedAdvanceAmount: mv.allocatedAmount,
          allocationDate: advanceData.advanceRaisedDate,
          remarks: `Allocated ₹${mv.allocatedAmount.toLocaleString('en-IN')}`,
        }));
        setAdvanceVoucherMappings((prev) => [...prev, ...newMappings]);

        // When advance is raised against any voucher, update voucher status
        const isClosed = (advanceData.status as string) === 'Closed';
        const isDisbursed = (advanceData.status as string) === 'Disbursed';
        const isApproved = (advanceData.status as string) === 'Approved';
        const targetVoucherStatus: VoucherOverallStatus = isClosed
          ? 'Closed'
          : isDisbursed
          ? 'Pending for Settlement'
          : isApproved
          ? 'Advance Approved'
          : 'Advance Raised';
        const targetVoucherIds = new Set(uniqueMapped.map((mv) => mv.voucherRecordId));
        setVouchers((prev) =>
          prev.map((v) => {
            if (targetVoucherIds.has(v.id)) {
              if (v.overallStatus === 'Closed' || v.overallStatus === 'Completed' || v.overallStatus === 'Settlement Initiated') {
                return v;
              }
              return {
                ...v,
                overallStatus: targetVoucherStatus,
                settlementStatus: targetVoucherStatus === 'Pending for Settlement' ? 'Pending for Settlement' : 'Advance Raised',
                verificationStatus: 'Approved',
                updatedAt: new Date().toISOString().split('T')[0],
              };
            }
            return v;
          })
        );
      }
    }

    const now = new Date();
    const timeFormatted = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const emp = advanceData.teamMemberId ? teamMembers.find((m) => m.id === advanceData.teamMemberId) : null;
    const empInfo = emp ? ` for ${emp.fullName}` : '';
    const projInfo = advanceData.projectName ? ` [${advanceData.projectName}]` : '';
    const mappingInfo = mappedVouchers && mappedVouchers.length > 0
      ? ` · ${mappedVouchers.length} voucher(s) mapped`
      : ' · Unmapped (no voucher linked)';

    logActivity('Advance Raised', {
      relatedRecordId: internalId,
      activityDate: newAdvance.advanceRaisedDate,
      amount: newAdvance.requestedAmount,
      remarks: `[${newAdvance.advanceRaisedDate} ${timeFormatted}] Advance request raised (ID: ${newAdvance.advanceId}) for ₹${newAdvance.requestedAmount.toLocaleString('en-IN')}${empInfo}${projInfo}${mappingInfo}`,
    });

    return newAdvance;
  };

  const updateAdvance = (
    id: string,
    updates: Partial<AdvanceRecord>,
    mappedVouchers?: { voucherRecordId: string; allocatedAmount: number }[],
    changeSummary?: string
  ) => {
    let targetAdvance: AdvanceRecord | undefined;

    setAdvances((prev) =>
      prev.map((adv) => {
        if (adv.id === id) {
          targetAdvance = adv;
          const isTransitionToApproved = updates.status === 'Approved' && adv.status !== 'Approved';
          const approvedAmt =
            updates.approvedAmount !== undefined && updates.approvedAmount > 0
              ? updates.approvedAmount
              : adv.approvedAmount !== undefined && adv.approvedAmount > 0
              ? adv.approvedAmount
              : updates.requestedAmount !== undefined && updates.requestedAmount > 0
              ? updates.requestedAmount
              : adv.requestedAmount;

          let receivedAmt =
            updates.amountActuallyReceived !== undefined
              ? updates.amountActuallyReceived
              : adv.amountActuallyReceived;

          // When advance status is Approved or changes to Approved, ensure amountActuallyReceived is set
          if ((updates.status === 'Approved' || isTransitionToApproved) && (!receivedAmt || receivedAmt <= 0)) {
            receivedAmt = approvedAmt;
          }

          const updated: AdvanceRecord = {
            ...adv,
            ...updates,
            approvedAmount: updates.status === 'Approved' ? approvedAmt : (updates.approvedAmount ?? adv.approvedAmount),
            amountActuallyReceived: receivedAmt,
            approvalDate:
              updates.status === 'Approved'
                ? updates.approvalDate || adv.approvalDate || new Date().toISOString().split('T')[0]
                : updates.approvalDate ?? adv.approvalDate,
            fundsReceivedDate:
              updates.status === 'Approved' && (!adv.fundsReceivedDate || updates.fundsReceivedDate)
                ? updates.fundsReceivedDate || adv.fundsReceivedDate || new Date().toISOString().split('T')[0]
                : updates.fundsReceivedDate ?? adv.fundsReceivedDate,
            updatedAt: new Date().toISOString().split('T')[0],
          };

          if (
            updated.amountActuallyReceived > 0 &&
            adv.amountActuallyReceived === 0
          ) {
            logActivity('Funds Received', {
              relatedRecordId: id,
              activityDate: updated.fundsReceivedDate || new Date().toISOString().split('T')[0],
              amount: updated.amountActuallyReceived,
              remarks: `Actual received amount updated: ₹${updated.amountActuallyReceived.toLocaleString('en-IN')} (Available for disbursement)`,
            });
          }

          return updated;
        }
        return adv;
      })
    );

    // Update mapped vouchers if provided (even if empty array to remove all mappings)
    if (mappedVouchers !== undefined) {
      const seenVouchers = new Set<string>();
      const validMapped = mappedVouchers.filter((mv) => {
        if (!mv.voucherRecordId || mv.allocatedAmount <= 0) return false;
        if (seenVouchers.has(mv.voucherRecordId)) return false;
        seenVouchers.add(mv.voucherRecordId);
        return true;
      });

      setAdvanceVoucherMappings((prev) => {
        const otherMappings = prev.filter((m) => m.advanceRecordId !== id);
        const newMappings: AdvanceVoucherMapping[] = validMapped.map((mv, idx) => ({
          id: `AVM-${Date.now().toString().slice(-5)}-${idx}`,
          advanceRecordId: id,
          voucherRecordId: mv.voucherRecordId,
          allocatedAdvanceAmount: mv.allocatedAmount,
          allocationDate: updates.advanceRaisedDate || targetAdvance?.advanceRaisedDate || new Date().toISOString().split('T')[0],
          remarks: `Allocated ₹${mv.allocatedAmount.toLocaleString('en-IN')}`,
        }));
        return [...otherMappings, ...newMappings];
      });
    }

    // Record edit and mapping changes in the activity log with exact date and time
    const now = new Date();
    const dateTimeStr = `${now.toISOString().split('T')[0]} ${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
    const advIdDisplay = targetAdvance?.advanceId || updates.advanceId || id;
    
    let mappingDesc = '';
    if (mappedVouchers !== undefined) {
      if (mappedVouchers.length === 0) {
        mappingDesc = 'All voucher mappings removed';
      } else {
        const vNos = mappedVouchers
          .map((m) => {
            const v = vouchers.find((item) => item.id === m.voucherRecordId);
            return v ? `${v.voucherNo} (₹${m.allocatedAmount.toLocaleString('en-IN')})` : `₹${m.allocatedAmount}`;
          })
          .join(', ');
        mappingDesc = `Mapped to ${mappedVouchers.length} voucher(s): ${vNos}`;
      }
    }

    const summaryParts = [
      changeSummary,
      mappingDesc,
    ].filter(Boolean);

    // Sync mapped vouchers if advance status changed
    if (updates.status) {
      const advMappings = advanceVoucherMappings.filter((m) => m.advanceRecordId === id);
      const vIds = new Set(advMappings.map((m) => m.voucherRecordId));
      if (mappedVouchers !== undefined) {
        mappedVouchers.forEach((m) => vIds.add(m.voucherRecordId));
      }
      if (vIds.size > 0) {
        setVouchers((prev) =>
          prev.map((v) => {
            if (vIds.has(v.id)) {
              if (v.overallStatus === 'Closed' || v.overallStatus === 'Completed' || v.overallStatus === 'Settlement Initiated') return v;
              if (updates.status === 'Closed') {
                return { ...v, overallStatus: 'Closed', updatedAt: new Date().toISOString().split('T')[0] };
              }
              if (updates.status === 'Approved') {
                if (isVoucherDisbursed(v.id, disbursements)) return v;
                return { ...v, overallStatus: 'Advance Approved', updatedAt: new Date().toISOString().split('T')[0] };
              }
              if (updates.status === 'Disbursed') {
                const isDisb = isVoucherDisbursed(v.id, disbursements);
                const isSingleMapped = vIds.size === 1;
                if (isDisb || isSingleMapped) {
                  return {
                    ...v,
                    overallStatus: 'Pending for Settlement',
                    settlementStatus: 'Pending for Settlement',
                    updatedAt: new Date().toISOString().split('T')[0],
                  };
                }
                return v;
              }
              if (updates.status === 'Raised') {
                if (isVoucherDisbursed(v.id, disbursements)) return v;
                return { ...v, overallStatus: 'Advance Raised', updatedAt: new Date().toISOString().split('T')[0] };
              }
            }
            return v;
          })
        );
      }
    }

    const fullRemarks = summaryParts.length > 0
      ? `[${dateTimeStr}] Advance ${advIdDisplay} updated: ${summaryParts.join(' · ')}`
      : `[${dateTimeStr}] Advance ${advIdDisplay} details updated`;

    logActivity('Advance Updated', {
      relatedRecordId: id,
      activityDate: updates.advanceRaisedDate || targetAdvance?.advanceRaisedDate || now.toISOString().split('T')[0],
      amount: updates.requestedAmount !== undefined ? updates.requestedAmount : targetAdvance?.requestedAmount,
      remarks: fullRemarks,
    });
  };

  const mapAdvanceToVoucher = (mapping: Omit<AdvanceVoucherMapping, 'id'>) => {
    const newId = `AVM-${Date.now().toString().slice(-6)}`;
    setAdvanceVoucherMappings((prev) => [...prev, { ...mapping, id: newId }]);

    const targetAdv = advances.find((a) => a.id === mapping.advanceRecordId);
    const isDisbursed =
      targetAdv?.status === 'Disbursed' ||
      targetAdv?.status === 'Fully Disbursed' ||
      (targetAdv?.amountDisbursed !== undefined && targetAdv.amountDisbursed > 0);
    const targetStatus: VoucherOverallStatus = isDisbursed ? 'Pending for Settlement' : 'Advance Raised';

    setVouchers((prev) =>
      prev.map((v) => {
        if (v.id === mapping.voucherRecordId) {
          if (v.overallStatus === 'Completed' || v.overallStatus === 'Settlement Initiated') return v;
          return {
            ...v,
            overallStatus: targetStatus,
            settlementStatus: targetStatus,
            updatedAt: new Date().toISOString().split('T')[0],
          };
        }
        return v;
      })
    );

    logActivity('Record Updated', {
      voucherRecordId: mapping.voucherRecordId,
      relatedRecordId: mapping.advanceRecordId,
      amount: mapping.allocatedAdvanceAmount,
      remarks: `Allocated ₹${mapping.allocatedAdvanceAmount.toLocaleString('en-IN')} from advance`,
    });
  };

  const deleteAdvance = (id: string) => {
    updateAdvance(id, { status: 'Cancelled' });
  };

  // Disbursement actions
  const addDisbursement = (disbursement: Omit<EmployeeDisbursement, 'id' | 'createdAt'>): EmployeeDisbursement => {
    const nextSeq = disbursements.length + 1;
    const internalId = `DISB-${String(nextSeq).padStart(3, '0')}`;
    const newDisbursement: EmployeeDisbursement = {
      ...disbursement,
      id: internalId,
      createdAt: new Date().toISOString().split('T')[0],
    };

    setDisbursements((prev) => [newDisbursement, ...prev]);

    // Recalculate advance amountDisbursed
    setAdvances((prev) =>
      prev.map((adv) => {
        if (adv.id === disbursement.advanceRecordId) {
          const totalDisbursed =
            adv.amountDisbursed + disbursement.amountDisbursed;
          const status =
            totalDisbursed >= adv.amountActuallyReceived && adv.amountActuallyReceived > 0
              ? 'Fully Disbursed'
              : 'Partially Disbursed';
          return {
            ...adv,
            amountDisbursed: totalDisbursed,
            status,
            disbursementDate: disbursement.disbursementDate,
          };
        }
        return adv;
      })
    );

    // When amount is disbursed, ONLY the disbursed voucher's status becomes 'Pending for Settlement'
    const affectedVoucherIds = new Set<string>();
    if (disbursement.voucherRecordId) {
      affectedVoucherIds.add(disbursement.voucherRecordId);
    } else {
      const advMappings = advanceVoucherMappings.filter((m) => m.advanceRecordId === disbursement.advanceRecordId);
      if (advMappings.length === 1) {
        affectedVoucherIds.add(advMappings[0].voucherRecordId);
      }
    }

    if (affectedVoucherIds.size > 0) {
      setVouchers((prev) =>
        prev.map((v) => {
          if (affectedVoucherIds.has(v.id)) {
            if (v.overallStatus === 'Completed' || v.overallStatus === 'Settlement Initiated' || v.overallStatus === 'Closed') return v;
            return {
              ...v,
              overallStatus: 'Pending for Settlement',
              settlementStatus: 'Pending for Settlement',
              updatedAt: new Date().toISOString().split('T')[0],
            };
          }
          return v;
        })
      );
    }

    logActivity('Employee Disbursement Made', {
      voucherRecordId: disbursement.voucherRecordId,
      relatedRecordId: internalId,
      activityDate: disbursement.disbursementDate,
      amount: disbursement.amountDisbursed,
      remarks: `Disbursed ₹${disbursement.amountDisbursed.toLocaleString('en-IN')} via ${disbursement.paymentMethod} (Ref: ${disbursement.transactionRef})`,
    });

    return newDisbursement;
  };

  const updateDisbursement = (id: string, updates: Partial<EmployeeDisbursement>) => {
    setDisbursements((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...updates } : d))
    );
  };

  const deleteDisbursement = (id: string) => {
    setDisbursements((prev) => prev.filter((d) => d.id !== id));
  };

  // Settlement actions
  const addSettlement = (
    settlementData: Omit<SettlementRecord, 'id' | 'createdAt' | 'updatedAt'>,
    mappedVouchers?: { voucherRecordId: string; allocatedAmount: number }[]
  ): SettlementRecord => {
    const nextSeq = settlements.length + 1;
    const internalId = `SET-REC-${String(nextSeq).padStart(3, '0')}`;
    const newSettlement: SettlementRecord = {
      ...settlementData,
      id: internalId,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };

    setSettlements((prev) => [newSettlement, ...prev]);

    if (mappedVouchers && mappedVouchers.length > 0) {
      const newMappings: SettlementVoucherMapping[] = mappedVouchers.map((mv, idx) => ({
        id: `SVM-${Date.now().toString().slice(-5)}-${idx}`,
        settlementRecordId: internalId,
        voucherRecordId: mv.voucherRecordId,
        allocatedSettlementAmount: mv.allocatedAmount,
        allocationDate: settlementData.settlementInitiatedDate,
        remarks: `Allocated ₹${mv.allocatedAmount.toLocaleString('en-IN')}`,
      }));
      setSettlementVoucherMappings((prev) => [...prev, ...newMappings]);

      // Update vouchers' overall and settlement status
      const isCompleted = settlementData.accountingStatus === 'Closed' || settlementData.accountingStatus === 'Completed';
      const targetStatus: VoucherOverallStatus = isCompleted ? 'Closed' : 'Settlement Initiated';

      if (isCompleted && settlementData.advanceRecordId) {
        setAdvances((prev) =>
          prev.map((a) => (a.id === settlementData.advanceRecordId ? { ...a, status: 'Closed' as AdvanceStatus } : a))
        );
      }

      mappedVouchers.forEach((mv) => {
        updateVoucher(
          mv.voucherRecordId,
          {
            overallStatus: targetStatus,
            settlementStatus: isCompleted ? 'Completed' : 'Settlement Initiated',
          },
          `Settlement ${settlementData.settlementId} recorded`
        );
      });
    }

    logActivity('Settlement Initiated', {
      relatedRecordId: internalId,
      activityDate: newSettlement.settlementInitiatedDate,
      amount: newSettlement.settlementAmount,
      remarks: `Settlement ${newSettlement.settlementId} recorded in accounting status: ${newSettlement.accountingStatus}`,
    });

    return newSettlement;
  };

  const updateSettlement = (id: string, updates: Partial<SettlementRecord>) => {
    let targetAdvId: string | undefined;

    setSettlements((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          targetAdvId = updates.advanceRecordId || s.advanceRecordId;
          const updated = {
            ...s,
            ...updates,
            updatedAt: new Date().toISOString().split('T')[0],
          };

          if (
            (updates.accountingStatus === 'Closed' || updates.accountingStatus === 'Completed') &&
            s.accountingStatus !== 'Closed' &&
            s.accountingStatus !== 'Completed'
          ) {
            logActivity('Settlement Completed', {
              relatedRecordId: id,
              activityDate: updates.settlementCompletionDate || new Date().toISOString().split('T')[0],
              amount: updates.actualAmountSettled || s.settlementAmount,
              remarks: `Settlement ${s.settlementId} completed and marked Closed in accounting software`,
            });
          }

          return updated;
        }
        return s;
      })
    );

    // If accounting status changed, sync mapped vouchers and mapped advance
    if (updates.accountingStatus) {
      const isCompleted = updates.accountingStatus === 'Closed' || updates.accountingStatus === 'Completed';
      const targetStatus: VoucherOverallStatus = isCompleted ? 'Closed' : 'Settlement Initiated';

      if (isCompleted && targetAdvId) {
        setAdvances((prev) =>
          prev.map((a) => (a.id === targetAdvId ? { ...a, status: 'Closed' as AdvanceStatus } : a))
        );
      }

      const mappedVoucherIds = new Set(
        settlementVoucherMappings
          .filter((m) => m.settlementRecordId === id)
          .map((m) => m.voucherRecordId)
      );
      if (mappedVoucherIds.size > 0) {
        setVouchers((prev) =>
          prev.map((v) => {
            if (mappedVoucherIds.has(v.id)) {
              return {
                ...v,
                overallStatus: targetStatus,
                settlementStatus: isCompleted ? 'Completed' : 'Settlement Initiated',
                updatedAt: new Date().toISOString().split('T')[0],
              };
            }
            return v;
          })
        );
      }
    }
  };

  const deleteSettlement = (id: string) => {
    updateSettlement(id, { accountingStatus: 'Cancelled' });
  };

  // Vendor Payment actions
  const addVendorPayment = (payment: Omit<VendorPaymentRecord, 'id' | 'createdAt'>): VendorPaymentRecord => {
    const nextSeq = vendorPayments.length + 1;
    const internalId = `PAY-${String(nextSeq).padStart(3, '0')}`;
    const newPayment: VendorPaymentRecord = {
      ...payment,
      id: internalId,
      createdAt: new Date().toISOString().split('T')[0],
    };

    setVendorPayments((prev) => [newPayment, ...prev]);

    logActivity('Vendor Payment Made', {
      voucherRecordId: payment.voucherRecordId,
      relatedRecordId: internalId,
      activityDate: payment.paymentDate,
      amount: payment.amountPaid,
      remarks: `Paid ${payment.vendorName} ₹${payment.amountPaid.toLocaleString('en-IN')} (${payment.expenseCategory}) via ${payment.paymentSource}`,
    });

    return newPayment;
  };

  const updateVendorPayment = (id: string, updates: Partial<VendorPaymentRecord>) => {
    setVendorPayments((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  };

  const deleteVendorPayment = (id: string) => {
    setVendorPayments((prev) => prev.filter((p) => p.id !== id));
  };

  // Combined Recovery Request actions
  const createCombinedRecovery = (
    recoveryData: Omit<AccountsRecoveryRequest, 'id' | 'createdAt' | 'updatedAt' | 'amountReceived' | 'outstandingAmount'>,
    paymentIds: string[]
  ): AccountsRecoveryRequest => {
    const nextSeq = recoveries.length + 1;
    const internalId = `REC-${String(nextSeq).padStart(3, '0')}`;

    const newRecovery: AccountsRecoveryRequest = {
      ...recoveryData,
      id: internalId,
      amountReceived: 0,
      outstandingAmount: recoveryData.requestedAmount,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };

    setRecoveries((prev) => [newRecovery, ...prev]);

    // Map payments and mark them as recovery requested
    const newMappings: RecoveryPaymentMapping[] = paymentIds.map((pid, idx) => {
      const pay = vendorPayments.find((p) => p.id === pid);
      const amount = pay ? pay.amountPaid : 0;
      return {
        id: `RPM-${Date.now().toString().slice(-5)}-${idx}`,
        recoveryRecordId: internalId,
        vendorPaymentRecordId: pid,
        voucherRecordId: pay?.voucherRecordId || '',
        amountRequestedForRecovery: amount,
        amountApprovedForRecovery: amount,
        amountRecovered: 0,
        outstandingAmount: amount,
        allocationDate: recoveryData.requestDate,
      };
    });

    setRecoveryPaymentMappings((prev) => [...prev, ...newMappings]);

    // Update vendor payments' recoveryStatus
    setVendorPayments((prev) =>
      prev.map((p) =>
        paymentIds.includes(p.id) ? { ...p, recoveryStatus: 'Recovery Requested' } : p
      )
    );

    logActivity('Recovery Request Submitted', {
      relatedRecordId: internalId,
      activityDate: newRecovery.requestDate,
      amount: newRecovery.requestedAmount,
      remarks: `Submitted combined Accounts recovery request ${newRecovery.recoveryRef} for ${paymentIds.length} personal payments totaling ₹${newRecovery.requestedAmount.toLocaleString('en-IN')}`,
    });

    return newRecovery;
  };

  const updateRecovery = (id: string, updates: Partial<AccountsRecoveryRequest>) => {
    setRecoveries((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString().split('T')[0] } : r))
    );
  };

  const allocateRecoveryReceipt = (
    recoveryId: string,
    amountReceivedNow: number,
    receiptDate: string,
    receiptRef: string,
    allocations: { paymentId: string; allocatedAmount: number }[]
  ) => {
    // 1. Update recovery record
    setRecoveries((prev) =>
      prev.map((r) => {
        if (r.id === recoveryId) {
          const totalReceived = r.amountReceived + amountReceivedNow;
          const outstanding = Math.max(0, r.requestedAmount - totalReceived);
          const status =
            outstanding === 0
              ? 'Fully Recovered'
              : totalReceived > 0
              ? 'Partially Received'
              : r.status;

          return {
            ...r,
            amountReceived: totalReceived,
            outstandingAmount: outstanding,
            latestReceiptDate: receiptDate,
            firstReceiptDate: r.firstReceiptDate || receiptDate,
            receiptTransactionRef: receiptRef,
            status,
            updatedAt: new Date().toISOString().split('T')[0],
          };
        }
        return r;
      })
    );

    // 2. Update mappings & vendor payments
    allocations.forEach(({ paymentId, allocatedAmount }) => {
      setRecoveryPaymentMappings((prev) =>
        prev.map((m) => {
          if (m.recoveryRecordId === recoveryId && m.vendorPaymentRecordId === paymentId) {
            const newRecovered = m.amountRecovered + allocatedAmount;
            const newOutstanding = Math.max(0, m.amountRequestedForRecovery - newRecovered);
            return {
              ...m,
              amountRecovered: newRecovered,
              outstandingAmount: newOutstanding,
              allocationDate: receiptDate,
            };
          }
          return m;
        })
      );

      // Check payment status
      setVendorPayments((prev) =>
        prev.map((p) => {
          if (p.id === paymentId) {
            // Find total recovered across all recoveries
            const currentRecovery = recoveryPaymentMappings.find(
              (m) => m.recoveryRecordId === recoveryId && m.vendorPaymentRecordId === paymentId
            );
            const totalRecovered = (currentRecovery?.amountRecovered || 0) + allocatedAmount;
            const newStatus =
              totalRecovered >= p.amountPaid
                ? 'Fully Recovered'
                : totalRecovered > 0
                ? 'Partially Recovered'
                : p.recoveryStatus;
            return { ...p, recoveryStatus: newStatus };
          }
          return p;
        })
      );
    });

    logActivity('Recovery Received', {
      relatedRecordId: recoveryId,
      activityDate: receiptDate,
      amount: amountReceivedNow,
      remarks: `Accounts released ₹${amountReceivedNow.toLocaleString('en-IN')} (Ref: ${receiptRef}), allocated across ${allocations.length} personal payments`,
    });
  };

  // WhatsApp notifications
  const initiateWhatsAppNotification = (
    type: NotificationType,
    params: {
      employeeId: string;
      voucherRecordId: string;
      messageContent: string;
      recipientNumber: string;
    }
  ): NotificationLog => {
    const nextSeq = notifications.length + 1;
    const internalId = `NOTIF-${String(nextSeq).padStart(3, '0')}`;
    const newLog: NotificationLog = {
      id: internalId,
      employeeId: params.employeeId,
      voucherRecordId: params.voucherRecordId,
      notificationType: type,
      recipientNumber: params.recipientNumber,
      messageContent: params.messageContent,
      initiatedTimestamp: new Date().toISOString(),
      status: 'Opened in WhatsApp',
      remarks: 'Initiated via Click-to-Chat',
    };

    setNotifications((prev) => [newLog, ...prev]);

    logActivity('WhatsApp Notification Initiated', {
      voucherRecordId: params.voucherRecordId,
      relatedRecordId: internalId,
      remarks: `Initiated ${type} notification to ${params.recipientNumber}`,
    });

    return newLog;
  };

  const confirmWhatsAppSent = (notificationId: string, remarks?: string) => {
    setNotifications((prev) =>
      prev.map((n) => {
        if (n.id === notificationId) {
          return {
            ...n,
            status: 'Manually Confirmed Sent',
            manuallyConfirmedSentDateTime: new Date().toISOString(),
            remarks: remarks || n.remarks,
          };
        }
        return n;
      })
    );

    const notif = notifications.find((n) => n.id === notificationId);
    if (notif) {
      logActivity('WhatsApp Message Confirmed Sent', {
        voucherRecordId: notif.voucherRecordId,
        relatedRecordId: notificationId,
        remarks: `Admin confirmed: ${notif.notificationType} sent to ${notif.recipientNumber}`,
      });
    }
  };

  // Quick WhatsApp modal helper
  const openWhatsAppModal = (data: any) => {
    setWhatsAppModalData(data);
  };

  // Backup & Reset
  const resetToSampleData = () => {
    setProjects(initialProjects);
    setTeamMembers(initialTeamMembers);
    setVouchers(initialVouchers);
    setAdvances(initialAdvances);
    setAdvanceVoucherMappings(initialAdvanceVoucherMappings);
    setDisbursements(initialDisbursements);
    setSettlements(initialSettlements);
    setSettlementVoucherMappings(initialSettlementVoucherMappings);
    setVendorPayments(initialVendorPayments);
    setRecoveries(initialRecoveries);
    setRecoveryPaymentMappings(initialRecoveryPaymentMappings);
    setNotifications(initialNotifications);
    setActivities(initialActivities);

    try {
      localStorage.setItem(INITIALIZED_KEY, 'true');
      localStorage.setItem(`${STORAGE_KEY}_projects`, JSON.stringify(initialProjects));
      localStorage.setItem(`${STORAGE_KEY}_team`, JSON.stringify(initialTeamMembers));
      localStorage.setItem(`${STORAGE_KEY}_vouchers`, JSON.stringify(initialVouchers));
      localStorage.setItem(`${STORAGE_KEY}_advances`, JSON.stringify(initialAdvances));
      localStorage.setItem(`${STORAGE_KEY}_avm`, JSON.stringify(initialAdvanceVoucherMappings));
      localStorage.setItem(`${STORAGE_KEY}_disbursements`, JSON.stringify(initialDisbursements));
      localStorage.setItem(`${STORAGE_KEY}_settlements`, JSON.stringify(initialSettlements));
      localStorage.setItem(`${STORAGE_KEY}_svm`, JSON.stringify(initialSettlementVoucherMappings));
      localStorage.setItem(`${STORAGE_KEY}_payments`, JSON.stringify(initialVendorPayments));
      localStorage.setItem(`${STORAGE_KEY}_recoveries`, JSON.stringify(initialRecoveries));
      localStorage.setItem(`${STORAGE_KEY}_rpm`, JSON.stringify(initialRecoveryPaymentMappings));
      localStorage.setItem(`${STORAGE_KEY}_notifications`, JSON.stringify(initialNotifications));
      localStorage.setItem(`${STORAGE_KEY}_activities`, JSON.stringify(initialActivities));
    } catch (e) {
      console.warn('LocalStorage write error in resetToSampleData', e);
    }
  };

  const clearTransactionsOnly = () => {
    setVouchers([]);
    setAdvances([]);
    setAdvanceVoucherMappings([]);
    setDisbursements([]);
    setSettlements([]);
    setSettlementVoucherMappings([]);
    setVendorPayments([]);
    setRecoveries([]);
    setRecoveryPaymentMappings([]);
    setNotifications([]);
    setActivities([]);

    try {
      localStorage.setItem(INITIALIZED_KEY, 'true');
      localStorage.setItem(`${STORAGE_KEY}_vouchers`, '[]');
      localStorage.setItem(`${STORAGE_KEY}_advances`, '[]');
      localStorage.setItem(`${STORAGE_KEY}_avm`, '[]');
      localStorage.setItem(`${STORAGE_KEY}_disbursements`, '[]');
      localStorage.setItem(`${STORAGE_KEY}_settlements`, '[]');
      localStorage.setItem(`${STORAGE_KEY}_svm`, '[]');
      localStorage.setItem(`${STORAGE_KEY}_payments`, '[]');
      localStorage.setItem(`${STORAGE_KEY}_recoveries`, '[]');
      localStorage.setItem(`${STORAGE_KEY}_rpm`, '[]');
      localStorage.setItem(`${STORAGE_KEY}_notifications`, '[]');
      localStorage.setItem(`${STORAGE_KEY}_activities`, '[]');
    } catch (e) {
      console.warn('LocalStorage write error in clearTransactionsOnly', e);
    }
  };

  const clearAllData = () => {
    setProjects([]);
    setTeamMembers([]);
    setVouchers([]);
    setAdvances([]);
    setAdvanceVoucherMappings([]);
    setDisbursements([]);
    setSettlements([]);
    setSettlementVoucherMappings([]);
    setVendorPayments([]);
    setRecoveries([]);
    setRecoveryPaymentMappings([]);
    setNotifications([]);
    setActivities([]);

    try {
      localStorage.setItem(INITIALIZED_KEY, 'true');
      localStorage.setItem(`${STORAGE_KEY}_projects`, '[]');
      localStorage.setItem(`${STORAGE_KEY}_team`, '[]');
      localStorage.setItem(`${STORAGE_KEY}_vouchers`, '[]');
      localStorage.setItem(`${STORAGE_KEY}_advances`, '[]');
      localStorage.setItem(`${STORAGE_KEY}_avm`, '[]');
      localStorage.setItem(`${STORAGE_KEY}_disbursements`, '[]');
      localStorage.setItem(`${STORAGE_KEY}_settlements`, '[]');
      localStorage.setItem(`${STORAGE_KEY}_svm`, '[]');
      localStorage.setItem(`${STORAGE_KEY}_payments`, '[]');
      localStorage.setItem(`${STORAGE_KEY}_recoveries`, '[]');
      localStorage.setItem(`${STORAGE_KEY}_rpm`, '[]');
      localStorage.setItem(`${STORAGE_KEY}_notifications`, '[]');
      localStorage.setItem(`${STORAGE_KEY}_activities`, '[]');
    } catch (e) {
      console.warn('LocalStorage write error in clearAllData', e);
    }
  };

  const exportBackupJson = (): string => {
    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      projects,
      teamMembers,
      vouchers,
      advances,
      advanceVoucherMappings,
      disbursements,
      settlements,
      settlementVoucherMappings,
      vendorPayments,
      recoveries,
      recoveryPaymentMappings,
      notifications,
      activities,
    };
    return JSON.stringify(backup, null, 2);
  };

  const importBackupJson = (jsonData: string): boolean => {
    try {
      const data = JSON.parse(jsonData);
      if (Array.isArray(data.projects)) setProjects(data.projects);
      if (Array.isArray(data.teamMembers)) setTeamMembers(data.teamMembers);
      if (Array.isArray(data.vouchers)) setVouchers(data.vouchers);
      if (Array.isArray(data.advances)) setAdvances(data.advances);
      if (Array.isArray(data.advanceVoucherMappings)) setAdvanceVoucherMappings(data.advanceVoucherMappings);
      if (Array.isArray(data.disbursements)) setDisbursements(data.disbursements);
      if (Array.isArray(data.settlements)) setSettlements(data.settlements);
      if (Array.isArray(data.settlementVoucherMappings)) setSettlementVoucherMappings(data.settlementVoucherMappings);
      if (Array.isArray(data.vendorPayments)) setVendorPayments(data.vendorPayments);
      if (Array.isArray(data.recoveries)) setRecoveries(data.recoveries);
      if (Array.isArray(data.recoveryPaymentMappings)) setRecoveryPaymentMappings(data.recoveryPaymentMappings);
      if (Array.isArray(data.notifications)) setNotifications(data.notifications);
      if (Array.isArray(data.activities)) setActivities(data.activities);
      return true;
    } catch (err) {
      console.error('Failed to import backup JSON', err);
      return false;
    }
  };

  const loadCloudData = (
    payloadData: FullAppDataPayload,
    meta?: { id: string; title: string; url: string },
    syncedAt?: string
  ) => {
    setProjects(payloadData.projects);
    setTeamMembers(payloadData.teamMembers);
    setVouchers(payloadData.vouchers);
    setAdvances(payloadData.advances);
    setAdvanceVoucherMappings(payloadData.advanceVoucherMappings);
    setDisbursements(payloadData.disbursements);
    setSettlements(payloadData.settlements);
    setSettlementVoucherMappings(payloadData.settlementVoucherMappings);
    setVendorPayments(payloadData.vendorPayments);
    setRecoveries(payloadData.recoveries);
    setRecoveryPaymentMappings(payloadData.recoveryPaymentMappings);
    setNotifications(payloadData.notifications);
    setActivities(payloadData.activities);

    try {
      localStorage.setItem(INITIALIZED_KEY, 'true');
      localStorage.setItem(`${STORAGE_KEY}_projects`, JSON.stringify(payloadData.projects));
      localStorage.setItem(`${STORAGE_KEY}_team`, JSON.stringify(payloadData.teamMembers));
      localStorage.setItem(`${STORAGE_KEY}_vouchers`, JSON.stringify(payloadData.vouchers));
      localStorage.setItem(`${STORAGE_KEY}_advances`, JSON.stringify(payloadData.advances));
      localStorage.setItem(`${STORAGE_KEY}_avm`, JSON.stringify(payloadData.advanceVoucherMappings));
      localStorage.setItem(`${STORAGE_KEY}_disbursements`, JSON.stringify(payloadData.disbursements));
      localStorage.setItem(`${STORAGE_KEY}_settlements`, JSON.stringify(payloadData.settlements));
      localStorage.setItem(`${STORAGE_KEY}_svm`, JSON.stringify(payloadData.settlementVoucherMappings));
      localStorage.setItem(`${STORAGE_KEY}_payments`, JSON.stringify(payloadData.vendorPayments));
      localStorage.setItem(`${STORAGE_KEY}_recoveries`, JSON.stringify(payloadData.recoveries));
      localStorage.setItem(`${STORAGE_KEY}_rpm`, JSON.stringify(payloadData.recoveryPaymentMappings));
      localStorage.setItem(`${STORAGE_KEY}_notifications`, JSON.stringify(payloadData.notifications));
      localStorage.setItem(`${STORAGE_KEY}_activities`, JSON.stringify(payloadData.activities));
    } catch (e) {
      console.warn('LocalStorage write error in loadCloudData', e);
    }

    if (meta) {
      setLinkedSpreadsheet(meta);
    }
    updateLastSyncedAt(syncedAt);
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        selectedVoucherId,
        setSelectedVoucherId,
        globalFilter,
        setGlobalFilter,
        clearFilter,
        projects,
        teamMembers,
        vouchers,
        advances,
        advanceVoucherMappings,
        disbursements,
        settlements,
        settlementVoucherMappings,
        vendorPayments,
        recoveries,
        recoveryPaymentMappings,
        notifications,
        activities,
        addProject,
        updateProject,
        toggleProjectStatus,
        deleteProject,
        addTeamMember,
        updateTeamMember,
        toggleTeamMemberStatus,
        addVoucher,
        updateVoucher,
        deleteVoucher,
        addAdvance,
        updateAdvance,
        mapAdvanceToVoucher,
        deleteAdvance,
        addDisbursement,
        updateDisbursement,
        deleteDisbursement,
        addSettlement,
        updateSettlement,
        deleteSettlement,
        addVendorPayment,
        updateVendorPayment,
        deleteVendorPayment,
        createCombinedRecovery,
        updateRecovery,
        allocateRecoveryReceipt,
        logActivity,
        initiateWhatsAppNotification,
        confirmWhatsAppSent,
        openWhatsAppModal,
        whatsAppModalData,
        setWhatsAppModalData,
        resetToSampleData,
        clearTransactionsOnly,
        clearAllData,
        exportBackupJson,
        importBackupJson,
        linkedSpreadsheetId,
        linkedSpreadsheetTitle,
        linkedSpreadsheetUrl,
        lastSyncedAt,
        isGoogleSheetsModalOpen,
        setIsGoogleSheetsModalOpen,
        setLinkedSpreadsheet,
        clearLinkedSpreadsheet,
        updateLastSyncedAt,
        loadCloudData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
