import { useState, useCallback } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

/**
 * A central custom hook to manage all Firebase operations for the Role-Specific
 * Agentic Workspaces (Canvases). Keeping this distinct from the FirmContext
 * ensures high performance isolation.
 */
export default function useWorkspace(firmId) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Universal fetcher with error handling
   */
  const genericFetch = useCallback(async (collectionName, customQuery = null) => {
    if (!firmId) return [];
    setLoading(true);
    setError(null);
    try {
      const ref = collection(db, 'firms', firmId, collectionName);
      const q = customQuery ? customQuery(ref) : query(ref, orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      console.error(`Error fetching ${collectionName}:`, err);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [firmId]);

  /**
   * Universal adder
   */
  const genericAdd = useCallback(async (collectionName, payload) => {
    if (!firmId) throw new Error("No firm ID");
    setLoading(true);
    try {
      const ref = collection(db, 'firms', firmId, collectionName);
      const docRef = await addDoc(ref, {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [firmId]);

  /**
   * Universal updater
   */
  const genericUpdate = useCallback(async (collectionName, docId, payload) => {
    if (!firmId || !docId) throw new Error("Missing ID");
    setLoading(true);
    try {
      const ref = doc(db, 'firms', firmId, collectionName, docId);
      await updateDoc(ref, {
        ...payload,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [firmId]);

  /**
   * Universal deleter
   */
  const genericDelete = useCallback(async (collectionName, docId) => {
    if (!firmId || !docId) throw new Error("Missing ID");
    setLoading(true);
    try {
      const ref = doc(db, 'firms', firmId, collectionName, docId);
      await deleteDoc(ref);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [firmId]);

  // Specific Workspace Bindings
  const fetchDocumentBundles = useCallback(() => genericFetch('documentBundles'), [genericFetch]);
  const addDocumentBundle = useCallback((data) => genericAdd('documentBundles', data), [genericAdd]);
  const updateDocumentBundle = useCallback((id, data) => genericUpdate('documentBundles', id, data), [genericUpdate]);

  const fetchDrafts = useCallback(() => genericFetch('drafts'), [genericFetch]);
  const addDraft = useCallback((data) => genericAdd('drafts', data), [genericAdd]);
  const updateDraft = useCallback((id, data) => genericUpdate('drafts', id, data), [genericUpdate]);

  const fetchTrustLedgers = useCallback(() => genericFetch('trustLedgers'), [genericFetch]);
  const addTrustLedgerEntry = useCallback((data) => genericAdd('trustLedgers', data), [genericAdd]);
  
  const fetchConflictChecks = useCallback(() => genericFetch('conflictChecks'), [genericFetch]);
  const addConflictCheck = useCallback((data) => genericAdd('conflictChecks', data), [genericAdd]);

  const fetchCourtForms = useCallback(() => genericFetch('courtForms'), [genericFetch]);
  const addCourtForm = useCallback((data) => genericAdd('courtForms', data), [genericAdd]);

  return {
    loading,
    error,
    fetchDocumentBundles, addDocumentBundle, updateDocumentBundle,
    fetchDrafts, addDraft, updateDraft,
    fetchTrustLedgers, addTrustLedgerEntry,
    fetchConflictChecks, addConflictCheck,
    fetchCourtForms, addCourtForm,
    genericUpdate, genericDelete
  };
}
