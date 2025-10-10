import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Configuración para páginas de error
  experimental: {
    // Habilitar el manejo mejorado de errores
    errorOverlay: true,
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
        ],
      },
    ];
  },
};

export default nextConfig;
