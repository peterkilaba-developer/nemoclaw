import { useMemo, useRef, useState } from 'react';
import Papa from 'papaparse';
import { AlertTriangle, ArrowRight, CheckCircle, Database, FileText, Loader2, ShieldCheck, UploadCloud } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useFirm } from '../contexts/FirmContext';
import { db } from '../lib/firebase';
import { importMigrationRecords } from '../lib/migration/importer';
import { MIGRATION_PROVIDERS, getMigrationProvider } from '../lib/migration/providers';
import { normalizeMigrationRows } from '../lib/migration/schema';

const ENTITY_LABELS = {
  clients: 'Clients',
  contacts: 'Contacts',
  matters: 'Matters',
  tasks: 'Tasks',
  notes: 'Notes',
  timeEntries: 'Time',
  expenses: 'Expenses',
  invoices: 'Invoices',
  documents: 'Docs',
  trustBalances: 'Trust',
  knowledgeBase: 'Knowledge',
  calendar: 'Calendar',
};

export default function MigrationCenter() {
  const { user } = useAuth();
  const { firmId, refreshFirm } = useFirm();
  const fileInputRef = useRef(null);
  const [selectedProviderId, setSelectedProviderId] = useState('clio');
  const [fileMeta, setFileMeta] = useState(null);
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [parseError, setParseError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState('');

  const selectedProvider = useMemo(() => getMigrationProvider(selectedProviderId), [selectedProviderId]);
  const previewRows = useMemo(() => records.slice(0, 8), [records]);
  const entityCounts = useMemo(() => Object.entries(summary?.counts || {}), [summary]);

  const handleProviderSelect = providerId => {
    setSelectedProviderId(providerId);
    setImportResult(null);
    setImportError('');
  };

  const handleFile = async file => {
    if (!file) return;
    setParseError('');
    setImportError('');
    setImportResult(null);
    setFileMeta({ name: file.name, size: file.size });
    try {
      const rows = await parseMigrationFile(file);
      const normalized = normalizeMigrationRows({
        rows,
        providerId: selectedProvider.id,
        fileName: file.name,
      });
      setRecords(normalized.records);
      setSummary(normalized.summary);
      setWarnings(normalized.warnings);
    } catch (err) {
      setRecords([]);
      setSummary(null);
      setWarnings([]);
      setParseError(err.message || 'Could not parse this export.');
    }
  };

  const handleFileInput = event => {
    handleFile(event.target.files?.[0]);
    event.target.value = '';
  };

  const handleDrop = event => {
    event.preventDefault();
    setDragging(false);
    handleFile(event.dataTransfer.files?.[0]);
  };

  const handleImport = async () => {
    if (!records.length || importing) return;
    setImporting(true);
    setImportError('');
    try {
      const result = await importMigrationRecords({
        database: db,
        firmId,
        records,
        provider: selectedProvider,
        user,
      });
      setImportResult(result);
      if (refreshFirm) await refreshFirm();
    } catch (err) {
      setImportError(err.message || 'Migration import failed.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="db-page-container" style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <div className="db-page-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
          <div>
            <h1 className="db-page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <UploadCloud size={24} color="var(--db-nvidia-green)" />
              Migration Center
            </h1>
            <p className="db-page-subtitle">
              Bring legacy practice data into NemoC LAW AI as clients, matters, billable activity, and searchable firm knowledge.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', border: '1px solid var(--db-border)', borderRadius: '8px', background: 'var(--db-surface)' }}>
            <ShieldCheck size={16} color="var(--db-nvidia-green)" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--db-text-primary)' }}>Import writes only to your firm workspace</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <StatCard label="Supported providers" value="10" meta="Legacy and modern SaaS exports" />
        <StatCard label="Live path" value="CSV/JSON" meta="No vendor credentials required" />
        <StatCard label="Canonical targets" value="4" meta="CRM, matters, billing, knowledge" />
        <StatCard label="Connector posture" value="API-ready" meta="OAuth connectors can reuse mapper" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 0.9fr) minmax(320px, 1.1fr)', gap: '24px', alignItems: 'start' }}>
        <section className="db-card" style={{ padding: '20px' }}>
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1rem', margin: '0 0 6px', color: 'var(--db-text-primary)' }}>1. Choose legacy system</h2>
            <p style={{ fontSize: '0.75rem', margin: 0, color: 'var(--db-text-muted)', lineHeight: 1.5 }}>
              Select the system the firm already uses, then upload its export.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
            {MIGRATION_PROVIDERS.map(provider => (
              <ProviderCard
                key={provider.id}
                provider={provider}
                selected={provider.id === selectedProvider.id}
                onSelect={handleProviderSelect}
              />
            ))}
          </div>
        </section>

        <section className="db-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '1rem', margin: '0 0 6px', color: 'var(--db-text-primary)' }}>2. Upload and map</h2>
              <p style={{ fontSize: '0.75rem', margin: 0, color: 'var(--db-text-muted)', lineHeight: 1.5 }}>
                {selectedProvider.name} exports are normalized before anything is imported.
              </p>
            </div>
            <ProviderBadge provider={selectedProvider} />
          </div>

          <div
            onDragOver={event => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            style={{
              border: `1px dashed ${dragging ? 'var(--db-nvidia-green)' : 'var(--db-border)'}`,
              borderRadius: '8px',
              background: dragging ? 'rgba(118,185,0,0.08)' : 'var(--db-bg)',
              padding: '28px',
              textAlign: 'center',
              marginBottom: '18px',
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.json,.txt,text/csv,application/json,text/plain"
              style={{ display: 'none' }}
              onChange={handleFileInput}
            />
            <UploadCloud size={34} color="var(--db-nvidia-green)" style={{ marginBottom: '12px' }} />
            <div style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--db-text-primary)', marginBottom: '6px' }}>
              Drop a CSV, JSON, or text export
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)', marginBottom: '16px' }}>
              Accepted now: contacts, matters, notes, tasks, billing rows, invoices, expenses, and document indexes.
            </div>
            <button type="button" className="db-btn db-btn-primary" onClick={() => fileInputRef.current?.click()}>
              <FileText size={16} /> Choose Export File
            </button>
          </div>

          {fileMeta && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', color: 'var(--db-text-secondary)', fontSize: '0.75rem' }}>
              <Database size={14} />
              <span>{fileMeta.name}</span>
              <span>{formatBytes(fileMeta.size)}</span>
            </div>
          )}

          {parseError && <InlineAlert type="error" message={parseError} />}
          {warnings.length > 0 && (
            <InlineAlert
              type="warning"
              message={`${warnings.length} mapping warning${warnings.length === 1 ? '' : 's'} found. Review the preview before import.`}
            />
          )}
          {importError && <InlineAlert type="error" message={importError} />}
          {importResult && (
            <InlineAlert
              type="success"
              message={`Imported ${importResult.imported} records into NemoC LAW AI. Batch ${importResult.batchId} is saved for audit.`}
            />
          )}

          {summary && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '18px' }}>
              <MiniMetric label="Rows read" value={summary.totalRows} />
              <MiniMetric label="Importable" value={summary.importableRows} />
              <MiniMetric label="Confidence" value={`${Math.round(summary.averageConfidence * 100)}%`} />
              <MiniMetric label="Warnings" value={summary.warningCount} />
            </div>
          )}

          {entityCounts.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '18px' }}>
              {entityCounts.map(([entityType, count]) => (
                <span key={entityType} style={{ padding: '6px 8px', borderRadius: '6px', background: 'var(--db-bg)', border: '1px solid var(--db-border)', color: 'var(--db-text-primary)', fontSize: '0.6875rem', fontWeight: 700 }}>
                  {ENTITY_LABELS[entityType] || entityType}: {count}
                </span>
              ))}
            </div>
          )}

          <button
            type="button"
            className="db-btn db-btn-primary"
            disabled={!records.length || !firmId || importing}
            onClick={handleImport}
            style={{ width: '100%', justifyContent: 'center', marginBottom: '18px' }}
          >
            {importing ? <Loader2 size={16} className="spin" /> : <ArrowRight size={16} />}
            {importing ? 'Importing...' : `Import ${records.length || 0} Records to NemoC LAW AI`}
          </button>

          {!firmId && (
            <div style={{ fontSize: '0.75rem', color: '#ef4444', textAlign: 'center' }}>
              A firm workspace is required before migration import can run.
            </div>
          )}
        </section>
      </div>

      {previewRows.length > 0 && (
        <section className="db-card" style={{ marginTop: '24px', padding: 0, overflow: 'hidden' }}>
          <div className="db-card-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--db-border)' }}>
            <div>
              <h3 className="db-card-title">Mapped Preview</h3>
              <p className="db-card-desc">First records that will be imported. Warnings stay attached to the migration batch.</p>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="db-table" style={{ minWidth: '820px' }}>
              <thead>
                <tr>
                  <th>Entity</th>
                  <th>Primary record</th>
                  <th>Client or matter</th>
                  <th>Confidence</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map(record => (
                  <tr key={record.id}>
                    <td>{ENTITY_LABELS[record.entityType] || record.entityType}</td>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--db-text-primary)' }}>{primaryRecordLabel(record)}</div>
                      {record.warnings.length > 0 && (
                        <div style={{ color: '#f59e0b', fontSize: '0.6875rem', marginTop: '3px' }}>{record.warnings[0]}</div>
                      )}
                    </td>
                    <td>{record.data.client || record.data.matter || record.data.matterName || '--'}</td>
                    <td>{Math.round(record.confidence * 100)}%</td>
                    <td>{record.source.fileName} / row {record.source.rowNumber}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function ProviderCard({ provider, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(provider.id)}
      style={{
        border: selected ? `1px solid ${provider.accent}` : '1px solid var(--db-border)',
        borderRadius: '8px',
        background: selected ? 'rgba(118,185,0,0.08)' : 'var(--db-bg)',
        color: 'var(--db-text-primary)',
        padding: '12px',
        textAlign: 'left',
        cursor: 'pointer',
        minHeight: '116px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
        <span style={{ fontSize: '0.8125rem', fontWeight: 800 }}>{provider.shortName}</span>
        {selected && <CheckCircle size={14} color="var(--db-nvidia-green)" />}
      </div>
      <div style={{ fontSize: '0.625rem', fontWeight: 800, textTransform: 'uppercase', color: selected ? 'var(--db-nvidia-green)' : 'var(--db-text-muted)', marginBottom: '8px' }}>
        {provider.migrationPath}
      </div>
      <div style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)', lineHeight: 1.45 }}>
        {provider.supportedEntities.slice(0, 4).map(entity => ENTITY_LABELS[entity] || entity).join(', ')}
      </div>
    </button>
  );
}

function ProviderBadge({ provider }) {
  return (
    <div style={{ minWidth: '150px', border: '1px solid var(--db-border)', borderRadius: '8px', padding: '10px', background: 'var(--db-bg)' }}>
      <div style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)', marginBottom: '4px' }}>Selected</div>
      <div style={{ fontSize: '0.8125rem', fontWeight: 800, color: 'var(--db-text-primary)' }}>{provider.name}</div>
    </div>
  );
}

function StatCard({ label, value, meta }) {
  return (
    <div className="db-stat-card">
      <div className="db-stat-label">{label}</div>
      <div className="db-stat-value">{value}</div>
      <div className="db-stat-meta">{meta}</div>
    </div>
  );
}

function MiniMetric({ label, value }) {
  return (
    <div style={{ border: '1px solid var(--db-border)', borderRadius: '8px', padding: '12px', background: 'var(--db-bg)' }}>
      <div style={{ fontSize: '0.625rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--db-text-muted)', marginBottom: '6px' }}>{label}</div>
      <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--db-text-primary)' }}>{value}</div>
    </div>
  );
}

function InlineAlert({ type, message }) {
  const isError = type === 'error';
  const isSuccess = type === 'success';
  const color = isSuccess ? '#16a34a' : isError ? '#ef4444' : '#f59e0b';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', border: `1px solid ${color}33`, color, borderRadius: '8px', padding: '10px 12px', background: `${color}14`, fontSize: '0.75rem', fontWeight: 700, marginBottom: '14px' }}>
      {isSuccess ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
      {message}
    </div>
  );
}

async function parseMigrationFile(file) {
  const text = await file.text();
  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith('.json') || file.type === 'application/json') {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed.rows)) return parsed.rows;
    if (Array.isArray(parsed.items)) return parsed.items;
    if (Array.isArray(parsed.data)) return parsed.data;
    return [parsed];
  }

  if (lowerName.endsWith('.txt') || file.type === 'text/plain') {
    return [{ entityType: 'knowledgeBase', title: file.name, content: text }];
  }

  const result = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: header => header.trim(),
  });
  const blockingError = result.errors.find(error => error.type !== 'FieldMismatch');
  if (blockingError) throw new Error(blockingError.message);
  return result.data;
}

function primaryRecordLabel(record) {
  return record.data.name
    || record.data.title
    || record.data.taskName
    || record.data.invoiceNumber
    || record.data.fileName
    || record.legacyId;
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
