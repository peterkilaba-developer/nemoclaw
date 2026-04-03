import {
  doc, setDoc, getDoc, updateDoc, collection, query, where,
  getDocs, serverTimestamp, arrayUnion
} from 'firebase/firestore';
import { db } from './firebase';
import { saveRosterAndCreateAgents, getOwnerRole, AGENT_SUB_AGENTS } from './agentHierarchy';

// ═══════════════════════════════════════════════
//  FIRM OPERATIONS
// ═══════════════════════════════════════════════

/**
 * Create a new firm document after onboarding.
 */
export async function createFirm(userId, firmData) {
  const firmRef = doc(collection(db, 'firms'));
  const firm = {
    ownerId: userId,
    members: [userId],
    firmName: firmData.firmName || '',
    stateBar: firmData.stateBar || '',
    practiceAreas: firmData.practiceAreas || [],
    firmSize: firmData.firmSize || 'solo',
    contactName: firmData.contactName || '',
    email: firmData.email || '',
    status: 'trial',
    plan: 'trial',
    planPrice: 0,
    trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7-day founder pricing window
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(firmRef, firm);

  // Link user to firm
  await setDoc(doc(db, 'users', userId), {
    firmId: firmRef.id,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  return firmRef.id;
}

/**
 * Get a firm by ID.
 */
export async function getFirm(firmId) {
  const snap = await getDoc(doc(db, 'firms', firmId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Update firm profile fields.
 */
export async function updateFirm(firmId, updates) {
  await updateDoc(doc(db, 'firms', firmId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

// ═══════════════════════════════════════════════
//  AGENT CONFIGURATION
// ═══════════════════════════════════════════════

/**
 * Save the firm's agent configuration.
 */
export async function saveAgentConfig(firmId, selectedAgents) {
  const ref = doc(db, 'firms', firmId, 'config', 'agents');
  await setDoc(ref, {
    activeAgents: selectedAgents,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

/**
 * Get the firm's agent configuration.
 */
export async function getAgentConfig(firmId) {
  const snap = await getDoc(doc(db, 'firms', firmId, 'config', 'agents'));
  return snap.exists() ? snap.data() : { activeAgents: [] };
}

// ═══════════════════════════════════════════════
//  SECURITY CONFIGURATION
// ═══════════════════════════════════════════════

/**
 * Save the firm's security policy.
 */
export async function saveSecurityConfig(firmId, securityData) {
  const ref = doc(db, 'firms', firmId, 'config', 'security');
  await setDoc(ref, {
    policies: securityData.security || {},
    approvedServices: securityData.services || {},
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

/**
 * Get the firm's security configuration.
 */
export async function getSecurityConfig(firmId) {
  const snap = await getDoc(doc(db, 'firms', firmId, 'config', 'security'));
  return snap.exists() ? snap.data() : { policies: {}, approvedServices: {} };
}

// ═══════════════════════════════════════════════
//  KNOWLEDGE BASE
// ═══════════════════════════════════════════════

/**
 * Add a file reference to the firm's knowledge base.
 */
export async function addKnowledgeFile(firmId, fileData) {
  const ref = doc(db, 'firms', firmId, 'config', 'knowledgeBase');
  await setDoc(ref, {
    files: arrayUnion({
      name: fileData.name,
      size: fileData.size,
      type: fileData.type || 'document',
      status: 'indexed',
      uploadedAt: new Date().toISOString(),
    }),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

/**
 * Get the firm's knowledge base files.
 */
export async function getKnowledgeBase(firmId) {
  const snap = await getDoc(doc(db, 'firms', firmId, 'config', 'knowledgeBase'));
  return snap.exists() ? snap.data() : { files: [] };
}

// ═══════════════════════════════════════════════
//  USER PROFILE
// ═══════════════════════════════════════════════

/**
 * Get user profile from Firestore.
 */
export async function getUserProfile(userId) {
  const snap = await getDoc(doc(db, 'users', userId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Update user profile.
 */
export async function updateUserProfile(userId, updates) {
  await updateDoc(doc(db, 'users', userId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

// ═══════════════════════════════════════════════
//  COMPLETE ONBOARDING — Atomic Save
// ═══════════════════════════════════════════════

/**
 * Save all onboarding data in one go.
 * Called when user clicks "Launch My Workspace".
 */
export async function completeOnboarding(userId, onboardingData) {
  // 1. Create the firm
  const firmId = await createFirm(userId, onboardingData);

  // 2. Save agent config (legacy — flat list of active sub-agent IDs)
  await saveAgentConfig(firmId, onboardingData.selectedAgents);

  // 3. Save security config
  await saveSecurityConfig(firmId, {
    security: onboardingData.security,
    services: onboardingData.services,
  });

  // 4. Save knowledge base file references
  if (onboardingData.files && onboardingData.files.length > 0) {
    const ref = doc(db, 'firms', firmId, 'config', 'knowledgeBase');
    await setDoc(ref, {
      files: onboardingData.files.map(f => ({
        name: f.name,
        size: f.size,
        status: f.status || 'indexed',
        uploadedAt: new Date().toISOString(),
      })),
      updatedAt: serverTimestamp(),
    });
  }

  // 5. Save employee roster & create agent hierarchy for staff
  if (onboardingData.employees && onboardingData.employees.length > 0) {
    await saveRosterAndCreateAgents(firmId, onboardingData.employees);
  }

  // 6. Provision the OWNER with their proper legal role + personal agent
  try {
    // Read user profile for name/email
    const userSnap = await getDoc(doc(db, 'users', userId));
    const userData = userSnap.exists() ? userSnap.data() : {};
    const ownerName = userData.displayName || onboardingData.contactName || 'Firm Owner';
    const ownerEmail = userData.email || onboardingData.email || '';
    // Derive role from firm context: solo firm → solo-partner, otherwise → managing-partner
    const ownerRole = getOwnerRole(onboardingData.firmSize);

    // Create owner employee record with their actual legal role
    const ownerEmpRef = doc(db, 'firms', firmId, 'employees', userId);
    await setDoc(ownerEmpRef, {
      name: ownerName,
      email: ownerEmail,
      role: ownerRole,
      photoURL: userData.photoURL || null,
      practiceAreas: onboardingData.practiceAreas || [],
      supervisingPartnerId: null,
      isOwner: true,
      createdAt: serverTimestamp(),
    }, { merge: true });

    // Create owner's personal agent
    const ownerAgentRef = doc(db, 'firms', firmId, 'agents', userId);
    await setDoc(ownerAgentRef, {
      employeeId: userId,
      employeeName: ownerName,
      employeeEmail: ownerEmail,
      employeePhotoURL: userData.photoURL || null,
      agentType: 'partner',
      agentName: 'AI Chief of Staff',
      firmId,
      permissions: {},
      availableSubAgents: [
        'legal-research', 'contract-review', 'drafting', 'case-analytics',
        'business-intelligence', 'knowledge-search', 'communication-drafter',
      ],
      context: { preferences: {}, writingStyle: null, caseload: [] },
      settings: { showSubAgentVisibility: false },
      superAgentAccess: true,
      canEditFirmPolicies: true,
      isOwner: true,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.error('Owner agent provisioning error:', err);
  }

  // 7. Provision the SUPER AGENT (firm-wide intelligence layer)
  try {
    const superAgentRef = doc(db, 'firms', firmId, 'superAgent', 'config');
    await setDoc(superAgentRef, {
      agentName: 'NemoClaw Super Agent',
      firmId,
      status: 'active',
      capabilities: [
        'firm-wide-analytics', 'cross-matter-search', 'compliance-monitoring',
        'resource-allocation', 'risk-assessment', 'performance-metrics',
      ],
      accessControl: {
        allowedRoles: ['managing-partner', 'partner', 'solo-partner'],
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.error('Super agent provisioning error:', err);
  }

  return firmId;
}

