import fs from 'fs';
import path from 'path';

const data = JSON.parse(fs.readFileSync(path.resolve('scripts', 'n8n_audit_full_results.json'), 'utf8'));

console.log(`Audited Workflows Total: ${data.length}\n`);

for (let i = 0; i < data.length; i++) {
  const w = data[i];
  console.log(`[${i+1}] ${w.name}`);
  console.log(`    ID: ${w.id} | Active: ${w.active} | Nodes: ${w.nodeCount}`);
  console.log(`    Last Exec: ${w.lastExecution}`);
  console.log(`    Storage: saveSuccess=${w.settings?.saveDataSuccessExecution || 'default'} saveError=${w.settings?.saveDataErrorExecution || 'default'}`);
  console.log(`    Triggers: ${w.triggers.map(t => `${t.name} (${t.type})`).join(', ') || 'None'}`);
  console.log(`    Webhooks: ${w.webhooks.map(wh => `${wh.httpMethod} /webhook/${wh.path}`).join(', ') || 'None'}`);
  console.log(`    External: ${w.externalServices.join(', ') || 'None'}`);
  console.log(`    Called By: ${w.calledBy.map(c => `${c.name} (${c.id})`).join(', ') || 'None'}`);
  console.log(`    Calls Out: ${w.subworkflowCalls.map(c => `${c.workflowName || c.workflowId}`).join(', ') || 'None'}`);
  console.log('');
}
