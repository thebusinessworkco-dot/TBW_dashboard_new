import fs from 'fs';

// Preload .env.local
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

import { saveReelRule } from '../src/lib/instagram/reel-automation.ts';

async function seedActiveRule() {
  const rule = await saveReelRule({
    media_id: '18352671520267494',
    permalink: 'https://www.instagram.com/reel/De2LMv9Iypc/',
    thumbnail_url: 'https://scontent-iad3-1.cdninstagram.com/v/t51.71878-15/865200852_1101292006209900_5189783333849432208_n.jpg?stp=dst-jpg_e35_tt6&_nc_cat=108&ccb=7-5&_nc_sid=18de74&efg=eyJlZmdfdGFnIjoiQ0xJUFMuYmVzdF9pbWFnZV91cmxnZW4uQzMifQ%3D%3D&_nc_ohc=lNUXDTur1IQQ7kNvwElWWdE&_nc_oc=AdoOuMTZpprh-LLyR4-BYONBeHXH5sIm9toKUn2LIkCFu4oKAB7tLwVLvvr6LSFHLos&_nc_zt=23&_nc_ht=scontent-iad3-1.cdninstagram.com&edm=ANo9K5cEAAAA&_nc_gid=kORmYGDt1z4HTQGGebkreA&_nc_tpa=Q5bMBQJPAJVLhmPE0z4YazkXzXmiTLi2b4eoL3nNv0l9fb3CVi17u1zy1SZSayOfHkcsCRFMxXh60m3HIQ&oh=00_AQNmyy5pUbVlavt6jkq_8vmwQ0xzrsc9ty3jlGyAe8qkTw&oe=6AE16BE4',
    title: 'Instagram Reels AI Automation (De2LMv9Iypc)',
    is_enabled: true,
    trigger_mode: 'any_comment',
    keywords: ['INFO', 'DETAILS', 'AUTOMATION'],
    initial_dm_text: "Thanks for commenting on our Reel! 👋\nReply with 'Hi' or anything here to unlock your details! ✨",
    details_text: "Here are the full details on our AI and workflow automation services! We build custom lead qualification and appointment bots for businesses.",
    follow_required: true,
    follow_instructions_text: 'Follow our Instagram page to unlock the details! 👋',
    follow_button_label: "I've Followed",
    post_unlock_primary_action: 'View Services',
    first_interactive_followup: 'Tap below to get instant details or explore our services:',
    whatsapp_prefill_text: 'Hi! I saw your Instagram Reel and would like to learn more.'
  });

  console.log('Successfully saved production rule:', rule.id, 'Media ID:', rule.media_id, 'Title:', rule.title);
}

seedActiveRule();
