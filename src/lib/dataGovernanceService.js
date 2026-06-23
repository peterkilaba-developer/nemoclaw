async function requestJson(path, payload = {}, method = 'POST') {
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: method === 'GET' ? undefined : JSON.stringify(payload),
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : {};

  if (!res.ok && res.status !== 202) {
    throw new Error(data.error || data.details || `${path} failed with ${res.status}`);
  }

  return { ...data, accepted: res.status === 202 };
}

export function exportFirmAuditLog(firmId, limit = 250) {
  return requestJson('/api/exportFirmAuditLog', { firmId, limit });
}

export function exportFirmData(firmId) {
  return requestJson('/api/exportFirmData', { firmId });
}

export function requestFirmDataDeletion(firmId, requestedBy, reason = '') {
  return requestJson('/api/requestFirmDataDeletion', {
    firmId,
    requestedBy,
    reason,
  });
}
