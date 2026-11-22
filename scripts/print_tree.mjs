import fs from 'fs';

const wf = JSON.parse(fs.readFileSync('backups/backup_VBrjbhPeDypXt12q_pre_deploy_1793014367535.json', 'utf8'));

function printTree(nodeName, indent = '', visited = new Set()) {
  if (visited.has(nodeName)) {
    console.log(`${indent}-> [${nodeName}] (already visited / loop)`);
    return;
  }
  visited.add(nodeName);
  const node = wf.nodes.find(n => n.name === nodeName);
  console.log(`${indent}* [${nodeName}] (${node?.type || 'unknown'})`);
  const conns = wf.connections[nodeName]?.main || [];
  for (let i = 0; i < conns.length; i++) {
    const outputs = conns[i] || [];
    if (outputs.length > 0) {
      console.log(`${indent}  Output ${i}:`);
      for (const target of outputs) {
        printTree(target.node, indent + '    ', new Set(visited));
      }
    }
  }
}

console.log('--- CONNECTION TREE FROM Incoming WhatsApp Message ---');
printTree('Incoming WhatsApp Message');
