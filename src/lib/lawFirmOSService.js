import { auth } from './firebase';

async function getIdTokenOrThrow() {
  const user = auth.currentUser;
  if (!user) throw new Error('Authentication required.');
  return user.getIdToken();
}

async function readJsonResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Request failed with status ${response.status}`);
  }
  return payload;
}

export async function runConflictCheck({ firmId, partyName }) {
  const token = await getIdTokenOrThrow();
  const response = await fetch('/api/runConflictCheck', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ firmId, partyName }),
  });
  return readJsonResponse(response);
}

export async function getSignatureRequest(token) {
  const response = await fetch(`/api/getSignatureRequest?token=${encodeURIComponent(token)}`);
  return readJsonResponse(response);
}

export async function signSignatureRequest({ token, signatureName, consentAccepted }) {
  const response = await fetch('/api/signSignatureRequest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, signatureName, consentAccepted }),
  });
  return readJsonResponse(response);
}
