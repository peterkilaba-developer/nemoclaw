export const MIGRATION_ENTITY_TYPES = [
  'clients',
  'contacts',
  'matters',
  'tasks',
  'notes',
  'timeEntries',
  'expenses',
  'invoices',
  'documents',
  'trustBalances',
  'knowledgeBase',
];

export const FIELD_ALIASES = {
  entityType: ['entity', 'entityType', 'recordType', 'type', 'exportType', 'objectType'],
  legacyId: ['id', 'recordId', 'legacyId', 'externalId', 'matterId', 'caseId', 'clientId', 'contactId', 'projectId'],
  clientName: ['client', 'clientName', 'clientFullName', 'contactName', 'contact', 'accountName', 'leadName', 'partyName', 'participant'],
  firstName: ['firstName', 'first', 'givenName'],
  lastName: ['lastName', 'last', 'surname', 'familyName'],
  email: ['email', 'emailAddress', 'contactEmail', 'clientEmail', 'primaryEmail'],
  phone: ['phone', 'phoneNumber', 'mobile', 'cell', 'clientPhone', 'contactPhone', 'primaryPhone'],
  company: ['company', 'companyName', 'organization', 'businessName', 'entityName', 'account'],
  address: ['address', 'mailingAddress', 'streetAddress', 'clientAddress', 'contactAddress'],
  matterTitle: ['matter', 'matterName', 'matterTitle', 'caseName', 'caseTitle', 'projectName', 'actionName', 'clientMatter', 'fileName'],
  matterNumber: ['matterNumber', 'caseNumber', 'fileNumber', 'projectNumber', 'referenceNumber'],
  matterType: ['matterType', 'caseType', 'practiceArea', 'areaOfLaw', 'legalArea'],
  matterStatus: ['status', 'matterStatus', 'caseStatus', 'projectStatus', 'phase', 'stage', 'pipelineStage', 'step'],
  description: ['description', 'matterDescription', 'caseDescription', 'summary', 'details', 'memo'],
  openedAt: ['openDate', 'opened', 'openedAt', 'createdDate', 'createdAt', 'startDate'],
  closedAt: ['closeDate', 'closed', 'closedAt', 'completedAt', 'endDate'],
  assignedTo: ['assignedTo', 'responsibleAttorney', 'assignedLawyer', 'owner', 'staff', 'attorney'],
  taskTitle: ['task', 'taskName', 'taskTitle', 'todo', 'todoTitle', 'activity', 'subject', 'actionItem'],
  dueDate: ['dueDate', 'deadline', 'taskDueDate', 'calendarDate', 'eventDate'],
  noteTitle: ['noteTitle', 'title', 'subject'],
  noteBody: ['note', 'notes', 'body', 'comment', 'comments', 'content', 'message'],
  duration: ['duration', 'hours', 'billableHours', 'time', 'timeSpent', 'quantity'],
  rate: ['rate', 'hourlyRate', 'billRate'],
  amount: ['amount', 'total', 'value', 'fee', 'invoiceAmount', 'expenseAmount', 'trustBalance'],
  invoiceNumber: ['invoiceNumber', 'invoiceNo', 'billNumber', 'billingNumber'],
  expenseVendor: ['vendor', 'payee', 'merchant'],
  documentName: ['document', 'documentName', 'fileName', 'filename', 'attachmentName'],
  documentUrl: ['url', 'documentUrl', 'downloadUrl', 'fileUrl', 'link'],
  trustBalance: ['trustBalance', 'ioltaBalance', 'retainerBalance', 'clientTrustBalance'],
};

const ENTITY_MATCHES = [
  { entityType: 'timeEntries', words: ['timeentry', 'timeentries', 'time', 'billingentry', 'activity', 'billableactivity'] },
  { entityType: 'trustBalances', words: ['trust', 'trustbalance', 'iolta', 'retainer'] },
  { entityType: 'expenses', words: ['expense', 'cost', 'hardcost', 'softcost'] },
  { entityType: 'invoices', words: ['invoice', 'bill', 'billing'] },
  { entityType: 'documents', words: ['document', 'file', 'attachment'] },
  { entityType: 'tasks', words: ['task', 'todo', 'deadline', 'calendar', 'event'] },
  { entityType: 'notes', words: ['note', 'comment', 'message'] },
  { entityType: 'matters', words: ['matter', 'case', 'project', 'action'] },
  { entityType: 'clients', words: ['client', 'contact', 'lead', 'account', 'person'] },
];

export function normalizeHeader(header) {
  return String(header ?? '')
    .replace(/\uFEFF/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

export function cleanValue(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

export function normalizeRowKeys(row) {
  return Object.entries(row || {}).reduce((acc, [key, value]) => {
    const normalizedKey = normalizeHeader(key);
    if (!normalizedKey) return acc;
    return { ...acc, [normalizedKey]: cleanValue(value) };
  }, {});
}

export function pick(rowIndex, aliases) {
  const normalizedAliases = aliases.map(alias => normalizeHeader(alias));
  const key = normalizedAliases.find(alias => cleanValue(rowIndex[alias]));
  return key ? cleanValue(rowIndex[key]) : '';
}

export function stableHash(value) {
  const input = typeof value === 'string' ? value : stableStringify(value);
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `m_${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(item => stableStringify(item)).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function parseMoney(value) {
  const cleaned = cleanValue(value).replace(/[$,]/g, '');
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export function detectEntityType(row, fileName = '') {
  const rowIndex = normalizeRowKeys(row);
  const explicit = normalizeHeader(pick(rowIndex, FIELD_ALIASES.entityType));
  const explicitMatch = ENTITY_MATCHES.find(match => match.words.some(word => explicit.includes(word)));
  if (explicitMatch) return explicitMatch.entityType;

  const fileHint = normalizeHeader(fileName);
  const fileMatch = ENTITY_MATCHES.find(match => match.words.some(word => fileHint.includes(word)));
  const has = aliases => Boolean(pick(rowIndex, aliases));

  const scores = {
    clients: Number(has(FIELD_ALIASES.clientName)) + Number(has(FIELD_ALIASES.email)) + Number(has(FIELD_ALIASES.phone)) + Number(has(FIELD_ALIASES.company)),
    matters: (Number(has(FIELD_ALIASES.matterTitle)) * 2) + Number(has(FIELD_ALIASES.matterNumber)) + Number(has(FIELD_ALIASES.matterType)) + Number(has(FIELD_ALIASES.matterStatus)),
    tasks: (Number(has(FIELD_ALIASES.taskTitle)) * 2) + Number(has(FIELD_ALIASES.dueDate)),
    notes: Number(has(FIELD_ALIASES.noteBody)) + Number(has(FIELD_ALIASES.noteTitle)),
    timeEntries: (Number(has(FIELD_ALIASES.duration)) * 2) + Number(has(FIELD_ALIASES.rate)) + Number(has(FIELD_ALIASES.amount)) + Number(has(FIELD_ALIASES.taskTitle)),
    expenses: (Number(has(FIELD_ALIASES.expenseVendor)) * 2) + Number(has(FIELD_ALIASES.amount)),
    invoices: (Number(has(FIELD_ALIASES.invoiceNumber)) * 2) + Number(has(FIELD_ALIASES.amount)),
    documents: (Number(has(FIELD_ALIASES.documentName)) * 2) + Number(has(FIELD_ALIASES.documentUrl)),
    trustBalances: (Number(has(FIELD_ALIASES.trustBalance)) * 2) + Number(has(FIELD_ALIASES.clientName)),
  };

  const scored = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [bestEntity, bestScore] = scored[0];
  if (bestScore >= 2) return bestEntity;
  if (fileMatch && bestScore > 0) return fileMatch.entityType;
  if (bestScore > 0) return bestEntity;
  return 'knowledgeBase';
}

export function normalizeMigrationRows({ rows, providerId, fileName = 'legacy-export' }) {
  const inputRows = Array.isArray(rows) ? rows : [];
  const records = inputRows
    .map((row, index) => normalizeMigrationRecord({ row, index, providerId, fileName }))
    .filter(record => Object.keys(record.raw).length > 0);
  const rowWarnings = records.flatMap(record => record.warnings.map(warning => `Row ${record.source.rowNumber}: ${warning}`));

  return {
    records,
    summary: buildImportPreview(records, inputRows.length),
    warnings: rowWarnings.slice(0, 50),
  };
}

export function buildImportPreview(records, totalRows = records.length) {
  const counts = records.reduce((acc, record) => {
    const nextCount = (acc[record.entityType] || 0) + 1;
    return { ...acc, [record.entityType]: nextCount };
  }, {});
  const warningCount = records.reduce((total, record) => total + record.warnings.length, 0);
  const averageConfidence = records.length
    ? records.reduce((total, record) => total + record.confidence, 0) / records.length
    : 0;

  return {
    totalRows,
    importableRows: records.length,
    counts,
    warningCount,
    averageConfidence: Number(averageConfidence.toFixed(2)),
  };
}

export function normalizeMigrationRecord({ row, index, providerId, fileName }) {
  const raw = normalizeRowKeys(row);
  const entityType = detectEntityType(row, fileName);
  const data = mapEntityData(entityType, raw, fileName);
  const legacyRawHash = stableHash(raw);
  const legacyId = pick(raw, FIELD_ALIASES.legacyId) || legacyRawHash;
  const confidence = calculateConfidence(entityType, data);
  const warnings = buildWarnings(entityType, data, confidence);

  return {
    id: stableHash(`${providerId}:${fileName}:${index}:${legacyId}:${legacyRawHash}`),
    entityType,
    legacyProvider: providerId,
    legacyId,
    legacyRawHash,
    confidence,
    warnings,
    source: {
      fileName,
      rowNumber: index + 1,
    },
    raw,
    data,
  };
}

export function mapEntityData(entityType, row, fileName = 'legacy-export') {
  if (entityType === 'clients' || entityType === 'contacts') return mapClient(row);
  if (entityType === 'matters') return mapMatter(row);
  if (entityType === 'tasks') return mapTask(row);
  if (entityType === 'notes') return mapNote(row, fileName);
  if (entityType === 'timeEntries') return mapTimeEntry(row);
  if (entityType === 'expenses') return mapExpense(row);
  if (entityType === 'invoices') return mapInvoice(row);
  if (entityType === 'documents') return mapDocument(row);
  if (entityType === 'trustBalances') return mapTrustBalance(row);
  return mapKnowledge(row, fileName);
}

function mapClient(row) {
  const composedName = `${pick(row, FIELD_ALIASES.firstName)} ${pick(row, FIELD_ALIASES.lastName)}`.trim();
  const name = pick(row, FIELD_ALIASES.clientName) || composedName || pick(row, FIELD_ALIASES.company) || 'Imported Client';
  const [firstName, ...lastParts] = name.split(' ').filter(Boolean);

  return pruneEmpty({
    name,
    firstName: pick(row, FIELD_ALIASES.firstName) || firstName || '',
    lastName: pick(row, FIELD_ALIASES.lastName) || lastParts.join(' '),
    email: pick(row, FIELD_ALIASES.email),
    phone: pick(row, FIELD_ALIASES.phone),
    company: pick(row, FIELD_ALIASES.company),
    address: pick(row, FIELD_ALIASES.address),
    status: normalizeStatus(pick(row, FIELD_ALIASES.matterStatus), 'Active'),
  });
}

function mapMatter(row) {
  const title = pick(row, FIELD_ALIASES.matterTitle) || pick(row, FIELD_ALIASES.description) || 'Imported Matter';
  return pruneEmpty({
    title,
    client: pick(row, FIELD_ALIASES.clientName) || pick(row, FIELD_ALIASES.company) || 'Imported Client',
    type: pick(row, FIELD_ALIASES.matterType) || 'General',
    status: normalizeStatus(pick(row, FIELD_ALIASES.matterStatus), 'Active'),
    stage: pick(row, FIELD_ALIASES.matterStatus) || 'Imported',
    description: pick(row, FIELD_ALIASES.description),
    matterNumber: pick(row, FIELD_ALIASES.matterNumber),
    openedAtLegacy: pick(row, FIELD_ALIASES.openedAt),
    closedAtLegacy: pick(row, FIELD_ALIASES.closedAt),
    assignedToLegacy: pick(row, FIELD_ALIASES.assignedTo),
  });
}

function mapTask(row) {
  return pruneEmpty({
    title: pick(row, FIELD_ALIASES.taskTitle) || pick(row, FIELD_ALIASES.noteTitle) || 'Imported Task',
    client: pick(row, FIELD_ALIASES.clientName),
    matter: pick(row, FIELD_ALIASES.matterTitle),
    dueDateLegacy: pick(row, FIELD_ALIASES.dueDate),
    status: normalizeStatus(pick(row, FIELD_ALIASES.matterStatus), 'Open'),
    assignedToLegacy: pick(row, FIELD_ALIASES.assignedTo),
    body: pick(row, FIELD_ALIASES.noteBody) || pick(row, FIELD_ALIASES.description),
  });
}

function mapNote(row, fileName) {
  const body = pick(row, FIELD_ALIASES.noteBody) || pick(row, FIELD_ALIASES.description) || stableStringify(row);
  return pruneEmpty({
    title: pick(row, FIELD_ALIASES.noteTitle) || `Imported note from ${fileName}`,
    client: pick(row, FIELD_ALIASES.clientName),
    matter: pick(row, FIELD_ALIASES.matterTitle),
    content: body,
  });
}

function mapTimeEntry(row) {
  const amount = parseMoney(pick(row, FIELD_ALIASES.amount));
  const rate = parseMoney(pick(row, FIELD_ALIASES.rate));
  return pruneEmpty({
    taskName: pick(row, FIELD_ALIASES.taskTitle) || pick(row, FIELD_ALIASES.description) || 'Imported billable activity',
    matterName: pick(row, FIELD_ALIASES.matterTitle),
    client: pick(row, FIELD_ALIASES.clientName),
    duration: pick(row, FIELD_ALIASES.duration),
    rate,
    value: amount,
    status: normalizeStatus(pick(row, FIELD_ALIASES.matterStatus), 'detected'),
    performedAtLegacy: pick(row, FIELD_ALIASES.openedAt),
  });
}

function mapExpense(row) {
  return pruneEmpty({
    title: pick(row, FIELD_ALIASES.taskTitle) || pick(row, FIELD_ALIASES.description) || 'Imported expense',
    client: pick(row, FIELD_ALIASES.clientName),
    matter: pick(row, FIELD_ALIASES.matterTitle),
    vendor: pick(row, FIELD_ALIASES.expenseVendor),
    amount: parseMoney(pick(row, FIELD_ALIASES.amount)),
    status: normalizeStatus(pick(row, FIELD_ALIASES.matterStatus), 'Imported'),
  });
}

function mapInvoice(row) {
  return pruneEmpty({
    invoiceNumber: pick(row, FIELD_ALIASES.invoiceNumber),
    client: pick(row, FIELD_ALIASES.clientName),
    matter: pick(row, FIELD_ALIASES.matterTitle),
    amount: parseMoney(pick(row, FIELD_ALIASES.amount)),
    status: normalizeStatus(pick(row, FIELD_ALIASES.matterStatus), 'Imported'),
    description: pick(row, FIELD_ALIASES.description),
  });
}

function mapDocument(row) {
  const name = pick(row, FIELD_ALIASES.documentName) || pick(row, FIELD_ALIASES.noteTitle) || 'Imported document';
  return pruneEmpty({
    fileName: name,
    title: name,
    client: pick(row, FIELD_ALIASES.clientName),
    matter: pick(row, FIELD_ALIASES.matterTitle),
    url: pick(row, FIELD_ALIASES.documentUrl),
    content: pick(row, FIELD_ALIASES.noteBody) || pick(row, FIELD_ALIASES.description),
  });
}

function mapTrustBalance(row) {
  return pruneEmpty({
    client: pick(row, FIELD_ALIASES.clientName),
    matter: pick(row, FIELD_ALIASES.matterTitle),
    balance: parseMoney(pick(row, FIELD_ALIASES.trustBalance) || pick(row, FIELD_ALIASES.amount)),
    status: normalizeStatus(pick(row, FIELD_ALIASES.matterStatus), 'Imported'),
    description: pick(row, FIELD_ALIASES.description),
  });
}

function mapKnowledge(row, fileName) {
  const content = pick(row, FIELD_ALIASES.noteBody) || pick(row, FIELD_ALIASES.description) || stableStringify(row);
  return pruneEmpty({
    title: pick(row, FIELD_ALIASES.noteTitle) || `Imported legacy row from ${fileName}`,
    content,
  });
}

function calculateConfidence(entityType, data) {
  const required = {
    clients: ['name'],
    contacts: ['name'],
    matters: ['title', 'client'],
    tasks: ['title'],
    notes: ['content'],
    timeEntries: ['taskName', 'duration'],
    expenses: ['title', 'amount'],
    invoices: ['invoiceNumber', 'amount'],
    documents: ['fileName'],
    trustBalances: ['client', 'balance'],
    knowledgeBase: ['content'],
  }[entityType] || ['content'];

  const present = required.filter(field => data[field] !== undefined && data[field] !== null && data[field] !== '').length;
  const base = required.length ? present / required.length : 0.5;
  return Number(Math.max(0.35, Math.min(0.98, base)).toFixed(2));
}

function buildWarnings(entityType, data, confidence) {
  const warnings = [];
  if (entityType === 'knowledgeBase') {
    warnings.push('Could not confidently classify this row, so it will import as searchable knowledge.');
  }
  if (entityType === 'matters' && !data.client) {
    warnings.push('Matter row is missing a client name.');
  }
  if ((entityType === 'clients' || entityType === 'contacts') && !data.email && !data.phone) {
    warnings.push('Client row is missing email and phone.');
  }
  if (entityType === 'timeEntries' && !data.duration) {
    warnings.push('Time entry row is missing duration or hours.');
  }
  if (confidence < 0.7) {
    warnings.push('Low confidence mapping, review before import.');
  }
  return warnings;
}

function normalizeStatus(value, fallback) {
  const status = cleanValue(value);
  if (!status) return fallback;
  const normalized = status.toLowerCase();
  if (['closed', 'complete', 'completed', 'inactive'].includes(normalized)) return 'Closed';
  if (['open', 'active', 'new', 'pending'].includes(normalized)) return 'Active';
  return status;
}

function pruneEmpty(value) {
  return Object.entries(value).reduce((acc, [key, item]) => {
    if (item === '' || item === null || item === undefined) return acc;
    return { ...acc, [key]: item };
  }, {});
}
