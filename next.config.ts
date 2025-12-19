import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // Output standalone para producción (Railway/Docker)
  // Solo en Railway - evita problemas de symlinks en Windows
  output: process.env.RAILWAY_ENVIRONMENT === 'true' ? 'standalone' : undefined,

  // Compilación más rápida
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Hacer el build más tolerante a errores
  typescript: {
    // No fallar el build por errores de TypeScript (revisar manualmente)
    ignoreBuildErrors: false,
  },

  // Configuración para páginas de error
  experimental: {
    // Optimizaciones experimentales
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      'recharts',
    ],
    // Mejorar rendimiento de servidor
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  // Configuración de redirecciones y páginas de error personalizadas
  async redirects() {
    return [
      // Redirecciones personalizadas si es necesario
    ];
  },

  // Configuración de headers para seguridad y caché
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
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/image(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
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
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Configuración de Turbopack (Next.js 16 usa Turbopack por defecto)
  turbopack: {
    // Turbopack maneja el code splitting automáticamente de manera más eficiente
    // Las optimizaciones de webpack no son necesarias con Turbopack
  },

  // Optimización de webpack (solo si se desactiva Turbopack)
  // Comentado porque Next.js 16 usa Turbopack por defecto
  // webpack: (config, { isServer }) => {
  //   // Optimizaciones adicionales
  //   if (!isServer) {
  //     config.optimization = {
  //       ...config.optimization,
  //       moduleIds: 'deterministic',
  //       runtimeChunk: 'single',
  //       splitChunks: {
  //         chunks: 'all',
  //         cacheGroups: {
  //           default: false,
  //           vendors: false,
  //           // Vendor chunk para librerías grandes
  //           vendor: {
  //             name: 'vendor',
  //             chunks: 'all',
  //             test: /node_modules/,
  //             priority: 20,
  //           },
  //           // Chunk separado para librerías de UI
  //           ui: {
  //             name: 'ui',
  //             chunks: 'all',
  //             test: /[\\/]node_modules[\\/](@radix-ui|lucide-react)[\\/]/,
  //             priority: 30,
  //           },
  //           // Chunk para Supabase
  //           supabase: {
  //             name: 'supabase',
  //             chunks: 'all',
  //             test: /[\\/]node_modules[\\/]@supabase[\\/]/,
  //             priority: 25,
  //           },
  //           // Chunk para recharts
  //           charts: {
  //             name: 'charts',
  //             chunks: 'all',
  //             test: /[\\/]node_modules[\\/]recharts[\\/]/,
  //             priority: 25,
  //           },
  //           common: {
  //             name: 'common',
  //             minChunks: 2,
  //             chunks: 'all',
  //             priority: 10,
  //             reuseExistingChunk: true,
  //           },
  //         },
  //       };
  //     }
  //   }
  //   return config;
  // },
};

export default nextConfig;
