import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getFirm, getAgentConfig, getSecurityConfig, getKnowledgeBase, getWebsiteRedesignConfig } from '../lib/firestore';
import { getEmployees, getAgents, getSuperAgent, addEmployee, updateEmployee } from '../lib/agentHierarchy';
import { collection, query, where, limit, getDocs, doc, setDoc } from 'firebase/firestore';
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
  const [websiteRedesign, setWebsiteRedesign] = useState(null);
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
            await setDoc(doc(db, 'users', user.uid), { firmId: foundFirmId }, { merge: true });
            setFirm({ id: foundFirmId, ...firmData });
            setLoading(false);
          } else {
            console.warn('Firm healing: no verified firm membership found for current user.');
            setFirm(null);
            setLoading(false);
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
        const [firmData, agentData, secData, kbData, webData, empData, agData, saData] = await Promise.all([
          getFirm(user.firmId),
          getAgentConfig(user.firmId),
          getSecurityConfig(user.firmId),
          getKnowledgeBase(user.firmId),
          getWebsiteRedesignConfig(user.firmId).catch(() => null),
          getEmployees(user.firmId).catch(() => []),
          getAgents(user.firmId).catch(() => []),
          getSuperAgent(user.firmId).catch(() => null),
        ]);

        if (!cancelled) {
          setFirm(firmData);
          setAgents(agentData);
          setSecurity(secData);
          setKnowledgeBase(kbData);
          setWebsiteRedesign(webData);
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
  }, [user?.firmId, user?.uid, user?.displayName]);

  const refreshFirm = useCallback(async () => {
    if (!user?.firmId) return;
    setLoading(true);
    const [firmData, agentData, secData, kbData, webData, empData, agData, saData] = await Promise.all([
      getFirm(user.firmId),
      getAgentConfig(user.firmId),
      getSecurityConfig(user.firmId),
      getKnowledgeBase(user.firmId),
      getWebsiteRedesignConfig(user.firmId).catch(() => null),
      getEmployees(user.firmId).catch(() => []),
      getAgents(user.firmId).catch(() => []),
      getSuperAgent(user.firmId).catch(() => null),
    ]);
    setFirm(firmData);
    setAgents(agentData);
    setSecurity(secData);
    setKnowledgeBase(kbData);
    setWebsiteRedesign(webData);
    setEmployees(empData);
    setPersonalAgents(agData);
    setSuperAgent(saData);
    setLoading(false);
  }, [user?.firmId]);

  const addTeamMember = useCallback(async (employeeData) => {
    const targetFirmId = user?.firmId || firm?.id;
    if (!targetFirmId) {
      console.warn('Cannot add team member: no firmId available');
      return;
    }
    await addEmployee(targetFirmId, employeeData);
    await refreshFirm();
  }, [firm?.id, refreshFirm, user?.firmId]);

  const updateTeamMember = useCallback(async (employeeId, employeeData) => {
    const targetFirmId = user?.firmId || firm?.id;
    if (!targetFirmId) return;
    await updateEmployee(targetFirmId, employeeId, employeeData);
    await refreshFirm();
  }, [firm?.id, refreshFirm, user?.firmId]);

  return (
    <FirmContext.Provider value={{
      firm, agents, security, knowledgeBase, websiteRedesign,
      employees, personalAgents, superAgent,
      firmId: user?.firmId || firm?.id || null,
      loading, refreshFirm, addTeamMember, updateTeamMember,
    }}>
      {children}
    </FirmContext.Provider>
  );
}
