import assert from 'node:assert/strict';
import { getTargetCollectionForEntity } from '../src/lib/migration/importer.js';
import { MIGRATION_PROVIDER_IDS, MIGRATION_PROVIDERS } from '../src/lib/migration/providers.js';
import { buildImportPreview, normalizeHeader, normalizeMigrationRows, stableHash } from '../src/lib/migration/schema.js';

assert.equal(MIGRATION_PROVIDERS.length, 10, 'research-backed provider catalog should include 10 systems');
assert.deepEqual(MIGRATION_PROVIDER_IDS, [
  'clio',
  'mycase',
  'practicepanther',
  'smokeball',
  'cosmolex',
  'rocketmatter',
  'lawcus',
  'caret',
  'actionstep',
  'filevine',
]);

assert.equal(normalizeHeader('Matter Number'), 'matternumber');
assert.equal(stableHash({ b: 2, a: 1 }), stableHash({ a: 1, b: 2 }));

const contactRows = [
  {
    'Client Name': 'Ada Lovelace',
    'Contact Email': 'ada@example.com',
    Phone: '555-1010',
    Company: 'Analytical Engines LLC',
  },
];
const contacts = normalizeMigrationRows({ rows: contactRows, providerId: 'mycase', fileName: 'mycase-contacts.csv' });
assert.equal(contacts.records[0].entityType, 'clients');
assert.equal(contacts.records[0].data.name, 'Ada Lovelace');
assert.equal(contacts.records[0].data.email, 'ada@example.com');

const matterRows = [
  {
    'Matter Name': 'Estate Planning - Lovelace',
    'Client Name': 'Ada Lovelace',
    'Practice Area': 'Estate Planning',
    Status: 'Open',
    'Matter Number': 'M-1001',
  },
];
const matters = normalizeMigrationRows({ rows: matterRows, providerId: 'clio', fileName: 'clio-matters.csv' });
assert.equal(matters.records[0].entityType, 'matters');
assert.equal(matters.records[0].data.title, 'Estate Planning - Lovelace');
assert.equal(matters.records[0].data.client, 'Ada Lovelace');
assert.equal(matters.records[0].data.status, 'Active');

const timeRows = [
  {
    Activity: 'Draft demand letter',
    Hours: '1.7',
    Rate: '$325',
    Amount: '$552.50',
    'Matter Name': 'Smith PI',
    'Client Name': 'John Smith',
  },
];
const timeEntries = normalizeMigrationRows({ rows: timeRows, providerId: 'rocketmatter', fileName: 'rocketmatter-time.csv' });
assert.equal(timeEntries.records[0].entityType, 'timeEntries');
assert.equal(timeEntries.records[0].data.taskName, 'Draft demand letter');
assert.equal(timeEntries.records[0].data.value, 552.5);

const invoiceRows = [
  {
    'Invoice Number': 'INV-42',
    Amount: '$1,250.00',
    Client: 'Northwind LLC',
  },
];
const invoices = normalizeMigrationRows({ rows: invoiceRows, providerId: 'cosmolex', fileName: 'cosmolex-invoices.csv' });
assert.equal(invoices.records[0].entityType, 'invoices');
assert.equal(invoices.records[0].data.amount, 1250);

const unknown = normalizeMigrationRows({
  rows: [{ Strange: 'unmapped', Other: 'legacy blob' }],
  providerId: 'filevine',
  fileName: 'mystery.csv',
});
assert.equal(unknown.records[0].entityType, 'knowledgeBase');
assert.equal(unknown.summary.warningCount > 0, true);

const preview = buildImportPreview([
  contacts.records[0],
  matters.records[0],
  timeEntries.records[0],
  invoices.records[0],
  unknown.records[0],
]);
assert.deepEqual(preview.counts, {
  clients: 1,
  matters: 1,
  timeEntries: 1,
  invoices: 1,
  knowledgeBase: 1,
});

assert.equal(getTargetCollectionForEntity('clients'), 'clients');
assert.equal(getTargetCollectionForEntity('matters'), 'matters');
assert.equal(getTargetCollectionForEntity('timeEntries'), 'billableActivities');
assert.equal(getTargetCollectionForEntity('invoices'), 'knowledgeBase');

console.log('Migration mapper tests passed.');
