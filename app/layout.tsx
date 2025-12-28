import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { SchemaMarkup } from '@/components/schema-markup';
import './globals.css';

const defaultUrl = process.env.NEXT_PUBLIC_SITE_URL || 
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://pos.numercia.com');
const siteUrl = defaultUrl;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'MiComercio360 - Sistema POS Moderno para Empresas Colombianas',
  description: 'Sistema completo de punto de venta en la nube para empresas colombianas. Gestión de inventario, ventas, facturación electrónica y reportes en tiempo real. Empieza gratis hoy.',
  keywords: ['punto de venta', 'POS', 'sistema POS Colombia', 'gestión de inventario', 'facturación electrónica', 'sistema de ventas', 'software contable', 'MiComercio360'],
  authors: [{ name: 'Soluciones Rengifo SAS' }],
  creator: 'Soluciones Rengifo SAS',
  publisher: 'Soluciones Rengifo SAS',
  manifest: '/manifest.json',
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    type: 'website',
    locale: 'es_CO',
    url: siteUrl,
    siteName: 'MiComercio360',
    title: 'MiComercio360 - Sistema POS Moderno para Empresas Colombianas',
    description: 'Sistema completo de punto de venta en la nube para empresas colombianas. Gestión de inventario, ventas, facturación electrónica y reportes en tiempo real.',
    images: [
      {
        url: `${siteUrl}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: 'MiComercio360 - Sistema de Punto de Venta',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MiComercio360 - Sistema POS Moderno para Empresas Colombianas',
    description: 'Sistema completo de punto de venta en la nube para empresas colombianas. Gestión de inventario, ventas, facturación electrónica y reportes en tiempo real.',
    images: [`${siteUrl}/og-image.jpg`],
    creator: '@MiComercio360',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MiComercio360',
  },
  verification: {
    // Agregar códigos de verificación cuando estén disponibles
    // google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
  },
};

const geistSans = Geist({
  variable: '--font-geist-sans',
  display: 'swap',
  subsets: ['latin'],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased`}>
        <SchemaMarkup />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
