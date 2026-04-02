/**
 * Prospect Service: Handles real-time firm data enrichment and GTM pipeline
 * 
 * Interacts with Firebase Cloud Functions to scrape live websites
 * and fetch deep firm intelligence.
 */

import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

const IS_LOCAL = window.location.hostname === 'localhost';
const PROD_URL = 'https://scrapewebsite-2sejsgollq-uc.a.run.app';
const LOCAL_URL = 'http://127.0.0.1:5001/nemoc-law-ai/us-central1/scrapeWebsite';

// ALWAYS use the public gateway unless we explicitly opt-in to a local emulator suite
const CLOUD_FUNCTION_URL = PROD_URL;

/**
 * Live Website Scraper (for redesign engine)
 * Includes a 10-second timeout to prevent UI hangs.
 */
export async function scrapeFirmWebsite(url) {
  if (!url) return null;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout for multi-page deep crawl

  try {
    const response = await fetch(CLOUD_FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ websiteUrl: url }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to scrape: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.warn('🌐 ProspectService: Scrape timed out, falling back to intelligence engine.');
    } else {
      console.error('🌐 ProspectService: Scrape error:', error.message);
    }
    return { error: error.message, simulated: true };
  }
}

/**
 * GTM / SDR Pipeline Functions (for admin dashboard)
 */

export async function searchLawFirms(location, keywords = '') {
  // Mock search results since we would normally use Google Places API here
  console.log('Searching firms in', location, keywords);
  return []; // Return empty for now to avoid breaking the build with complex logic
}

export async function getPlaceDetails(placeId) {
  return { placeId, phone: '', website: '' };
}

export async function addProspect(data) {
  return addDoc(collection(db, 'prospects'), {
    ...data,
    status: 'researched',
    createdAt: serverTimestamp(),
  });
}

export async function getProspects() {
  const q = query(collection(db, 'prospects'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function updateProspect(id, data) {
  const ref = doc(db, 'prospects', id);
  return updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
}

export async function deleteProspect(id) {
  const ref = doc(db, 'prospects', id);
  return deleteDoc(ref);
}

export async function getProspectStats() {
  const prospects = await getProspects();
  const byStatus = {};
  prospects.forEach(p => {
    byStatus[p.status] = (byStatus[p.status] || 0) + 1;
  });
  return { 
    total: prospects.length, 
    byStatus,
    byState: {} 
  };
}

export async function triggerAutonomousSDR() {
  return { city: 'Demo', found: 0, added: 0, enriched: 0 };
}
