/**
 * Observability Engine (Telemetry & Logging)
 *
 * Provides a centralized logging service to monitor the health of the
 * NVIDIA NemoClaw connection and PII redaction pipelines.
 */

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

const IS_DEV = import.meta.env.DEV;

export const TELEMETRY_LEVELS = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL',
};

/**
 * Log a telemetry event.
 * @param {string} eventName - E.g., 'inference_latency', 'pii_redacted'
 * @param {object} payload - Key/value pairs of metric data
 * @param {string} level - Log level
 */
export async function logTelemetry(eventName, payload = {}, level = TELEMETRY_LEVELS.INFO) {
  const telemetryData = {
    event: eventName,
    ...payload,
    level,
    timestamp: serverTimestamp(),
    environment: IS_DEV ? 'development' : 'production'
  };

  try {
    // In dev mode, log to console for visibility
    if (IS_DEV) {
      console.log(`[TELEMETRY] ${level} - ${eventName}:`, payload);
    }
    
    // Always persist to a dedicated telemetry collection in Firebase
    await addDoc(collection(db, '_telemetryLogs'), telemetryData);
  } catch (error) {
    console.error('Failed to write telemetry data:', error);
  }
}

/**
 * Convenience method for latency tracking
 */
export async function trackInferenceLatency(modelId, latencyMs, status = 'success', errorDetails = null) {
  const level = status === 'error' ? TELEMETRY_LEVELS.ERROR : (latencyMs > 5000 ? TELEMETRY_LEVELS.WARNING : TELEMETRY_LEVELS.INFO);
  
  await logTelemetry('inference_call', {
    model: modelId,
    durationMs: latencyMs,
    status,
    errorDetails
  }, level);
}

/**
 * Convenience method for PII tracking
 */
export async function trackPIIRedaction(redactionCount) {
  if (redactionCount === 0) return; // Only log when PII is actually intercepted
  
  await logTelemetry('pii_redaction', {
    itemsRedacted: redactionCount,
  }, TELEMETRY_LEVELS.INFO);
}
