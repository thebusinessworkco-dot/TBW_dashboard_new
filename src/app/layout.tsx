import type { Metadata } from 'next';
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
            __html: `
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
            `,
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
