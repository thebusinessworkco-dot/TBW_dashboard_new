import fs from 'fs';

const wf = JSON.parse(fs.readFileSync('backups/backup_production_VBrjbhPeDypXt12q_live_1793013271826.json', 'utf8'));

console.log('Searching all nodes in workflow for date/time expressions...');

wf.nodes.forEach(n => {
  const code = n.parameters?.jsCode || '';
  if (!code) return;
  const lines = code.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('toISOString') || line.includes('toISO') || line.includes('new Date(')) {
      console.log(`[${n.name}] Line ${idx + 1}: ${line.trim()}`);
    }
  });
});
