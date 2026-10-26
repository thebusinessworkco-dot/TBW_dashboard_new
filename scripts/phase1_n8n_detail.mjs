const N8N_API_BASE = 'https://n8n.thebusinesswork.com';
const N8N_API_KEY = process.env.N8N_API_KEY || '';

async function run() {
  const res = await fetch(`${N8N_API_BASE}/api/v1/workflows/VBrjbhPeDypXt12q`, {
    headers: { 'X-N8N-API-KEY': N8N_API_KEY }
  });
  const data = await res.json();
  
  const nodesOfInterest = [
    'IG - Prepare Private Reply',
    'IG - Build Graph Send Payload',
    'IG - Post-Send Event & Public Reply',
    'IG - Log Outbound / Comment DM',
    'IG - DM State + Booking Input',
  ];
  
  for (const nodeName of nodesOfInterest) {
    const node = data.nodes.find(n => n.name === nodeName);
    if (node) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`NODE: ${nodeName}`);
      console.log(`Type: ${node.type}`);
      // For code nodes print the full code
      if (node.parameters?.jsCode) {
        console.log(`\nCODE:\n${node.parameters.jsCode}`);
      } else {
        console.log(`\nPARAMETERS:\n${JSON.stringify(node.parameters, null, 2)}`);
      }
    }
  }
}

run().catch(console.error);
