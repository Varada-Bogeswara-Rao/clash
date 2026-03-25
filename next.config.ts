import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api-assets.clashofclans.com"
      }
    ]
  }
};

export default nextConfig;
