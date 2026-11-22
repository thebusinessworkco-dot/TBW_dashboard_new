import fs from 'fs';
import { deleteContactSafely } from '../src/lib/whatsapp/session-manager.js';

if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  for (const line of envContent.split('\n')) {
    const idx = line.indexOf('=');
    if (idx > 0 && !line.startsWith('#')) {
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

async function testDelete() {
  console.log('Testing deleteContactSafely for 918830387174...');
  const res = await deleteContactSafely('918830387174', 'thebusinesswork.co@gmail.com');
  console.log('Result:', JSON.stringify(res, null, 2));
}

testDelete().catch(console.error);
