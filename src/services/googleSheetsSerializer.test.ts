import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSyncStoreRows,
  parseSyncStoreRows,
  parseHumanReadableTabsFallback,
  SYNC_STORE_TAB,
} from './googleSheetsSerializer.ts';
import {
  listTravEaseSpreadsheets,
  pullAllFromGoogleSheets,
  SheetsApiError,
} from './googleSheets.ts';
import {
  initialProjects,
  initialTeamMembers,
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
} from '../data/initialData.ts';

test('buildSyncStoreRows and parseSyncStoreRows perform lossless multi-chunk round-trip', () => {
  const input = {
    projects: initialProjects,
    teamMembers: initialTeamMembers,
    vouchers: initialVouchers,
    advances: initialAdvances,
    advanceVoucherMappings: initialAdvanceVoucherMappings,
    disbursements: initialDisbursements,
    settlements: initialSettlements,
    settlementVoucherMappings: initialSettlementVoucherMappings,
    vendorPayments: initialVendorPayments,
    recoveries: initialRecoveries,
    recoveryPaymentMappings: initialRecoveryPaymentMappings,
    notifications: initialNotifications,
    activities: initialActivities,
  };

  // Force small chunk size (250 chars) to exercise chunk splitting and out-of-order reassembly
  const rows = buildSyncStoreRows(input, '2026-11-19T12:00:00.000Z', '19/11/2026, 5:30:00 pm', 250);
  assert.ok(rows.length > 5, 'Should split large state across multiple rows');

  // Shuffle data rows to ensure ChunkIndex ordering works
  const [header, ...dataRows] = rows;
  const reversed = [header, ...dataRows.reverse()];

  const parsed = parseSyncStoreRows(reversed);
  assert.ok(parsed);
  assert.equal(parsed.schemaVersion, 2);
  assert.equal(parsed.syncedAt, '2026-11-19T12:00:00.000Z');
  assert.equal(parsed.data.vouchers.length, initialVouchers.length);
  assert.equal(parsed.data.advances.length, initialAdvances.length);
  assert.equal(parsed.data.advanceVoucherMappings.length, initialAdvanceVoucherMappings.length);
  assert.equal(parsed.data.notifications.length, initialNotifications.length);
  assert.equal(parsed.data.activities.length, initialActivities.length);
  assert.deepEqual(parsed.data.vouchers[0], initialVouchers[0]);
});

test('parseSyncStoreRows returns null for incomplete chunks or invalid JSON', () => {
  const rows = buildSyncStoreRows(
    {
      projects: initialProjects,
      teamMembers: initialTeamMembers,
      vouchers: initialVouchers,
      advances: [],
      advanceVoucherMappings: [],
      disbursements: [],
      settlements: [],
      vendorPayments: [],
      recoveries: [],
    },
    '2026-11-19T12:00:00.000Z',
    '19/11/2026',
    200
  );

  // Drop one chunk to simulate partial/corrupted sheet
  const incomplete = rows.slice(0, rows.length - 1);
  assert.equal(parseSyncStoreRows(incomplete), null);
  assert.equal(parseSyncStoreRows([]), null);
});

test('parseHumanReadableTabsFallback reconstructs records and advance mappings from legacy tabs', () => {
  const parsed = parseHumanReadableTabsFallback({
    'TravEase Summary': [['Last Synchronized', '19/11/2026, 4:00:00 pm']],
    'Projects & Team': [
      ['Active Corporate Projects'],
      ['Project Code', 'Project Name', 'Description / Client', 'Status'],
      ['PRJ-MUM', 'Mumbai Metro Line', 'Civil inspection', 'Active'],
      [''],
      ['Registered Team Members'],
      ['Emp ID', 'Full Name', 'WhatsApp Phone', 'Base Location', 'Department', 'Default Project', 'Status'],
      ['EMP-001', 'Rahul Sharma', '+919876543210', 'Mumbai', 'Engineering', 'Mumbai Metro Line', 'Active'],
    ],
    'Travel Vouchers': [
      [
        'Voucher No',
        'Employee Name',
        'Employee ID',
        'WhatsApp Phone',
        'Base Location',
        'Travel Destination',
        'Project Name',
        'Travel Start Date',
        'Travel End Date',
        'Travel Scenario',
        'Claimed Amount (₹)',
        'Approved Amount (₹)',
        'Overall Status',
        'Settlement Status',
        'Verified By',
        'Approval Date',
        'Description & Notes',
        'Voucher Record ID',
      ],
      [
        'V-2026-014',
        'Rahul Sharma',
        'EMP-001',
        '+919876543210',
        'Mumbai',
        'Delhi',
        'Mumbai Metro Line',
        '2026-10-01',
        '2026-10-04',
        'Travel Completed — Voucher Submitted Afterwards',
        '14500',
        '13800',
        'Closed',
        'Completed',
        'Admin',
        '2026-10-06',
        'Site visit bills',
        'VCH-2026-014',
      ],
    ],
    Advances: [
      [
        'Advance ID',
        'Request Date',
        'Status',
        'Requested Amount (₹)',
        'Approved Amount (₹)',
        'Actually Received (₹)',
        'Total Disbursed (₹)',
        'Available To Disburse (₹)',
        'Bank / Cash Receipt Ref',
        'Funds Received Date',
        'Mapped Voucher Numbers',
        'Allocated Amounts',
        'Remarks',
        'Internal Record ID',
      ],
      [
        'ADV/26/0114',
        '2026-10-06',
        'Closed',
        '13800',
        '13800',
        '13800',
        '13800',
        '0',
        'HDFC-88912',
        '2026-10-08',
        'V-2026-014 (₹13800)',
        '13800',
        'Cleared',
        'ADV-REC-001',
      ],
    ],
    Disbursements: [
      [
        'Disbursement ID',
        'Disbursement Date',
        'Recipient Employee',
        'Employee ID',
        'Linked Voucher No',
        'Advance Reference ID',
        'Amount Disbursed (₹)',
        'Payment Method',
        'Transaction Reference',
        'Remarks',
        'Internal ID',
      ],
      [
        'DISB-001',
        '2026-10-09',
        'Rahul Sharma',
        'EMP-001',
        'V-2026-014',
        'ADV/26/0114',
        '13800',
        'Bank Transfer',
        'NEFT-7712',
        'Paid',
        'DISB-001',
      ],
    ],
  });

  assert.ok(parsed);
  assert.equal(parsed.data.projects.length, 1);
  assert.equal(parsed.data.teamMembers.length, 1);
  assert.equal(parsed.data.vouchers.length, 1);
  assert.equal(parsed.data.vouchers[0].id, 'VCH-2026-014');
  assert.equal(parsed.data.vouchers[0].approvedAmount, 13800);
  assert.equal(parsed.data.advances.length, 1);
  assert.equal(parsed.data.advanceVoucherMappings.length, 1);
  assert.equal(parsed.data.advanceVoucherMappings[0].voucherRecordId, 'VCH-2026-014');
  assert.equal(parsed.data.disbursements.length, 1);
  assert.equal(parsed.data.disbursements[0].advanceRecordId, 'ADV-REC-001');
  assert.equal(parsed.syncedAtDisplay, '19/11/2026, 4:00:00 pm');
});

test('listTravEaseSpreadsheets and pullAllFromGoogleSheets support Drive discovery and multi-device loading', async () => {
  const originalFetch = globalThis.fetch;
  try {
    const syncRows = buildSyncStoreRows(
      {
        projects: initialProjects,
        teamMembers: initialTeamMembers,
        vouchers: initialVouchers,
        advances: initialAdvances,
        advanceVoucherMappings: initialAdvanceVoucherMappings,
        disbursements: initialDisbursements,
        settlements: initialSettlements,
        settlementVoucherMappings: initialSettlementVoucherMappings,
        vendorPayments: initialVendorPayments,
        recoveries: initialRecoveries,
        recoveryPaymentMappings: initialRecoveryPaymentMappings,
        notifications: initialNotifications,
        activities: initialActivities,
      },
      '2026-11-19T14:00:00.000Z',
      '19/11/2026, 7:30:00 pm'
    );

    globalThis.fetch = (async (input: string | URL) => {
      const url = String(input);
      if (url.includes('drive/v3/files')) {
        return new Response(
          JSON.stringify({
            files: [
              {
                id: 'other-1',
                name: 'Random Budget',
                modifiedTime: '2026-11-19T15:00:00.000Z',
              },
              {
                id: 'travease-1',
                name: 'TravEase Travel Tracker',
                modifiedTime: '2026-11-19T14:00:00.000Z',
                appProperties: { travEaseApp: 'true' },
              },
            ],
          }),
          { status: 200 }
        );
      }

      if (url.includes('fields=spreadsheetId')) {
        return new Response(
          JSON.stringify({
            spreadsheetId: 'travease-1',
            properties: { title: 'TravEase Travel Tracker' },
            sheets: [
              { properties: { title: 'TravEase Summary' } },
              { properties: { title: 'Travel Vouchers' } },
              { properties: { title: SYNC_STORE_TAB } },
            ],
          }),
          { status: 200 }
        );
      }

      if (url.includes(encodeURIComponent(`'${SYNC_STORE_TAB}'!A1:F200`))) {
        return new Response(JSON.stringify({ values: syncRows }), { status: 200 });
      }

      return new Response(JSON.stringify({ error: { message: 'Not found' } }), { status: 404 });
    }) as typeof fetch;

    const files = await listTravEaseSpreadsheets('ya29.testtoken');
    assert.equal(files.length, 2);
    assert.equal(files[0].id, 'travease-1');
    assert.equal(files[0].isTravEaseApp, true);

    const pulled = await pullAllFromGoogleSheets('travease-1', 'ya29.testtoken');
    assert.equal(pulled.source, 'sync_store');
    assert.equal(pulled.meta.title, 'TravEase Travel Tracker');
    assert.equal(pulled.payload.data.vouchers.length, initialVouchers.length);

    // Verify empty spreadsheet raises informative SheetsApiError
    globalThis.fetch = (async (input: string | URL) => {
      const url = String(input);
      if (url.includes('fields=spreadsheetId')) {
        return new Response(
          JSON.stringify({
            spreadsheetId: 'blank-1',
            properties: { title: 'Blank Sheet' },
            sheets: [{ properties: { title: 'Sheet1' } }],
          }),
          { status: 200 }
        );
      }
      return new Response(JSON.stringify({}), { status: 200 });
    }) as typeof fetch;

    await assert.rejects(
      () => pullAllFromGoogleSheets('blank-1', 'ya29.testtoken'),
      (err: any) => err instanceof SheetsApiError && err.status === 404
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
