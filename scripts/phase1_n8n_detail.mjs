const N8N_API_BASE = 'https://n8n.thebusinesswork.com';
const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjYTU2YzhhMy04ODQ4LTRmMDQtYjUxZC1lYjBmMGYzNGE1ZjkiLCJpc3MiOiJuOG4iLCJqdGkiOiI5NDc5YzNlMC0wMDcwLTQ1YmItOTVkNC0zNjRiYTY0YmIxYjIiLCJpYXQiOjE3OTI3NjkwMTgsImF1ZCI6InB1YmxpYy1hcGkifQ.mRpbUE_EyBBDcJf7EP-5e4J1usyCXxE5xapr9D6To3U';

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
