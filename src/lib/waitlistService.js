import {
  collection, addDoc, getDocs, doc, updateDoc, query,
  orderBy, serverTimestamp, where, getCountFromServer
} from 'firebase/firestore';
import { db } from './firebase';

const WAITLIST_COL = 'waitlist';

/* ═══════════════════════════════════════════════
   LEAD SCORING ENGINE
   ═══════════════════════════════════════════════ */
function calculateLeadScore({ firmSize, practiceAreas, selectedTasks, location }) {
  let score = 0;

  // Firm size (bigger = higher value)
  const sizeScores = { 'solo': 15, '2-5': 30, '5-10': 45, '10+': 60 };
  score += sizeScores[firmSize] || 10;

  // Practice areas selected (shows engagement)
  score += Math.min((practiceAreas?.length || 0) * 4, 16);

  // Tasks selected (more = higher intent)
  score += Math.min((selectedTasks?.length || 0) * 3, 18);

  // Location provided (shows seriousness)
  if (location && location.length > 2) score += 6;

  return Math.min(score, 100);
}

function getLeadTier(score) {
  if (score >= 70) return 'hot';
  if (score >= 45) return 'warm';
  return 'cold';
}

/* ═══════════════════════════════════════════════
   WAITLIST CRUD
   ═══════════════════════════════════════════════ */

/**
 * Add a new waitlist submission to Firestore.
 */
export async function addWaitlistLead(formData) {
  const score = calculateLeadScore(formData);
  const tier = getLeadTier(score);

  const lead = {
    email: formData.email,
    firmSize: formData.firmSize,
    practiceAreas: formData.practiceAreas || [],
    selectedTasks: formData.selectedTasks || [],
    location: formData.location || '',
    leadScore: score,
    tier,
    status: 'new',              // new → contacted → qualified → converted
    source: 'waitlist_form',
    notes: '',
    followUpDate: null,
    contactedAt: null,
    convertedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, WAITLIST_COL), lead);
  return { id: docRef.id, ...lead };
}

/**
 * Get all waitlist leads, ordered by newest first.
 */
export async function getWaitlistLeads() {
  const q = query(
    collection(db, WAITLIST_COL),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Update a lead's status (e.g., new → contacted → qualified → converted).
 */
export async function updateLeadStatus(leadId, status) {
  const updates = { status, updatedAt: serverTimestamp() };
  if (status === 'contacted') updates.contactedAt = serverTimestamp();
  if (status === 'converted') updates.convertedAt = serverTimestamp();

  await updateDoc(doc(db, WAITLIST_COL, leadId), updates);
}

/**
 * Update lead notes/follow-up.
 */
export async function updateLeadNotes(leadId, notes) {
  await updateDoc(doc(db, WAITLIST_COL, leadId), {
    notes,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Get waitlist analytics (counts by status, tier).
 */
export async function getWaitlistStats() {
  const allLeads = await getWaitlistLeads();

  const stats = {
    total: allLeads.length,
    byStatus: { new: 0, contacted: 0, qualified: 0, converted: 0 },
    byTier: { hot: 0, warm: 0, cold: 0 },
    byFirmSize: {},
    topTasks: {},
    topAreas: {},
    topLocations: {},
    recentLeads: allLeads.slice(0, 10),
  };

  for (const lead of allLeads) {
    // Status
    stats.byStatus[lead.status] = (stats.byStatus[lead.status] || 0) + 1;

    // Tier
    stats.byTier[lead.tier] = (stats.byTier[lead.tier] || 0) + 1;

    // Firm size
    stats.byFirmSize[lead.firmSize] = (stats.byFirmSize[lead.firmSize] || 0) + 1;

    // Tasks
    for (const task of (lead.selectedTasks || [])) {
      stats.topTasks[task] = (stats.topTasks[task] || 0) + 1;
    }

    // Practice areas
    for (const area of (lead.practiceAreas || [])) {
      stats.topAreas[area] = (stats.topAreas[area] || 0) + 1;
    }

    // Locations
    if (lead.location) {
      stats.topLocations[lead.location] = (stats.topLocations[lead.location] || 0) + 1;
    }
  }

  return stats;
}

export { calculateLeadScore, getLeadTier };
