import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // Output standalone para producción (Railway/Docker)
  // Solo en Railway - evita problemas de symlinks en Windows
  output: process.env.RAILWAY_ENVIRONMENT === 'true' ? 'standalone' : undefined,

  // Hacer el build más tolerante a errores
  typescript: {
    // No fallar el build por errores de TypeScript (revisar manualmente)
    ignoreBuildErrors: false,
  },

  // Configuración para páginas de error
  experimental: {
    // Habilitar el manejo mejorado de errores
    // errorOverlay: true, // Removido porque no existe en esta versión
  },

  // Configuración de redirecciones y páginas de error personalizadas
  async redirects() {
    return [
      // Redirecciones personalizadas si es necesario
    ];
  },

  // Configuración de headers para seguridad
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
    ];
  },

  // Optimizaciones de producción
  poweredByHeader: false,
  compress: true,

  // Configuración de imágenes para optimización
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
};

export default nextConfig;
