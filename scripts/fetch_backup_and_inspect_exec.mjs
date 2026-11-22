import fs from 'fs';
import path from 'path';

async function main() {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  let apiKey = '';
  for (const line of envContent.split('\n')) {
    const idx = line.indexOf('=');
    if (idx > 0 && !line.startsWith('#')) {
      const k = line.slice(0, idx).trim();
      if (k === 'N8N_API_KEY') {
        apiKey = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
      }
    }
  }

  const headers = { 'X-N8N-API-KEY': apiKey };

  // 1. Fetch workflow
  console.log('Fetching live workflow VBrjbhPeDypXt12q...');
  const wfRes = await fetch('https://n8n.thebusinesswork.com/api/v1/workflows/VBrjbhPeDypXt12q', { headers });
  if (!wfRes.ok) {
    throw new Error(`Failed to fetch workflow: ${wfRes.status} ${await wfRes.text()}`);
  }
  const wfData = await wfRes.json();
  const wf = wfData.data || wfData;

  const backupDir = path.resolve('backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  const timestamp = Date.now();
  const backupFile = path.join(backupDir, `backup_production_VBrjbhPeDypXt12q_live_${timestamp}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(wf, null, 2), 'utf8');
  console.log(`Saved live workflow backup to ${backupFile} (${fs.statSync(backupFile).size} bytes)`);

  // 2. Fetch execution 11795
  console.log('Fetching execution 11795...');
  const execRes = await fetch('https://n8n.thebusinesswork.com/api/v1/executions/11795?includeData=true', { headers });
  if (!execRes.ok) {
    console.warn(`Failed to fetch execution 11795 with includeData: ${execRes.status}. Retrying without includeData...`);
    const execRes2 = await fetch('https://n8n.thebusinesswork.com/api/v1/executions/11795', { headers });
    if (!execRes2.ok) {
      throw new Error(`Failed to fetch execution 11795: ${execRes2.status} ${await execRes2.text()}`);
    }
    const execData2 = await execRes2.json();
    fs.writeFileSync(`backups/exec_11795_${timestamp}.json`, JSON.stringify(execData2, null, 2), 'utf8');
    console.log('Execution 11795 summary saved.');
  } else {
    const execData = await execRes.json();
    const execFile = path.join(backupDir, `exec_11795_${timestamp}.json`);
    fs.writeFileSync(execFile, JSON.stringify(execData, null, 2), 'utf8');
    console.log(`Execution 11795 saved to ${execFile} (${fs.statSync(execFile).size} bytes)`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
