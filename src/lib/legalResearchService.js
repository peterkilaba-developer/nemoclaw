export async function searchCourtListener(query, options = {}) {
  const res = await fetch('/api/courtListenerSearch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      type: options.type || 'o',
      pageSize: options.pageSize || 5,
    }),
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(`CourtListener search failed (${res.status}): ${message}`);
  }

  return res.json();
}

export function formatCourtListenerResults(searchResponse) {
  const results = searchResponse?.results || [];
  if (!results.length) return '';

  return results.map((item, index) => {
    const parts = [
      `${index + 1}. ${item.caseName || 'Unknown case'}`,
      item.citation ? `Citation: ${item.citation}` : null,
      item.court ? `Court: ${item.court}` : null,
      item.dateFiled ? `Date: ${item.dateFiled}` : null,
      item.url ? `URL: ${item.url}` : null,
      item.snippet ? `Snippet: ${item.snippet.slice(0, 700)}` : null,
    ].filter(Boolean);

    return parts.join(' | ');
  }).join('\n');
}
