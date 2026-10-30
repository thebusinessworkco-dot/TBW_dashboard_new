import fs from 'fs';

console.log('Applying professional Dark Mode across dashboard...');

// 1. Update src/lib/store/dashboard-store.tsx
let store = fs.readFileSync('src/lib/store/dashboard-store.tsx', 'utf8');

if (!store.includes("theme: 'light' | 'dark' | 'system'")) {
  store = store.replace(
    '  // Demo Data Management (Disabled in Production)\r\n  removeDemoData: () => void;',
    '  // Theme State\r\n  theme: \'light\' | \'dark\' | \'system\';\r\n  setTheme: (theme: \'light\' | \'dark\' | \'system\') => void;\r\n  toggleTheme: () => void;\r\n\r\n  // Demo Data Management (Disabled in Production)\r\n  removeDemoData: () => void;'
  );
  if (!store.includes("theme: 'light' | 'dark' | 'system'")) {
    // Fallback for LF
    store = store.replace(
      '  // Demo Data Management (Disabled in Production)\n  removeDemoData: () => void;',
      '  // Theme State\n  theme: \'light\' | \'dark\' | \'system\';\n  setTheme: (theme: \'light\' | \'dark\' | \'system\') => void;\n  toggleTheme: () => void;\n\n  // Demo Data Management (Disabled in Production)\n  removeDemoData: () => void;'
    );
  }

  const themeProviderLogic = `
  // Theme management (Light / Dark / System)
  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>('light');

  const applyThemeToDOM = useCallback((t: 'light' | 'dark' | 'system') => {
    if (typeof window === 'undefined') return;
    const isDark =
      t === 'dark' ||
      (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('tbw_theme') as 'light' | 'dark' | 'system' | null;
      const initial = saved || 'light';
      setThemeState(initial);
      applyThemeToDOM(initial);
    } catch {}

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = () => {
      try {
        const current = localStorage.getItem('tbw_theme');
        if (current === 'system') {
          applyThemeToDOM('system');
        }
      } catch {}
    };
    media.addEventListener('change', handleMediaChange);
    return () => media.removeEventListener('change', handleMediaChange);
  }, [applyThemeToDOM]);

  const setTheme = useCallback(
    (newTheme: 'light' | 'dark' | 'system') => {
      setThemeState(newTheme);
      try {
        localStorage.setItem('tbw_theme', newTheme);
      } catch {}
      applyThemeToDOM(newTheme);
    },
    [applyThemeToDOM]
  );

  const toggleTheme = useCallback(() => {
    const isCurrentlyDark = document.documentElement.classList.contains('dark');
    const targetTheme = isCurrentlyDark ? 'light' : 'dark';
    setTheme(targetTheme);
  }, [setTheme]);
`;

  store = store.replace(
    '  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);',
    '  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);' + themeProviderLogic
  );

  store = store.replace(
    '        removeDemoData,',
    '        theme,\r\n        setTheme,\r\n        toggleTheme,\r\n        removeDemoData,'
  );
  if (!store.includes('toggleTheme,')) {
    store = store.replace(
      '        removeDemoData,',
      '        theme,\n        setTheme,\n        toggleTheme,\n        removeDemoData,'
    );
  }

  fs.writeFileSync('src/lib/store/dashboard-store.tsx', store, 'utf8');
  console.log('✅ Updated src/lib/store/dashboard-store.tsx');
}

// 2. Update src/app/layout.tsx
let layout = fs.readFileSync('src/app/layout.tsx', 'utf8');
if (!layout.includes('tbw_theme')) {
  layout = `import type { Metadata } from 'next';
import './globals.css';
import { DashboardStoreProvider } from '@/lib/store/dashboard-store';

export const metadata: Metadata = {
  title: 'The Business Work | Admin Control Center',
  description: 'Unified command center for WhatsApp automation, Instagram automation, leads, appointments, quotations, n8n workflows, and VPS monitoring.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: \`
              (function() {
                try {
                  var t = localStorage.getItem('tbw_theme');
                  var isDark = t === 'dark' || (t !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            \`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col antialiased bg-[#F8F7F4] text-stone-900">
        <DashboardStoreProvider>
          {children}
        </DashboardStoreProvider>
      </body>
    </html>
  );
}
`;
  fs.writeFileSync('src/app/layout.tsx', layout, 'utf8');
  console.log('✅ Updated src/app/layout.tsx');
}

// 3. Update src/components/layout/top-navbar.tsx
let navbar = fs.readFileSync('src/components/layout/top-navbar.tsx', 'utf8');
if (!navbar.includes('toggleTheme')) {
  navbar = navbar.replace(
    "import { Menu, AlertTriangle } from 'lucide-react';",
    "import { Menu, AlertTriangle, Sun, Moon } from 'lucide-react';"
  );
  navbar = navbar.replace(
    'const { timeFilter, setTimeFilter, integrationStatuses, vpsMetrics, setMobileMenuOpen } = useDashboardStore();',
    'const { timeFilter, setTimeFilter, integrationStatuses, vpsMetrics, setMobileMenuOpen, theme, toggleTheme } = useDashboardStore();'
  );

  const toggleBtn = `
        {/* Theme Toggle (Dark / Light Mode) */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="flex h-7.5 w-7.5 items-center justify-center rounded-xl border border-stone-200/80 bg-stone-100/80 text-stone-700 hover:bg-stone-200/80 hover:text-stone-900 transition-all shadow-2xs cursor-pointer active:scale-95"
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4 text-amber-400" />
          ) : (
            <Moon className="h-4 w-4 text-stone-600" />
          )}
        </button>
`;

  navbar = navbar.replace(
    '        </div>\r\n\r\n        {/* Integration Status Badge */}',
    '        </div>' + toggleBtn + '\r\n\r\n        {/* Integration Status Badge */}'
  );
  if (!navbar.includes('toggleTheme')) {
    navbar = navbar.replace(
      '        </div>\n\n        {/* Integration Status Badge */}',
      '        </div>' + toggleBtn + '\n\n        {/* Integration Status Badge */}'
    );
  }

  fs.writeFileSync('src/components/layout/top-navbar.tsx', navbar, 'utf8');
  console.log('✅ Updated src/components/layout/top-navbar.tsx');
}

// 4. Update src/app/(dashboard)/settings/page.tsx
let settings = fs.readFileSync('src/app/(dashboard)/settings/page.tsx', 'utf8');
if (!settings.includes('Appearance & Theme')) {
  settings = settings.replace(
    "  ExternalLink,\r\n} from 'lucide-react';",
    "  ExternalLink,\r\n  Sun,\r\n  Moon,\r\n  Monitor,\r\n  BellOff,\r\n} from 'lucide-react';"
  );
  if (!settings.includes('BellOff,')) {
    settings = settings.replace(
      "  ExternalLink,\n} from 'lucide-react';",
      "  ExternalLink,\n  Sun,\n  Moon,\n  Monitor,\n  BellOff,\n} from 'lucide-react';"
    );
  }

  settings = settings.replace(
    "import { TopNavbar } from '@/components/layout/top-navbar';",
    "import { TopNavbar } from '@/components/layout/top-navbar';\r\nimport { useDashboardStore } from '@/lib/store/dashboard-store';"
  );
  if (!settings.includes('useDashboardStore')) {
    settings = settings.replace(
      "import { TopNavbar } from '@/components/layout/top-navbar';",
      "import { TopNavbar } from '@/components/layout/top-navbar';\nimport { useDashboardStore } from '@/lib/store/dashboard-store';"
    );
  }

  settings = settings.replace(
    'export default function SettingsPage() {\r\n  const [whatsappPhone, setWhatsappPhone] = useState(\'\');',
    'export default function SettingsPage() {\r\n  const { theme, setTheme } = useDashboardStore();\r\n  const [whatsappPhone, setWhatsappPhone] = useState(\'\');'
  );
  if (!settings.includes('{ theme, setTheme }')) {
    settings = settings.replace(
      'export default function SettingsPage() {\n  const [whatsappPhone, setWhatsappPhone] = useState(\'\');',
      'export default function SettingsPage() {\n  const { theme, setTheme } = useDashboardStore();\n  const [whatsappPhone, setWhatsappPhone] = useState(\'\');'
    );
  }

  const themeSettingsSection = `
        {/* SECTION 1.1: APPEARANCE & THEME (DARK / LIGHT MODE) */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs space-y-4">
          <div className="border-b border-stone-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                {theme === 'dark' ? (
                  <Moon className="h-4 w-4 text-amber-400" />
                ) : (
                  <Sun className="h-4 w-4 text-amber-500" />
                )}
                <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-900">
                  Appearance & Theme
                </h2>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Customize your dashboard interface theme. Changes persist automatically in your browser.
              </p>
            </div>
            <span className="rounded-lg bg-stone-100 border border-stone-200/80 px-2.5 py-1 text-[11px] font-mono text-stone-600 self-start sm:self-auto">
              Current: <strong className="capitalize text-stone-900">{theme} Mode</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {/* Light Mode Option */}
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={\`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-3 \${
                theme === 'light'
                  ? 'border-stone-900 bg-stone-50/80 ring-2 ring-stone-900/10 shadow-xs'
                  : 'border-stone-200/80 bg-white hover:border-stone-300 hover:bg-stone-50/50'
              }\`}
            >
              <div className="flex items-center justify-between">
                <div className="rounded-lg bg-amber-50 p-2 border border-amber-200/60">
                  <Sun className="h-4 w-4 text-amber-600" />
                </div>
                {theme === 'light' && (
                  <CheckCircle2 className="h-4 w-4 text-stone-900" />
                )}
              </div>
              <div>
                <div className="font-semibold text-xs text-stone-900">Light Theme</div>
                <div className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">
                  Clean daylight interface with warm stone accents.
                </div>
              </div>
            </button>

            {/* Dark Mode Option */}
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={\`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-3 \${
                theme === 'dark'
                  ? 'border-stone-900 bg-stone-50/80 ring-2 ring-stone-900/10 shadow-xs'
                  : 'border-stone-200/80 bg-white hover:border-stone-300 hover:bg-stone-50/50'
              }\`}
            >
              <div className="flex items-center justify-between">
                <div className="rounded-lg bg-indigo-50 p-2 border border-indigo-200/60">
                  <Moon className="h-4 w-4 text-indigo-600" />
                </div>
                {theme === 'dark' && (
                  <CheckCircle2 className="h-4 w-4 text-stone-900" />
                )}
              </div>
              <div>
                <div className="font-semibold text-xs text-stone-900">Dark Theme</div>
                <div className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">
                  Obsidian & slate dark palette for night use & focus.
                </div>
              </div>
            </button>

            {/* System Default Option */}
            <button
              type="button"
              onClick={() => setTheme('system')}
              className={\`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-3 \${
                theme === 'system'
                  ? 'border-stone-900 bg-stone-50/80 ring-2 ring-stone-900/10 shadow-xs'
                  : 'border-stone-200/80 bg-white hover:border-stone-300 hover:bg-stone-50/50'
              }\`}
            >
              <div className="flex items-center justify-between">
                <div className="rounded-lg bg-stone-100 p-2 border border-stone-200">
                  <Monitor className="h-4 w-4 text-stone-600" />
                </div>
                {theme === 'system' && (
                  <CheckCircle2 className="h-4 w-4 text-stone-900" />
                )}
              </div>
              <div>
                <div className="font-semibold text-xs text-stone-900">System Preference</div>
                <div className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">
                  Automatically adapts to your device OS settings.
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* SECTION 1.2: PERSONAL TEST NUMBER ALERT SUPPRESSION */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs space-y-4">
          <div className="border-b border-stone-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <BellOff className="h-4 w-4 text-stone-600" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-900">
                  Personal Number Alert Suppression
                </h2>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Automated admin alerts on Telegram & WhatsApp are automatically muted when you test using your personal phone numbers.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 border border-emerald-200 self-start sm:self-auto">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>3 Numbers Muted</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-3.5 rounded-xl border border-stone-200/80 bg-stone-50/60 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-stone-900">+91 7821840347</span>
                <span className="rounded bg-stone-200/70 px-1.5 py-0.5 text-[9px] font-semibold text-stone-700">Testing Phone</span>
              </div>
              <div className="text-[11px] text-stone-500">Aman Personal Mobile · Alerts Muted</div>
            </div>

            <div className="p-3.5 rounded-xl border border-stone-200/80 bg-stone-50/60 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-stone-900">+91 8604600292</span>
                <span className="rounded bg-stone-200/70 px-1.5 py-0.5 text-[9px] font-semibold text-stone-700">Owner Admin</span>
              </div>
              <div className="text-[11px] text-stone-500">Aman Rajbhar · Alerts Muted</div>
            </div>

            <div className="p-3.5 rounded-xl border border-stone-200/80 bg-stone-50/60 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-stone-900">+91 7972020292</span>
                <span className="rounded bg-stone-200/70 px-1.5 py-0.5 text-[9px] font-semibold text-stone-700">Bot WABA</span>
              </div>
              <div className="text-[11px] text-stone-500">Cloud API Sender · Alerts Muted</div>
            </div>
          </div>
        </div>
`;

  settings = settings.replace(
    '        {/* SECTION 1B: WHATSAPP BUSINESS NUMBER CONFIGURATION */}',
    themeSettingsSection + '\r\n        {/* SECTION 1B: WHATSAPP BUSINESS NUMBER CONFIGURATION */}'
  );
  if (!settings.includes('Appearance & Theme')) {
    settings = settings.replace(
      '        {/* SECTION 1B: WHATSAPP BUSINESS NUMBER CONFIGURATION */}',
      themeSettingsSection + '\n        {/* SECTION 1B: WHATSAPP BUSINESS NUMBER CONFIGURATION */}'
    );
  }

  fs.writeFileSync('src/app/(dashboard)/settings/page.tsx', settings, 'utf8');
  console.log('✅ Updated src/app/(dashboard)/settings/page.tsx');
}

console.log('All TSX components updated successfully!');
