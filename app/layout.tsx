import type { Metadata, Viewport } from 'next';
import './globals.css';
import { TaskProvider } from '@/context/TaskContext';

export const metadata: Metadata = {
  title: 'BountyList - Most Wanted & Bounties PWA',
  description:
    'Track your Most Wanted targets and claim extra Bounties. A responsive, mobile-first Wanted Poster To-Do List PWA.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'BountyList',
  },
  icons: {
    icon: '/icons/icon-192.svg',
    apple: '/icons/icon-192.svg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#10b981',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased font-sans select-none sm:select-auto">
        <TaskProvider>
          {children}
        </TaskProvider>

        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('BountyList ServiceWorker registered with scope: ', registration.scope);
                    },
                    function(err) {
                      console.log('BountyList ServiceWorker registration failed: ', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
