/**
 * Inspect n8n workflow nodes related to private reply, public reply, and DM
 */
const N8N_API_BASE = 'https://n8n.thebusinesswork.com';
const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjYTU2YzhhMy04ODQ4LTRmMDQtYjUxZC1lYjBmMGYzNGE1ZjkiLCJpc3MiOiJuOG4iLCJqdGkiOiI5NDc5YzNlMC0wMDcwLTQ1YmItOTVkNC0zNjRiYTY0YmIxYjIiLCJpYXQiOjE3OTI3NjkwMTgsImF1ZCI6InB1YmxpYy1hcGkifQ.mRpbUE_EyBBDcJf7EP-5e4J1usyCXxE5xapr9D6To3U';

async function run() {
  const res = await fetch(`${N8N_API_BASE}/api/v1/workflows/VBrjbhPeDypXt12q`, {
    headers: { 'X-N8N-API-KEY': N8N_API_KEY }
  });
  const data = await res.json();
  
  // Find key Instagram nodes
  const keyNodes = [
    'IG - Prepare Private Reply',
    'IG - Build Graph Send Payload', 
    'IG - Send via Meta Instagram API',
    'IG - Post-Send Event & Public Reply',
    'IG - Check Reel Comment Rule',
    'IG - Comment DM Approved?',
    'IG - Build Verified Follow Reply',
    'IG - Follow Verification Required?',
    'IG - Meta Check Follows Business',
    'IG - Resolve Dashboard DM Context',
  ];
  
  for (const nodeName of keyNodes) {
    const node = data.nodes.find(n => n.name === nodeName);
    if (node) {
      console.log(`\n=== ${nodeName} ===`);
      console.log(`Type: ${node.type}`);
      console.log(`Parameters: ${JSON.stringify(node.parameters, null, 2).slice(0, 3000)}`);
    } else {
      console.log(`\n=== ${nodeName} === NOT FOUND`);
    }
  }

  // Also check connections to understand flow
  console.log('\n\n=== KEY CONNECTIONS ===');
  const igConnections = {};
  for (const [fromNode, conns] of Object.entries(data.connections || {})) {
    if (fromNode.startsWith('IG -')) {
      igConnections[fromNode] = conns;
    }
  }
  
  // Print IG flow
  for (const [from, conn] of Object.entries(igConnections)) {
    if (conn.main) {
      for (let i = 0; i < conn.main.length; i++) {
        const targets = conn.main[i];
        if (targets?.length > 0) {
          const targetNames = targets.map(t => t.node).join(', ');
          console.log(`  ${from} --[output ${i}]--> ${targetNames}`);
        }
      }
    }
  }
}

run().catch(console.error);
