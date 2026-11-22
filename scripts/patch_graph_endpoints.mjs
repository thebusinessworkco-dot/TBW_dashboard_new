import fs from 'fs';

console.log('Updating reel-sync-service.ts and reel-automation.ts to use graph.facebook.com...');

// 1. Update src/lib/instagram/reel-sync-service.ts
let syncCode = fs.readFileSync('src/lib/instagram/reel-sync-service.ts', 'utf8');

// Replace accountId fallback
syncCode = syncCode.replace(
  "accountId: val.account_id || '29081127174886627',",
  "accountId: val.account_id || '17841434357046300',"
);

// Replace verification endpoint
syncCode = syncCode.replace(
  "const accRes = await fetch('https://graph.instagram.com/v26.0/me?fields=id,username,name,profile_picture_url', {",
  "const accRes = await fetch(`https://graph.facebook.com/v21.0/${metaConfig.accountId}?fields=id,username,name,profile_picture_url`, {"
);

// Replace media fetch endpoint
syncCode = syncCode.replace(
  "`https://graph.instagram.com/v26.0/me/media?fields=id,caption,media_type,media_product_type,permalink,thumbnail_url,media_url,timestamp,comments_count,like_count&limit=50`;",
  "`https://graph.facebook.com/v21.0/${metaConfig.accountId}/media?fields=id,caption,media_type,media_product_type,permalink,thumbnail_url,media_url,timestamp,comments_count,like_count&limit=50`;"
);

fs.writeFileSync('src/lib/instagram/reel-sync-service.ts', syncCode, 'utf8');
console.log('✅ Updated src/lib/instagram/reel-sync-service.ts');

// 2. Update src/lib/instagram/reel-automation.ts
let autoCode = fs.readFileSync('src/lib/instagram/reel-automation.ts', 'utf8');

autoCode = autoCode.replace(
  "const url = `https://graph.instagram.com/v26.0/${cleanId}?fields=is_user_follow_business&access_token=${token}`;",
  "const url = `https://graph.facebook.com/v21.0/${cleanId}?fields=is_user_follow_business&access_token=${token}`;"
);

autoCode = autoCode.replace(
  "const res = await fetch(`https://graph.instagram.com/v26.0/${commentId}/replies`, {",
  "const res = await fetch(`https://graph.facebook.com/v21.0/${commentId}/replies`, {"
);

fs.writeFileSync('src/lib/instagram/reel-automation.ts', autoCode, 'utf8');
console.log('✅ Updated src/lib/instagram/reel-automation.ts');

