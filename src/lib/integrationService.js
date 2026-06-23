async function postJson(path, payload) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : {};

  if (!res.ok && res.status !== 202) {
    throw new Error(data.error || data.details || `${path} failed with ${res.status}`);
  }

  return { ...data, accepted: res.status === 202 };
}

export function getIntegrationStatus(firmId) {
  return postJson('/api/getIntegrationStatus', { firmId });
}

export function postSlackNotification(firmId, message) {
  return postJson('/api/postSlackNotification', { firmId, message });
}

export function syncGoogleCalendarDeadline(firmId, deadline) {
  return postJson('/api/syncGoogleCalendarDeadline', { firmId, deadline });
}

export function syncClioMatter(firmId, matter) {
  return postJson('/api/syncClioMatter', { firmId, matter });
}
