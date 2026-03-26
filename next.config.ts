import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 12-Factor: Build/release/run — output standalone para Docker
  output: "standalone",
  outputFileTracingRoot: __dirname,

  // Seguridad: no exponer versión de Next.js en headers
  poweredByHeader: false,

  // 12-Factor: Config — exponer solo las env vars necesarias al cliente
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version ?? "0.1.0",
  },

  experimental: {
    // Server Actions habilitadas (ya se usan en la app)
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },

  // Headers de seguridad
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
