import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getFirm, getAgentConfig, getSecurityConfig, getKnowledgeBase } from '../lib/firestore';
import { getEmployees, getAgents, getSuperAgent, addEmployee, updateEmployee } from '../lib/agentHierarchy';

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

  useEffect(() => {
    if (!user?.firmId) {
      setLoading(false);
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
    if (!user?.firmId) return;
    await addEmployee(user.firmId, employeeData);
    await refreshFirm();
  };

  const updateTeamMember = async (employeeId, employeeData) => {
    if (!user?.firmId) return;
    await updateEmployee(user.firmId, employeeId, employeeData);
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
