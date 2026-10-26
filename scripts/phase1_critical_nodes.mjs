const N8N_API_BASE = 'https://n8n.thebusinesswork.com';
const N8N_API_KEY = process.env.N8N_API_KEY || '';

async function run() {
  const res = await fetch(`${N8N_API_BASE}/api/v1/workflows/VBrjbhPeDypXt12q`, {
    headers: { 'X-N8N-API-KEY': N8N_API_KEY }
  });
  const data = await res.json();
  
  // Only the 3 critical nodes for private reply + public reply
  const targets = ['IG - Prepare Private Reply', 'IG - Build Graph Send Payload', 'IG - Post-Send Event & Public Reply'];
  
  for (const name of targets) {
    const node = data.nodes.find(n => n.name === name);
    if (!node) { console.log(`\n--- ${name}: NOT FOUND ---`); continue; }
    console.log(`\n${'='.repeat(60)}`);
    console.log(`NODE: ${name} (type: ${node.type})`);
    if (node.parameters?.jsCode) {
      console.log(node.parameters.jsCode);
    } else {
      console.log(JSON.stringify(node.parameters, null, 2));
    }
  }
}

run().catch(console.error);
