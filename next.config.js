/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["mongoose"],
    // Optimize server components
    serverComponents: true,
    // Optimize font loading
    fontLoaders: [
      { loader: "@next/font/google", options: { subsets: ["latin"] } },
    ],
    // Enable app directory features
    appDir: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Optimized webpack config for production
  webpack: (config, { dev, isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }

    // Optimize bundle size in production
    if (!dev) {
      // Enable tree shaking
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        // Split chunks for better caching
        splitChunks: {
          chunks: "all",
          cacheGroups: {
            commons: {
              test: /[\\/]node_modules[\\/]/,
              name: "vendors",
              chunks: "all",
            },
            styles: {
              test: /\.css$/,
              name: "styles",
              chunks: "all",
              enforce: true,
            },
          },
        },
        // Minimize output size
        minimize: true,
      };
    }

    return config;
  },
  // Optimize image handling
  images: {
    domains: [],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 60,
    // Optimize image formats
    formats: ["image/webp"],
  },
  // Optimize for Vercel deployment
  poweredByHeader: false,
  reactStrictMode: true,
  swcMinify: true,
  // Enable gzip compression
  compress: true,
  // Configure environment variables that should be available to the browser
  env: {
    APP_VERSION: process.env.npm_package_version || "1.0.0",
  },
  // Configure headers for security and caching
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
      {
        // Cache static assets for 1 year
        source: "/(.*)\\.(jpg|jpeg|png|gif|ico|svg|webp|woff|woff2|ttf|eot)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
  // Configure redirects for common paths
  async redirects() {
    return [
      {
        source: "/home",
        destination: "/",
        permanent: true,
      },
    ];
  },
};

// Only apply PWA in production builds
if (process.env.NODE_ENV === "production") {
  const withPWA = require("next-pwa")({
    dest: "public",
    register: true,
    skipWaiting: true,
    disable: false,
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "google-fonts",
          expiration: {
            maxEntries: 4,
            maxAgeSeconds: 365 * 24 * 60 * 60, // 365 days
          },
        },
      },
      {
        urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "google-fonts-static",
          expiration: {
            maxEntries: 4,
            maxAgeSeconds: 365 * 24 * 60 * 60, // 365 days
          },
        },
      },
      {
        urlPattern:
          /\.(?:js|css|woff|woff2|ttf|eot|ico|png|jpg|jpeg|svg|gif)$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "static-resources",
          expiration: {
            maxEntries: 64,
            maxAgeSeconds: 24 * 60 * 60, // 24 hours
          },
        },
      },
      // Add API caching for better performance
      {
        urlPattern: /\/api\/menu\/current/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "api-menu",
          expiration: {
            maxEntries: 1,
            maxAgeSeconds: 60 * 60, // 1 hour
          },
        },
      },
      {
        urlPattern: /\/api\/notifications/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "api-notifications",
          expiration: {
            maxEntries: 16,
            maxAgeSeconds: 5 * 60, // 5 minutes
          },
        },
      },
    ],
  });
  module.exports = withPWA(nextConfig);
} else {
  // Development mode - no PWA
  module.exports = nextConfig;
}
