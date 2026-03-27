import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/relationships/:path*',
        destination: '/api/static/relationships/:path*',
      },
      {
        source: '/logo/:path*',
        destination: '/api/static/logo/:path*',
      },
      {
        source: '/games/:path*',
        destination: '/api/static/games/:path*',
      },
      {
        source: '/Faq/:path*',
        destination: '/api/static/Faq/:path*',
      },
      {
        source: '/Videos/:path*',
        destination: '/api/static/Videos/:path*',
      },
      {
        source: '/UserData/:path*',
        destination: '/api/static/UserData/:path*',
      },
      {
        source: '/ed-and-izelia.jpg',
        destination: '/api/static/ed-and-izelia.jpg',
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/api/genkit/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "https://www.ttpath.net, https://ttpath.net" },
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" },
        ]
      }
    ]
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Prevent Node.js-only modules from being bundled into the browser
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        perf_hooks: false,
      };
    }
    return config;
  },
};

export default nextConfig;
