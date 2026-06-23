import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { buildImportPreview, stableStringify } from './schema.js';

const FIRESTORE_COLLECTION_BY_ENTITY = {
  clients: 'clients',
  contacts: 'clients',
  matters: 'matters',
  timeEntries: 'billableActivities',
  tasks: 'knowledgeBase',
  notes: 'knowledgeBase',
  expenses: 'knowledgeBase',
  invoices: 'knowledgeBase',
  documents: 'knowledgeBase',
  trustBalances: 'knowledgeBase',
  knowledgeBase: 'knowledgeBase',
};

export function getTargetCollectionForEntity(entityType) {
  return FIRESTORE_COLLECTION_BY_ENTITY[entityType] || 'knowledgeBase';
}

export async function importMigrationRecords({ database, firmId, records, provider, user }) {
  if (!database) throw new Error('Firestore database is required.');
  if (!firmId) throw new Error('Firm workspace is required before importing.');
  if (!Array.isArray(records) || records.length === 0) throw new Error('No migration records are ready to import.');

  const providerId = provider?.id || records[0]?.legacyProvider || 'legacy';
  const batchId = `mig_${providerId}_${Date.now()}`;
  const chunks = chunk(records, 400);
  let imported = 0;

  for (const recordChunk of chunks) {
    const batch = writeBatch(database);
    recordChunk.forEach(record => {
      const collectionName = getTargetCollectionForEntity(record.entityType);
      const targetRef = doc(collection(database, 'firms', firmId, collectionName));
      batch.set(targetRef, buildFirestoreDocument(record, { batchId, providerId, providerName: provider?.name, user }));
    });
    await batch.commit();
    imported += recordChunk.length;
  }

  const summary = buildImportPreview(records);
  const sourceFiles = [...new Set(records.map(record => record.source.fileName).filter(Boolean))];
  const summaryBatch = writeBatch(database);
  summaryBatch.set(doc(database, 'firms', firmId, 'migrationBatches', batchId), {
    batchId,
    providerId,
    providerName: provider?.name || providerId,
    status: 'completed',
    imported,
    counts: summary.counts,
    warningCount: summary.warningCount,
    averageConfidence: summary.averageConfidence,
    sourceFiles,
    importedBy: user?.email || user?.uid || 'unknown',
    importedByUid: user?.uid || null,
    importedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  });
  await summaryBatch.commit();

  return {
    batchId,
    imported,
    counts: summary.counts,
  };
}

export function buildFirestoreDocument(record, context) {
  const importedAt = serverTimestamp();
  const base = {
    legacyProvider: context.providerId,
    legacyProviderName: context.providerName || context.providerId,
    legacyId: record.legacyId,
    legacyRawHash: record.legacyRawHash,
    migrationBatchId: context.batchId,
    migrationConfidence: record.confidence,
    migrationWarnings: record.warnings,
    migrationSourceFile: record.source.fileName,
    migrationSourceRow: record.source.rowNumber,
    createdByMigration: true,
    createdBy: context.user?.uid || null,
    createdByEmail: context.user?.email || null,
    createdAt: importedAt,
    updatedAt: importedAt,
  };

  if (record.entityType === 'clients' || record.entityType === 'contacts') {
    return {
      ...base,
      ...record.data,
      status: record.data.status || 'Active',
    };
  }

  if (record.entityType === 'matters') {
    return {
      ...base,
      ...record.data,
      title: record.data.title || 'Imported Matter',
      client: record.data.client || 'Imported Client',
      type: record.data.type || 'General',
      status: record.data.status || 'Active',
      description: record.data.description || 'Imported from legacy practice management system.',
      feeStructure: record.data.feeStructure || 'hourly',
      rate: record.data.rate || 0,
      assignedTo: context.user?.displayName || context.user?.email || 'Migration Owner',
      assignedEmails: context.user?.email ? [context.user.email] : [],
      assignedUserIds: context.user?.uid ? [context.user.uid] : [],
      ethicalWall: false,
    };
  }

  if (record.entityType === 'timeEntries') {
    return {
      ...base,
      agentRole: 'Migration Import',
      taskName: record.data.taskName || 'Imported billable activity',
      matterName: record.data.matterName || record.data.matter || 'Unassigned',
      client: record.data.client || null,
      duration: record.data.duration || '0h',
      rate: record.data.rate || null,
      value: record.data.value || 0,
      status: record.data.status || 'detected',
      timestamp: importedAt,
    };
  }

  return {
    ...base,
    fileName: knowledgeFileName(record),
    fileSize: knowledgeContent(record).length,
    fileType: 'application/json',
    content: knowledgeContent(record),
    uploadedBy: context.user?.email || 'migration',
    uploadedAt: importedAt,
    knowledgeType: record.entityType,
    title: record.data.title || record.data.fileName || `Imported ${record.entityType}`,
  };
}

function knowledgeFileName(record) {
  const cleanSource = String(record.source.fileName || 'legacy-export').replace(/[^a-z0-9.-]+/gi, '-');
  return `${record.entityType}-${record.source.rowNumber}-${cleanSource}.json`;
}

function knowledgeContent(record) {
  return stableStringify({
    entityType: record.entityType,
    data: record.data,
    raw: record.raw,
    source: record.source,
    legacyProvider: record.legacyProvider,
    legacyId: record.legacyId,
  });
}

function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}
