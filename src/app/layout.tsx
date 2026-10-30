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
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col antialiased bg-[#F8F7F3] text-[#141413]">
        <DashboardStoreProvider>
          {children}
        </DashboardStoreProvider>
      </body>
    </html>
  );
}
