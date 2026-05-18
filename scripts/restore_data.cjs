const fs = require('fs');
let c = fs.readFileSync('c:/Projects/NemoC_LAW_AI/src/pages/MyAgent.jsx', 'utf8');

c = c.replace(/const \[matters, setMatters\] = useState\(\[\]\);/, 'const [matters, setMatters] = useState([]);\n  const [leads, setLeads] = useState([]);\n  const [billableActivities, setBillableActivities] = useState([]);');

const additionalFetches = `
  // Load specialized datasets for Canvases
  useEffect(() => {
    if (firmId) {
      // Leads for Intake
      getDocs(query(collection(db, 'firms', firmId, 'leads'), orderBy('createdAt', 'desc')))
        .then(snap => setLeads((snap?.docs || []).map(doc => ({ id: doc.id, ...doc.data() }))))
        .catch(console.error);
        
      // Billables for Finance / Partner
      getDocs(query(collection(db, 'firms', firmId, 'billableActivities'), orderBy('createdAt', 'desc')))
        .then(snap => setBillableActivities((snap?.docs || []).map(doc => ({ id: doc.id, ...doc.data() }))))
        .catch(console.error);
    }
  }, [firmId]);
`;

c = c.replace(/(\/\/ Load matters for context\s*useEffect\(\(\) => {[\s\S]*?}, \[firmId\]\);)/, '$1\n' + additionalFetches);

// Remove hardcoded empty arrays
c = c.replace(/billableActivities={\[\]}/g, 'billableActivities={billableActivities}');
c = c.replace(/leads={\[\]}/g, 'leads={leads}');

fs.writeFileSync('c:/Projects/NemoC_LAW_AI/src/pages/MyAgent.jsx', c);
console.log('Restored live data feeds');
