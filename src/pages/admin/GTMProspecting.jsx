import { useState, useEffect, useRef } from 'react';
import {
  Search, MapPin, Globe, Phone, Star, Plus, ExternalLink,
  RefreshCw, Building2, Eye, Mail, Trash2,
  CheckCircle2, AlertCircle, Users, Target, Loader, Zap
} from 'lucide-react';
import {
  searchLawFirms, getPlaceDetails, addProspect,
  getProspects, updateProspect, deleteProspect, getProspectStats,
  triggerAutonomousSDR
} from '../../lib/prospectService';
const STATUS_COLORS = {
  researched: { color: '#3b82f6', label: 'Researched' },
  outreach_sent: { color: '#f59e0b', label: 'Outreach Sent' },
  followed_up: { color: '#a78bfa', label: 'Followed Up' },
  responded: { color: '#16a34a', label: 'Responded' },
  converted: { color: '#76b900', label: 'Signed Up' },
  not_interested: { color: '#64748b', label: 'Not Interested' },
};

export default function GTMProspecting({ onProspectsChange }) {
  const [searchLocation, setSearchLocation] = useState('');
  const [searchKeywords, setSearchKeywords] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState('');
  const [prospects, setProspects] = useState([]);
  const [_loadingProspects, setLoadingProspects] = useState(true);
  const [selectedProspect, setSelectedProspect] = useState(null);
  const [addingId, setAddingId] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState({});
  const [enrichedDetails, setEnrichedDetails] = useState({});
  const [editEmail, setEditEmail] = useState({});
  const [prospectStats, setProspectStats] = useState(null);
  const [isSDRLoop, setIsSDRLoop] = useState(false);
  const [view, setView] = useState('search'); // search | list
  const locationInputRef = useRef(null);
  const autocompleteRef = useRef(null);

  // Google Places Autocomplete — polls for API readiness since script loads async
  useEffect(() => {
    let interval;
    let listener;

    const initAutocomplete = () => {
      const input = locationInputRef.current;
      if (!input || !window.google?.maps?.places) return false;

      // Avoid double-attach
      if (autocompleteRef.current) return true;

      const ac = new window.google.maps.places.Autocomplete(input, {
        types: ['(cities)'],
        fields: ['formatted_address', 'name', 'geometry'],
      });

      listener = ac.addListener('place_changed', () => {
        const place = ac.getPlace();
        if (place?.formatted_address || place?.name) {
          setSearchLocation(place.formatted_address || place.name);
        }
      });

      autocompleteRef.current = ac;
      return true;
    };

    // Try immediately, then poll every 300ms until API is ready
    if (!initAutocomplete()) {
      interval = setInterval(() => {
        if (initAutocomplete()) clearInterval(interval);
      }, 300);
    }

    return () => {
      if (interval) clearInterval(interval);
      if (listener) window.google?.maps?.event?.removeListener(listener);
      autocompleteRef.current = null;
    };
  }, [view]); // re-init when switching back to search view

  const loadProspects = async () => {
    setLoadingProspects(true);
    try {
      const [data, stats] = await Promise.all([getProspects(), getProspectStats()]);
      setProspects(data);
      setProspectStats(stats);
      onProspectsChange?.(data);
    } catch (err) {
      console.error('Failed to load prospects', err);
    } finally {
      setLoadingProspects(false);
    }
  };

  useEffect(() => {
    loadProspects();
    // Prospecting dashboard bootstrap should run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async () => {
    if (!searchLocation.trim()) return;
    setSearching(true);
    setSearchError('');
    setSearchResults([]);
    try {
      const results = await searchLawFirms(searchLocation.trim(), searchKeywords.trim());
      setSearchResults(results);
      if (results.length === 0) setSearchError('No law firms found. Try a different location or keywords.');
    } catch (err) {
      setSearchError(err.message);
    } finally {
      setSearching(false);
    }
  };

  const handleGetDetails = async (placeId) => {
    if (enrichedDetails[placeId]) return;
    setDetailsLoading(prev => ({ ...prev, [placeId]: true }));
    try {
      const details = await getPlaceDetails(placeId);
      setEnrichedDetails(prev => ({ ...prev, [placeId]: details }));
    } catch (err) {
      console.error('Failed to get details', err);
    } finally {
      setDetailsLoading(prev => ({ ...prev, [placeId]: false }));
    }
  };

  const handleAddProspect = async (result) => {
    setAddingId(result.placeId);
    try {
      const details = enrichedDetails[result.placeId];
      await addProspect({
        ...result,
        ...(details || {}),
        firmName: result.name,
        source: 'google_places',
      });
      await loadProspects();
    } catch (err) {
      alert(err.message);
    } finally {
      setAddingId(null);
    }
  };

  const handleSaveEmail = async (prospectId, email) => {
    try {
      await updateProspect(prospectId, { email });
      await loadProspects();
      setEditEmail(prev => ({ ...prev, [prospectId]: false }));
    } catch (err) {
      console.error('Failed to save email', err);
    }
  };

  const handleDelete = async (prospectId) => {
    if (!confirm('Remove this prospect?')) return;
    try {
      await deleteProspect(prospectId);
      if (selectedProspect?.id === prospectId) setSelectedProspect(null);
      await loadProspects();
    } catch (err) {
      console.error('Failed to delete', err);
    }
  };

  const handleAutonomousLoop = async () => {
    setIsSDRLoop(true);
    try {
      const result = await triggerAutonomousSDR();
      const msg = result.error
        ? `SDR Agent error in ${result.city}: ${result.error}`
        : `SDR Agent: ${result.city} (${result.practiceArea})\n→ ${result.found} firms found, ${result.added} added to pipeline, ${result.enriched} emails enriched`;
      alert(msg);
      await loadProspects();
    } catch (err) {
      console.error(err);
      alert('SDR loop failed: ' + err.message);
    } finally {
      setIsSDRLoop(false);
    }
  };

  const existingPlaceIds = new Set(prospects.map(p => p.placeId).filter(Boolean));
  const bs = prospectStats?.byStatus || {};

  return (
    <>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px', marginBottom: '24px' }}>
        <KpiCard label="Total Prospects" value={prospectStats?.total || 0} icon={Users} color="#3b82f6" sub="All sources" />
        <KpiCard label="Researched" value={bs.researched || 0} icon={Search} color="#8b5cf6" sub="Ready for outreach" />
        <KpiCard label="Outreach Sent" value={(bs.outreach_sent || 0) + (bs.followed_up || 0)} icon={Mail} color="#f59e0b" sub="Emails sent" />
        <KpiCard label="Responded" value={bs.responded || 0} icon={CheckCircle2} color="#16a34a" sub="Engaged" />
        <KpiCard label="Signed Up" value={bs.waitlist_signed || 0} icon={Target} color="#76b900" sub="Converted" />
      </div>

      {/* View Toggle */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
        {[{ id: 'search', label: `Search Firms` }, { id: 'list', label: `My Prospects (${prospects.length})` }].map(v => (
          <button key={v.id} onClick={() => setView(v.id)} style={{
            padding: '6px 16px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px',
            background: view === v.id ? 'rgba(118,185,0,0.12)' : 'transparent',
            color: view === v.id ? '#76b900' : 'rgba(255,255,255,0.4)',
            cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700,
          }}>{v.label}</button>
        ))}
      </div>

      {view === 'search' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px' }}>
          {/* Search + Results */}
          <Card title="Find Law Firms" subtitle="Search by city, state, or region using Google Places">
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <MapPin size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', zIndex: 1 }} />
                <input
                  ref={locationInputRef}
                  placeholder="City, State (e.g. Dallas, TX)"
                  value={searchLocation}
                  onChange={e => setSearchLocation(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  style={{
                    width: '100%', padding: '10px 10px 10px 32px', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px', background: 'rgba(255,255,255,0.04)', color: '#fff',
                    fontSize: '0.8125rem', outline: 'none',
                  }}
                />
              </div>
              <input
                placeholder="Keywords (optional)"
                value={searchKeywords}
                onChange={e => setSearchKeywords(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                style={{
                  width: '160px', padding: '10px 12px', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px', background: 'rgba(255,255,255,0.04)', color: '#fff',
                  fontSize: '0.8125rem', outline: 'none',
                }}
              />
              <button onClick={handleSearch} disabled={searching || !searchLocation.trim()} style={{
                padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 700,
                background: 'linear-gradient(135deg, #76b900, #4a7a00)', color: '#000',
                cursor: 'pointer', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '6px',
                opacity: searching || !searchLocation.trim() ? 0.5 : 1,
              }}>
                {searching ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={14} />}
                {searching ? 'Searching...' : 'Search'}
              </button>

              <button onClick={handleAutonomousLoop} disabled={isSDRLoop} style={{
                padding: '10px 20px', borderRadius: '8px', border: '1px solid rgba(118,185,0,0.2)', fontWeight: 700,
                background: 'rgba(118,185,0,0.1)', color: '#76b900',
                cursor: 'pointer', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '6px',
                opacity: isSDRLoop ? 0.5 : 1,
              }}>
                {isSDRLoop ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={14} />}
                {isSDRLoop ? 'Agent Prospecting...' : 'Trigger SDR Loop'}
              </button>
            </div>

            {searchError && (
              <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', fontSize: '0.75rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <AlertCircle size={14} /> {searchError}
              </div>
            )}

            {searchResults.length > 0 && (
              <div style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.3)', marginBottom: '10px', fontWeight: 600 }}>
                {searchResults.length} FIRMS FOUND
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '520px', overflow: 'auto' }}>
              {searchResults.map(result => {
                const details = enrichedDetails[result.placeId];
                const alreadyAdded = existingPlaceIds.has(result.placeId);
                return (
                  <div key={result.placeId} style={{
                    padding: '14px 16px', borderRadius: '10px',
                    background: alreadyAdded ? 'rgba(118,185,0,0.04)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${alreadyAdded ? 'rgba(118,185,0,0.15)' : 'rgba(255,255,255,0.06)'}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff' }}>{result.name}</div>
                        <div style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <MapPin size={10} /> {result.address}
                        </div>
                      </div>
                      {result.rating && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                          <Star size={12} color="#f59e0b" fill="#f59e0b" />
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff' }}>{result.rating}</span>
                          <span style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.3)' }}>({result.reviewCount})</span>
                        </div>
                      )}
                    </div>

                    {details && (
                      <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
                        {details.phone && <span style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={10} /> {details.phone}</span>}
                        {details.website && <a href={details.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.6875rem', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}><Globe size={10} /> Website</a>}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                      {!details && (
                        <button onClick={() => handleGetDetails(result.placeId)} disabled={detailsLoading[result.placeId]} style={{
                          padding: '4px 10px', borderRadius: '6px', fontSize: '0.625rem', fontWeight: 700,
                          background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)',
                          color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                        }}>
                          <Eye size={10} /> {detailsLoading[result.placeId] ? '...' : 'Details'}
                        </button>
                      )}
                      {alreadyAdded ? (
                        <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.625rem', fontWeight: 700, background: 'rgba(118,185,0,0.1)', color: '#76b900' }}>
                          ✓ Added
                        </span>
                      ) : (
                        <button onClick={() => handleAddProspect(result)} disabled={addingId === result.placeId} style={{
                          padding: '4px 10px', borderRadius: '6px', fontSize: '0.625rem', fontWeight: 700,
                          background: 'rgba(118,185,0,0.1)', border: '1px solid rgba(118,185,0,0.2)',
                          color: '#76b900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                        }}>
                          <Plus size={10} /> {addingId === result.placeId ? 'Adding...' : 'Add to Prospects'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {searchResults.length === 0 && !searching && !searchError && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.25)' }}>
                <Building2 size={32} style={{ marginBottom: '10px', opacity: 0.3 }} />
                <div style={{ fontSize: '0.8125rem' }}>Search for law firms by location</div>
                <div style={{ fontSize: '0.6875rem', marginTop: '4px' }}>e.g. "Houston, TX" or "Chicago, IL"</div>
              </div>
            )}
            <style>{`
              @keyframes spin { to { transform: rotate(360deg) } }
              .pac-container {
                background: #1a1f2e !important;
                border: 1px solid rgba(255,255,255,0.12) !important;
                border-radius: 10px !important;
                margin-top: 4px !important;
                box-shadow: 0 12px 40px rgba(0,0,0,0.5) !important;
                font-family: 'Inter', -apple-system, sans-serif !important;
                z-index: 10000 !important;
              }
              .pac-item {
                padding: 8px 14px !important;
                border-top: 1px solid rgba(255,255,255,0.06) !important;
                color: rgba(255,255,255,0.7) !important;
                cursor: pointer !important;
                font-size: 0.8125rem !important;
              }
              .pac-item:first-child { border-top: none !important; }
              .pac-item:hover, .pac-item-selected {
                background: rgba(118,185,0,0.1) !important;
              }
              .pac-item-query {
                color: #fff !important;
                font-weight: 600 !important;
                font-size: 0.8125rem !important;
              }
              .pac-matched { color: #76b900 !important; font-weight: 700 !important; }
              .pac-icon { display: none !important; }
              .pac-logo::after { display: none !important; }
            `}</style>
          </Card>

          {/* Sidebar: Recent Prospects + State Distribution */}
          <div>
            <Card title="Recently Added" subtitle={`${prospects.length} total prospects`}>
              {prospects.slice(0, 8).map(p => (
                <div key={p.id}
                  onClick={() => { setSelectedProspect(p); setView('list'); }}
                  role="button" tabIndex={0}
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.firmName}</div>
                    <div style={{ fontSize: '0.5625rem', color: 'rgba(255,255,255,0.35)' }}>{[p.city, p.state].filter(Boolean).join(', ') || p.address}</div>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
              ))}
              {prospects.length === 0 && (
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', padding: '20px 0', textAlign: 'center' }}>No prospects yet</div>
              )}
            </Card>

            <Card title="Top States" subtitle="Geographic distribution">
              {Object.entries(prospectStats?.byState || {}).sort(([,a],[,b]) => b - a).slice(0, 6).map(([state, count], i) => (
                <div key={state} style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 0',
                  borderBottom: i < 5 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}>
                  <MapPin size={10} color="#76b900" />
                  <span style={{ flex: 1, fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>{state}</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#76b900' }}>{count}</span>
                </div>
              ))}
              {(!prospectStats?.byState || Object.keys(prospectStats.byState).length === 0) && (
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', padding: '16px 0', textAlign: 'center' }}>No data yet</div>
              )}
            </Card>
          </div>
        </div>
      )}

      {view === 'list' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px' }}>
          {/* Prospect List */}
          <Card title="All Prospects" subtitle={`${prospects.length} firms in pipeline`}>
            <div style={{ maxHeight: '560px', overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Firm', 'Location', 'Rating', 'Email', 'Status', ''].map(h => (
                      <th key={h} style={{
                        padding: '6px 10px', textAlign: 'left', fontSize: '0.5625rem', fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.3)',
                        borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'sticky', top: 0, background: '#0d1117',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {prospects.map(p => (
                    <tr key={p.id} onClick={() => setSelectedProspect(selectedProspect?.id === p.id ? null : p)}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}>
                      <td style={{ padding: '10px' }}>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#fff' }}>{p.firmName}</div>
                        {p.website && <a href={p.website} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: '0.5625rem', color: '#3b82f6' }}>{p.website.replace(/https?:\/\//, '').split('/')[0]}</a>}
                      </td>
                      <td style={{ padding: '10px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                        {[p.city, p.state].filter(Boolean).join(', ') || '—'}
                      </td>
                      <td style={{ padding: '10px' }}>
                        {p.rating ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.75rem', color: '#f59e0b' }}>
                            <Star size={10} fill="#f59e0b" /> {p.rating}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '10px', fontSize: '0.75rem', color: p.email ? '#76b900' : 'rgba(255,255,255,0.25)' }}>
                        {p.email || 'Not set'}
                      </td>
                      <td style={{ padding: '10px' }}><StatusBadge status={p.status} /></td>
                      <td style={{ padding: '10px' }}>
                        <button onClick={e => { e.stopPropagation(); handleDelete(p.id); }} style={{
                          padding: '3px 6px', border: 'none', borderRadius: '4px', background: 'transparent',
                          color: 'rgba(255,255,255,0.2)', cursor: 'pointer',
                        }}><Trash2 size={12} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Detail Panel */}
          <div>
            {selectedProspect ? (
              <Card title="Prospect Detail" subtitle={selectedProspect.firmName}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <DetailRow label="Address" value={selectedProspect.address} />
                  <DetailRow label="City" value={[selectedProspect.city, selectedProspect.state].filter(Boolean).join(', ')} />
                  <DetailRow label="Phone" value={selectedProspect.phone} />
                  <DetailRow label="Website" value={selectedProspect.website} link />
                  <DetailRow label="Rating" value={selectedProspect.rating ? `${selectedProspect.rating} ⭐ (${selectedProspect.reviewCount} reviews)` : 'N/A'} />
                  <DetailRow label="Status" value={<StatusBadge status={selectedProspect.status} />} />
                  <DetailRow label="Outreach Count" value={selectedProspect.outreachCount || 0} />
                  <DetailRow label="Source" value={selectedProspect.source || 'google_places'} />

                  {/* Email field (editable) */}
                  <div>
                    <div style={{ fontSize: '0.625rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>Contact Email</div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        placeholder="contact@firm.com"
                        value={editEmail[selectedProspect.id] ?? selectedProspect.email ?? ''}
                        onChange={e => setEditEmail(prev => ({ ...prev, [selectedProspect.id]: e.target.value }))}
                        style={{
                          flex: 1, padding: '6px 10px', border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '6px', background: 'rgba(255,255,255,0.04)', color: '#fff',
                          fontSize: '0.75rem', outline: 'none',
                        }}
                      />
                      <button onClick={() => handleSaveEmail(selectedProspect.id, editEmail[selectedProspect.id] || '')} style={{
                        padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(118,185,0,0.2)',
                        background: 'rgba(118,185,0,0.1)', color: '#76b900', cursor: 'pointer',
                        fontSize: '0.625rem', fontWeight: 700,
                      }}>Save</button>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <div style={{ fontSize: '0.625rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>Notes</div>
                    <textarea
                      placeholder="Add notes..."
                      defaultValue={selectedProspect.notes}
                      onBlur={e => updateProspect(selectedProspect.id, { notes: e.target.value })}
                      style={{
                        width: '100%', padding: '8px 10px', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '6px', background: 'rgba(255,255,255,0.04)', color: '#fff',
                        fontSize: '0.75rem', outline: 'none', minHeight: '60px', resize: 'vertical',
                        fontFamily: 'inherit',
                      }}
                    />
                  </div>

                  {selectedProspect.googleUrl && (
                    <a href={selectedProspect.googleUrl} target="_blank" rel="noopener noreferrer" style={{
                      padding: '8px', borderRadius: '8px', fontSize: '0.6875rem', fontWeight: 600,
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                      color: 'rgba(255,255,255,0.5)', textDecoration: 'none', textAlign: 'center',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    }}>
                      <ExternalLink size={12} /> View on Google Maps
                    </a>
                  )}
                </div>
              </Card>
            ) : (
              <Card title="Select a Prospect" subtitle="Click a firm to view details">
                <div style={{ textAlign: 'center', padding: '32px 0', color: 'rgba(255,255,255,0.2)' }}>
                  <Building2 size={28} style={{ marginBottom: '8px', opacity: 0.3 }} />
                  <div style={{ fontSize: '0.75rem' }}>Click a row to see details and add contact info</div>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/* ── Sub-components ── */
function Card({ title, subtitle, children }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '12px', padding: '20px', marginBottom: '16px',
    }}>
      {title && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff' }}>{title}</div>
          {subtitle && <div style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.4)' }}>{subtitle}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, color, sub }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '12px', padding: '16px 18px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{ fontSize: '0.625rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
        <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={14} color={color} />
        </div>
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', marginBottom: '2px' }}>{value}</div>
      <div style={{ fontSize: '0.5625rem', color: 'rgba(255,255,255,0.3)' }}>{sub}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const cfg = STATUS_COLORS[status] || STATUS_COLORS.researched;
  return (
    <span style={{
      padding: '2px 8px', borderRadius: '6px', fontSize: '0.5625rem', fontWeight: 700,
      background: `${cfg.color}15`, color: cfg.color, border: `1px solid ${cfg.color}30`,
    }}>{cfg.label}</span>
  );
}

function DetailRow({ label, value, link }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{label}</span>
      {link ? (
        <a href={value} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: '#3b82f6', textDecoration: 'none', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value.replace(/https?:\/\//, '').split('/')[0]}</a>
      ) : (
        <span style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 600, textAlign: 'right', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{typeof value === 'object' ? value : String(value)}</span>
      )}
    </div>
  );
}
