import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getFirm, getAgentConfig, getSecurityConfig, getKnowledgeBase, getWebsiteRedesignConfig } from '../lib/firestore';
import { addEmployee, getAgents, getEmployees, getSuperAgent, removeEmployee, updateEmployee } from '../lib/agentHierarchy';
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
  const [personalAgents, setPersonalAgents] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [superAgent, setSuperAgent] = useState(null);
  const [loading, setLoading] = useState(true);

  const healingRef = useRef(false);

  useEffect(() => {
    if (user?.isPartial) return;

    if (!user?.firmId) {
      if (healingRef.current) return;
      const findMyFirm = async () => {
        try {
          healingRef.current = true;
          const firmsRef = collection(db, 'firms');
          const ownerQ = query(firmsRef, where('ownerId', '==', user.uid), limit(1));
          const snap = await getDocs(ownerQ);
          
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
        const [firmData, agentData, secData, kbData, webData, agData, empData, saData] = await Promise.all([
          getFirm(user.firmId),
          getAgentConfig(user.firmId),
          getSecurityConfig(user.firmId),
          getKnowledgeBase(user.firmId),
          getWebsiteRedesignConfig(user.firmId).catch(() => null),
          getAgents(user.firmId).catch(() => []),
          getEmployees(user.firmId).catch(() => []),
          getSuperAgent(user.firmId).catch(() => null),
        ]);

        if (!cancelled) {
          setFirm(firmData);
          setAgents(agentData);
          setSecurity(secData);
          setKnowledgeBase(kbData);
          setWebsiteRedesign(webData);
          setPersonalAgents(agData);
          setEmployees(empData);
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
  }, [user?.firmId, user?.uid, user?.displayName, user?.isPartial]);

  const refreshFirm = useCallback(async () => {
    if (!user?.firmId) return;
    setLoading(true);
    const [firmData, agentData, secData, kbData, webData, agData, empData, saData] = await Promise.all([
      getFirm(user.firmId),
      getAgentConfig(user.firmId),
      getSecurityConfig(user.firmId),
      getKnowledgeBase(user.firmId),
      getWebsiteRedesignConfig(user.firmId).catch(() => null),
      getAgents(user.firmId).catch(() => []),
      getEmployees(user.firmId).catch(() => []),
      getSuperAgent(user.firmId).catch(() => null),
    ]);
    setFirm(firmData);
    setAgents(agentData);
    setSecurity(secData);
    setKnowledgeBase(kbData);
    setWebsiteRedesign(webData);
    setPersonalAgents(agData);
    setEmployees(empData);
    setSuperAgent(saData);
    setLoading(false);
  }, [user?.firmId]);

  const targetFirmId = user?.firmId || firm?.id;
  const addTeamMember = async data => {
    if (!targetFirmId) throw new Error('No firm is available.');
    await addEmployee(targetFirmId, data);
    await refreshFirm();
  };
  const updateTeamMember = async (employeeId, data) => {
    if (!targetFirmId) throw new Error('No firm is available.');
    await updateEmployee(targetFirmId, employeeId, data);
    await refreshFirm();
  };
  const removeTeamMember = async employeeId => {
    if (!targetFirmId) throw new Error('No firm is available.');
    await removeEmployee(targetFirmId, employeeId);
    await refreshFirm();
  };

  return (
    <FirmContext.Provider value={{
      firm, agents, security, knowledgeBase, websiteRedesign,
      personalAgents, employees, superAgent,
      firmId: user?.firmId || firm?.id || null,
      loading, refreshFirm, addTeamMember, updateTeamMember, removeTeamMember,
    }}>
      {children}
    </FirmContext.Provider>
  );
}
