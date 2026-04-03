import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { getFirm, getAgentConfig, getSecurityConfig, getKnowledgeBase } from '../lib/firestore';
import { getEmployees, getAgents, getSuperAgent, addEmployee, updateEmployee } from '../lib/agentHierarchy';
import { collection, query, where, limit, getDocs, doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const FirmContext = createContext(null);

export function useFirm() {
  const ctx = useContext(FirmContext);
  if (!ctx) throw new Error('useFirm must be used within FirmProvider');
  return ctx;
}

export function FirmProvider({ children }) {
  const { user } = useAuth();
  const [firm, setFirm] = useState(null);
  const [agents, setAgents] = useState({ activeAgents: [] });
  const [security, setSecurity] = useState({ policies: {}, approvedServices: {} });
  const [knowledgeBase, setKnowledgeBase] = useState({ files: [] });
  // NEW — Agent hierarchy state
  const [employees, setEmployees] = useState([]);
  const [personalAgents, setPersonalAgents] = useState([]);
  const [superAgent, setSuperAgent] = useState(null);
  const [loading, setLoading] = useState(true);

  const healingRef = useRef(false);

  useEffect(() => {
    if (!user?.firmId) {
      if (healingRef.current) return;
      // 2a. Self-healing: Look for a firm where user is the owner if link is missing
      const findMyFirm = async () => {
        try {
          healingRef.current = true;
          const firmsRef = collection(db, 'firms');
          const ownerQ = query(firmsRef, where('ownerId', '==', user.uid), limit(1));
          const memberQ = query(firmsRef, where('members', 'array-contains', user.uid), limit(1));
          const [ownerSnap, memberSnap] = await Promise.all([getDocs(ownerQ), getDocs(memberQ)]);
          const snap = !ownerSnap.empty ? ownerSnap : memberSnap;
          
          if (!snap.empty) {
            const foundFirmId = snap.docs[0].id;
            const firmData = snap.docs[0].data();
            console.log('Self-healing: Recovered existing firm link:', foundFirmId);
            await updateDoc(doc(db, 'users', user.uid), { firmId: foundFirmId });
            setFirm({ id: foundFirmId, ...firmData });
            setLoading(false);
          } else {
            // 2b. Final Fallback: ONLY auto-provision if onboarding was supposed to be complete
            // This prevents duplicating firms while a new user is still in the Onboarding Wizard.
            if (user.onboardingComplete) {
              console.log('Self-healing: Auto-provisioning firm for established user:', user.uid);
              const firmRef = doc(collection(db, 'firms'));
              const newFirmId = firmRef.id;
              const newFirmData = {
                ownerId: user.uid,
                members: [user.uid],
                name: `${user.displayName || 'My'} Law Firm`,
                status: 'trial',
                plan: 'trial',
                trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                isConfigured: false,
                createdAt: serverTimestamp(),
              };
              await setDoc(firmRef, newFirmData);
              await updateDoc(doc(db, 'users', user.uid), { firmId: newFirmId });
              setFirm({ id: newFirmId, ...newFirmData });
              setLoading(false);
            } else {
              console.log('Self-healing: Waiting for onboarding setup...');
              setLoading(false);
            }
          }
        } catch (err) {
          console.warn('Firm healing error:', err);
          setLoading(false);
        } finally {
          healingRef.current = false;
        }
      };
      if (user?.uid) findMyFirm();
      else setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadFirmData() {
      try {
        const [firmData, agentData, secData, kbData, empData, agData, saData] = await Promise.all([
          getFirm(user.firmId),
          getAgentConfig(user.firmId),
          getSecurityConfig(user.firmId),
          getKnowledgeBase(user.firmId),
          getEmployees(user.firmId).catch(() => []),
          getAgents(user.firmId).catch(() => []),
          getSuperAgent(user.firmId).catch(() => null),
        ]);

        if (!cancelled) {
          setFirm(firmData);
          setAgents(agentData);
          setSecurity(secData);
          setKnowledgeBase(kbData);
          setEmployees(empData);
          setPersonalAgents(agData);
          setSuperAgent(saData);
        }
      } catch (err) {
        console.error('Error loading firm data:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadFirmData();
    return () => { cancelled = true; };
  }, [user?.firmId]);

  const refreshFirm = async () => {
    if (!user?.firmId) return;
    setLoading(true);
    const [firmData, agentData, secData, kbData, empData, agData, saData] = await Promise.all([
      getFirm(user.firmId),
      getAgentConfig(user.firmId),
      getSecurityConfig(user.firmId),
      getKnowledgeBase(user.firmId),
      getEmployees(user.firmId).catch(() => []),
      getAgents(user.firmId).catch(() => []),
      getSuperAgent(user.firmId).catch(() => null),
    ]);
    setFirm(firmData);
    setAgents(agentData);
    setSecurity(secData);
    setKnowledgeBase(kbData);
    setEmployees(empData);
    setPersonalAgents(agData);
    setSuperAgent(saData);
    setLoading(false);
  };

  const addTeamMember = async (employeeData) => {
    const targetFirmId = user?.firmId || firm?.id;
    if (!targetFirmId) {
      console.warn('Cannot add team member: no firmId available');
      return;
    }
    await addEmployee(targetFirmId, employeeData);
    await refreshFirm();
  };

  const updateTeamMember = async (employeeId, employeeData) => {
    const targetFirmId = user?.firmId || firm?.id;
    if (!targetFirmId) return;
    await updateEmployee(targetFirmId, employeeId, employeeData);
    await refreshFirm();
  };

  return (
    <FirmContext.Provider value={{
      firm, agents, security, knowledgeBase,
      employees, personalAgents, superAgent,
      firmId: user?.firmId || null,
      loading, refreshFirm, addTeamMember, updateTeamMember,
    }}>
      {children}
    </FirmContext.Provider>
  );
}
