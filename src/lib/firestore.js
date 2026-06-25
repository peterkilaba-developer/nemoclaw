import {
  doc, setDoc, getDoc, updateDoc, collection,
  getDocs, serverTimestamp, arrayUnion
} from 'firebase/firestore';
import { db } from './firebase';
import { ACCESS_MATRIX, AGENT_SUB_AGENTS, saveRosterAndCreateAgents } from './agentHierarchy';

// ═══════════════════════════════════════════════
//  FIRM OPERATIONS
// ═══════════════════════════════════════════════

/**
 * Create a new firm document after onboarding.
 */
export async function createFirm(userId, firmData, existingFirmId = null) {
  const firmRef = existingFirmId ? doc(db, 'firms', existingFirmId) : doc(collection(db, 'firms'));
  const firm = {
    ownerId: userId,
    members: [userId],
    firmName: firmData.firmName || '',
    firmAddress: firmData.firmAddress || '',
    firmPhone: firmData.firmPhone || '',
    firmWebsite: firmData.firmWebsite || '',
    placeId: firmData.placeId || '',
    stateBar: firmData.stateBar || '',
    federalCircuits: firmData.federalCircuits || [],
    practiceAreas: firmData.practiceAreas || [],
    firmSize: firmData.firmSize || 'solo',
    contactName: firmData.contactName || '',
    email: firmData.email || '',
    status: 'trial',
    plan: 'trial',
    planPrice: 0,
    isConfigured: true,
    trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30-day free trial
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(firmRef, firm, { merge: true });

  // Link user to firm and mark onboarding as complete
  await setDoc(doc(db, 'users', userId), {
    firmId: firmRef.id,
    role: firmData.firmSize === 'solo' ? 'solo-partner' : 'managing-partner',
    agentType: firmData.firmSize === 'solo' ? 'solo-partner' : 'managing-partner',
    onboardingComplete: true,
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
  const snap = await getDocs(collection(db, 'firms', firmId, 'knowledgeBase'));
  return { files: snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) };
}

export async function saveWebsiteRedesignConfig(firmId, websiteRedesign = {}) {
  if (!websiteRedesign?.sourceUrl && !websiteRedesign?.seed?.website) return;

  const ref = doc(db, 'firms', firmId, 'config', 'websiteRedesign');
  await setDoc(ref, {
    status: websiteRedesign.status || 'ready_to_build',
    source: websiteRedesign.source || 'onboarding',
    sourceUrl: websiteRedesign.sourceUrl || websiteRedesign.seed?.website || '',
    domain: websiteRedesign.domain || '',
    seed: websiteRedesign.seed || {},
    chatReceptionist: websiteRedesign.chatReceptionist || websiteRedesign.seed?.chatAgent || {
      enabled: true,
      capabilities: ['text', 'voice', 'scheduling', 'documents'],
    },
    voiceReceptionist: websiteRedesign.voiceReceptionist || {
      enabled: true,
      provider: 'browser-speech-recognition',
    },
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function getWebsiteRedesignConfig(firmId) {
  const snap = await getDoc(doc(db, 'firms', firmId, 'config', 'websiteRedesign'));
  return snap.exists() ? snap.data() : null;
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
export async function completeOnboarding(userId, onboardingData, existingFirmId = null) {
  // 1. Create or update the firm
  const firmId = await createFirm(userId, onboardingData, existingFirmId);

  // 2. Save agent config (legacy — flat list of active sub-agent IDs)
  await saveAgentConfig(firmId, onboardingData.selectedAgents || []);

  // 3. Save security config
  await saveSecurityConfig(firmId, {
    security: onboardingData.security,
    services: onboardingData.services,
  });

  // 4. Save knowledge base file references
  if (onboardingData.files && onboardingData.files.length > 0) {
    const kbRef = collection(db, 'firms', firmId, 'knowledgeBase');
    for (const f of onboardingData.files) {
      const fileName = f.name || 'website_crawl';
      const docId = fileName.replace(/[^a-zA-Z0-9_-]/g, '_') || 'default_kb';
      await setDoc(doc(kbRef, docId), {
        fileName: fileName,
        fileSize: f.size || '0 KB',
        fileType: 'text/plain',
        content: f.content || null,
        source: f.source || 'manual_upload',
        category: f.category || '',
        role: f.role || '',
        websiteUrl: f.websiteUrl || '',
        practiceAreas: f.practiceAreas || [],
        uploadedBy: 'NemoClaw Auto-Scraper',
        uploadedAt: serverTimestamp(),
      }, { merge: true });
    }
  }

  // 5. Save website redesign and receptionist seed for the Website Builder agent
  if (onboardingData.websiteRedesign) {
    await saveWebsiteRedesignConfig(firmId, onboardingData.websiteRedesign);
  }

  // 6. Save employee roster & create agent hierarchy for staff
  if (onboardingData.employees && onboardingData.employees.length > 0) {
    const ownerRole = onboardingData.firmSize === 'solo' ? 'solo-partner' : 'managing-partner';
    const roster = onboardingData.employees.map((employee, index) => index === 0
      ? { ...employee, id: userId, role: ownerRole }
      : employee);
    await saveRosterAndCreateAgents(firmId, roster);
  }

  // 7. Provision the OWNER with their proper legal role + personal agent
  try {
    // Read user profile for name/email
    const userSnap = await getDoc(doc(db, 'users', userId));
    const userData = userSnap.exists() ? userSnap.data() : {};
    const ownerName = userData.displayName || onboardingData.contactName || 'Firm Owner';
    const ownerEmail = userData.email || onboardingData.email || '';
    // Derive role from firm context: solo firm → solo-partner, otherwise → managing-partner
    const ownerRole = onboardingData.firmSize === 'solo' ? 'solo-partner' : 'managing-partner';

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
      permissions: ACCESS_MATRIX.partner,
      availableSubAgents: AGENT_SUB_AGENTS.partner,
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

  // 8. Provision the SUPER AGENT (firm-wide intelligence layer)
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

