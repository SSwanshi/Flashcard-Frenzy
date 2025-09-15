import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['mongoose'],
  webpack: (config) => {
    config.externals.push({
      'mongodb-client-encryption': 'commonjs mongodb-client-encryption',
    });
    return config;
  },
};

export default nextConfig;
