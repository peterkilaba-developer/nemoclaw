/**
 * Prospect Service: live firm discovery, enrichment, and GTM pipeline writes.
 */

import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { enrichProspect } from './enrichmentService';

const PROD_SCRAPE_URL = 'https://scrapewebsite-2sejsgollq-uc.a.run.app';
const CLOUD_FUNCTION_URL = PROD_SCRAPE_URL;
const GOOGLE_PLACES_URL = 'https://places.googleapis.com/v1/places:searchText';
const GOOGLE_PLACE_DETAILS_URL = 'https://places.googleapis.com/v1/places';
const DEFAULT_PAGE_SIZE = 8;

const SDR_CITIES = [
  'Dallas, TX',
  'Houston, TX',
  'Austin, TX',
  'San Antonio, TX',
  'Fort Worth, TX',
  'Phoenix, AZ',
  'Denver, CO',
  'Atlanta, GA',
  'Miami, FL',
  'Chicago, IL',
];

const SDR_PRACTICE_QUERIES = [
  'personal injury law firm',
  'family law firm',
  'immigration law firm',
  'criminal defense law firm',
  'estate planning law firm',
];

function getGoogleMapsKey() {
  return import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
}

function normalizePlace(place, fallbackLocation = '') {
  return {
    placeId: place.id || place.name || '',
    name: place.displayName?.text || place.name || 'Unknown Firm',
    address: place.formattedAddress || fallbackLocation,
    location: place.formattedAddress || fallbackLocation,
    phone: place.nationalPhoneNumber || place.internationalPhoneNumber || '',
    website: place.websiteUri || '',
    rating: place.rating || null,
    reviewCount: place.userRatingCount || null,
    googleUrl: place.googleMapsUri || '',
    source: 'google_places',
  };
}

function prospectKey(prospect) {
  return [
    prospect.placeId || '',
    prospect.website || '',
    prospect.name || prospect.firmName || '',
  ].join('|').toLowerCase();
}

function pickRotatingItems(items, count) {
  const start = new Date().getDate() % items.length;
  return Array.from({ length: Math.min(count, items.length) }, (_, i) => items[(start + i) % items.length]);
}

/**
 * Live Website Scraper (for redesign engine).
 */
export async function scrapeFirmWebsite(url) {
  if (!url) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);

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

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.warn('ProspectService: scrape timed out.');
    } else {
      console.error('ProspectService: scrape error:', error.message);
    }
    throw error;
  }
}

export async function searchLawFirms(location, keywords = '') {
  const apiKey = getGoogleMapsKey();
  if (!apiKey) {
    throw new Error('Google Maps API key is not configured.');
  }

  const textQuery = `${keywords || 'law firm'} in ${location}`.trim();
  const response = await fetch(GOOGLE_PLACES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': [
        'places.id',
        'places.displayName',
        'places.formattedAddress',
        'places.websiteUri',
        'places.nationalPhoneNumber',
        'places.internationalPhoneNumber',
        'places.rating',
        'places.userRatingCount',
        'places.googleMapsUri',
      ].join(','),
    },
    body: JSON.stringify({
      textQuery,
      pageSize: DEFAULT_PAGE_SIZE,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Google Places search failed (${response.status}): ${detail}`);
  }

  const data = await response.json();
  return (data.places || []).map((place) => normalizePlace(place, location));
}

export async function getPlaceDetails(placeId) {
  const apiKey = getGoogleMapsKey();
  if (!apiKey) {
    throw new Error('Google Maps API key is not configured.');
  }

  if (!placeId) {
    throw new Error('Place id is required.');
  }

  const response = await fetch(`${GOOGLE_PLACE_DETAILS_URL}/${encodeURIComponent(placeId)}`, {
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': [
        'id',
        'displayName',
        'formattedAddress',
        'websiteUri',
        'nationalPhoneNumber',
        'internationalPhoneNumber',
        'rating',
        'userRatingCount',
        'googleMapsUri',
      ].join(','),
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Google Places details failed (${response.status}): ${detail}`);
  }

  const place = await response.json();
  return normalizePlace(place);
}

export async function addProspect(data) {
  return addDoc(collection(db, 'prospects'), {
    ...data,
    firmName: data.firmName || data.name,
    status: data.status || 'researched',
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
  const byState = {};

  prospects.forEach(p => {
    byStatus[p.status] = (byStatus[p.status] || 0) + 1;
    const state = p.state || p.location?.match(/\b[A-Z]{2}\b/)?.[0] || 'unknown';
    byState[state] = (byState[state] || 0) + 1;
  });

  return {
    total: prospects.length,
    byStatus,
    byState,
  };
}

export async function runSDRBlitz(cityCount = 3, onProgress = null) {
  const cities = pickRotatingItems(SDR_CITIES, cityCount);
  const practiceQueries = pickRotatingItems(SDR_PRACTICE_QUERIES, cityCount);
  const existingProspects = await getProspects();
  const seen = new Set(existingProspects.map(prospectKey));

  let found = 0;
  let added = 0;
  let enriched = 0;
  const cityResults = [];

  for (let i = 0; i < cities.length; i += 1) {
    const city = cities[i];
    const practiceQuery = practiceQueries[i % practiceQueries.length];
    const firms = await searchLawFirms(city, practiceQuery);
    found += firms.length;

    let cityAdded = 0;
    let cityEnriched = 0;

    for (const firm of firms.slice(0, 5)) {
      const key = prospectKey(firm);
      if (seen.has(key)) continue;
      seen.add(key);

      let enrichment = null;
      if (firm.website) {
        try {
          enrichment = await enrichProspect({
            ...firm,
            firmName: firm.name,
            website: firm.website,
          });
        } catch (err) {
          console.warn(`Prospect enrichment failed for ${firm.name}:`, err.message);
        }
      }

      const email = enrichment?.email || '';
      const prospectPayload = {
        ...firm,
        firmName: firm.name,
        city,
        practiceArea: practiceQuery,
        email,
        email_verified: Boolean(email && enrichment?.emailSource !== 'generic_pattern'),
        enrichmentSource: enrichment?.emailSource || null,
        confidence: enrichment?.confidence || null,
        status: email ? 'enriched' : 'researched',
        source: 'admin_sdr_blitz',
        discoveredAt: new Date().toISOString(),
      };

      await addProspect(prospectPayload);
      added += 1;
      cityAdded += 1;

      if (email) {
        enriched += 1;
        cityEnriched += 1;
      }
    }

    const cityResult = {
      city,
      practiceArea: practiceQuery,
      found: firms.length,
      added: cityAdded,
      enriched: cityEnriched,
    };
    cityResults.push(cityResult);
    onProgress?.(i + 1, cities.length, cityResult);
  }

  return {
    city: cities[0] || 'none',
    source: 'admin_sdr_blitz',
    found,
    added,
    enriched,
    cities: cityResults,
  };
}

export async function triggerAutonomousSDR() {
  return runSDRBlitz(1);
}
