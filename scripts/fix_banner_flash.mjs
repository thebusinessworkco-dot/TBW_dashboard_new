import fs from 'fs';

console.log('Fixing WhatsApp Business phone banner flash on reload...');

// 1. Fix src/app/(dashboard)/automations/instagram-reels/page.tsx
let reels = fs.readFileSync('src/app/(dashboard)/automations/instagram-reels/page.tsx', 'utf8');

// Replace state definition
reels = reels.replace(
  "const [whatsappPhone, setWhatsappPhone] = useState<string | null>(null);",
  `const [whatsappPhone, setWhatsappPhone] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tbw_wa_business_phone') || '917972020292';
    }
    return '917972020292';
  });
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);`
);

// Add fast independent settings fetch before loadData
const fastSettingsFetch = `
  // Fast independent check for WhatsApp phone so it never blocks or flashes
  useEffect(() => {
    fetch('/api/instagram/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.whatsapp_business_phone) {
          setWhatsappPhone(data.whatsapp_business_phone);
          try { localStorage.setItem('tbw_wa_business_phone', data.whatsapp_business_phone); } catch {}
        } else if (data.success && !data.whatsapp_business_phone) {
          setWhatsappPhone(null);
          try { localStorage.removeItem('tbw_wa_business_phone'); } catch {}
        }
        setIsSettingsLoaded(true);
      })
      .catch(() => setIsSettingsLoaded(true));
  }, []);
`;

reels = reels.replace(
  '  // 1. Initial Load of Rules, Synced Reels & Settings',
  fastSettingsFetch + '\n  // 1. Initial Load of Rules, Synced Reels & Settings'
);

// In loadData, update isSettingsLoaded
reels = reels.replace(
  'if (dataSettings.success && dataSettings.whatsapp_business_phone) {\r\n        setWhatsappPhone(dataSettings.whatsapp_business_phone);\r\n      }',
  `if (dataSettings.success && dataSettings.whatsapp_business_phone) {
        setWhatsappPhone(dataSettings.whatsapp_business_phone);
        try { localStorage.setItem('tbw_wa_business_phone', dataSettings.whatsapp_business_phone); } catch {}
      } else if (dataSettings.success && !dataSettings.whatsapp_business_phone) {
        setWhatsappPhone(null);
        try { localStorage.removeItem('tbw_wa_business_phone'); } catch {}
      }
      setIsSettingsLoaded(true);`
);

if (!reels.includes('setIsSettingsLoaded(true);')) {
  // LF fallback
  reels = reels.replace(
    'if (dataSettings.success && dataSettings.whatsapp_business_phone) {\n        setWhatsappPhone(dataSettings.whatsapp_business_phone);\n      }',
    `if (dataSettings.success && dataSettings.whatsapp_business_phone) {
        setWhatsappPhone(dataSettings.whatsapp_business_phone);
        try { localStorage.setItem('tbw_wa_business_phone', dataSettings.whatsapp_business_phone); } catch {}
      } else if (dataSettings.success && !dataSettings.whatsapp_business_phone) {
        setWhatsappPhone(null);
        try { localStorage.removeItem('tbw_wa_business_phone'); } catch {}
      }
      setIsSettingsLoaded(true);`
  );
}

// Replace banner conditional
reels = reels.replace(
  '{/* WHATSAPP WARNING BANNER IF PHONE UNCONFIGURED */}\r\n        {!whatsappPhone && (',
  '{/* WHATSAPP WARNING BANNER IF PHONE UNCONFIGURED */}\r\n        {isSettingsLoaded && !whatsappPhone && ('
);
if (!reels.includes('{isSettingsLoaded && !whatsappPhone && (')) {
  reels = reels.replace(
    '{/* WHATSAPP WARNING BANNER IF PHONE UNCONFIGURED */}\n        {!whatsappPhone && (',
    '{/* WHATSAPP WARNING BANNER IF PHONE UNCONFIGURED */}\n        {isSettingsLoaded && !whatsappPhone && ('
  );
}

fs.writeFileSync('src/app/(dashboard)/automations/instagram-reels/page.tsx', reels, 'utf8');
console.log('✅ Updated src/app/(dashboard)/automations/instagram-reels/page.tsx');

// 2. Fix src/app/(dashboard)/settings/page.tsx
let settings = fs.readFileSync('src/app/(dashboard)/settings/page.tsx', 'utf8');

settings = settings.replace(
  "const [whatsappPhone, setWhatsappPhone] = useState('');",
  `const [whatsappPhone, setWhatsappPhone] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tbw_wa_business_phone') || '917972020292';
    }
    return '917972020292';
  });
  const [isPhoneLoaded, setIsPhoneLoaded] = useState(false);`
);

settings = settings.replace(
  "        if (data.success && data.whatsapp_business_phone) {\r\n          setWhatsappPhone(data.whatsapp_business_phone);\r\n          setTestLink(data.test_url || '');\r\n        }",
  `        if (data.success && data.whatsapp_business_phone) {
          setWhatsappPhone(data.whatsapp_business_phone);
          setTestLink(data.test_url || '');
          try { localStorage.setItem('tbw_wa_business_phone', data.whatsapp_business_phone); } catch {}
        } else if (data.success && !data.whatsapp_business_phone) {
          setWhatsappPhone('');
          try { localStorage.removeItem('tbw_wa_business_phone'); } catch {}
        }
        setIsPhoneLoaded(true);`
);
if (!settings.includes('setIsPhoneLoaded(true);')) {
  settings = settings.replace(
    "        if (data.success && data.whatsapp_business_phone) {\n          setWhatsappPhone(data.whatsapp_business_phone);\n          setTestLink(data.test_url || '');\n        }",
    `        if (data.success && data.whatsapp_business_phone) {
          setWhatsappPhone(data.whatsapp_business_phone);
          setTestLink(data.test_url || '');
          try { localStorage.setItem('tbw_wa_business_phone', data.whatsapp_business_phone); } catch {}
        } else if (data.success && !data.whatsapp_business_phone) {
          setWhatsappPhone('');
          try { localStorage.removeItem('tbw_wa_business_phone'); } catch {}
        }
        setIsPhoneLoaded(true);`
  );
}

settings = settings.replace(
  '{!whatsappPhone && (',
  '{isPhoneLoaded && !whatsappPhone && ('
);

fs.writeFileSync('src/app/(dashboard)/settings/page.tsx', settings, 'utf8');
console.log('✅ Updated src/app/(dashboard)/settings/page.tsx');
console.log('Banner flash fix complete!');
