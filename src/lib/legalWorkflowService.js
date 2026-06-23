async function postWorkflow(path, payload) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : {};

  if (!res.ok) {
    throw new Error(data.error || data.details || `${path} failed with ${res.status}`);
  }

  return data;
}

export function runEDiscoveryReview(firmId, documents, options = {}) {
  return postWorkflow('/api/runEDiscoveryReview', {
    firmId,
    documents,
    reviewIssue: options.reviewIssue,
    query: options.query,
    batesPrefix: options.batesPrefix,
  });
}

export function runTrustReconciliation(firmId, ledger, bankTransactions) {
  return postWorkflow('/api/runTrustReconciliation', {
    firmId,
    ledger,
    bankTransactions,
  });
}

export function prepareCourtFiling(firmId, filing) {
  return postWorkflow('/api/prepareCourtFiling', {
    firmId,
    ...filing,
  });
}

export function runCaseAnalytics(firmId, matter, options = {}) {
  return postWorkflow('/api/runCaseAnalytics', {
    firmId,
    matter,
    query: options.query,
  });
}

export function recordHumanApproval(firmId, approval) {
  return postWorkflow('/api/recordHumanApproval', {
    firmId,
    ...approval,
  });
}
