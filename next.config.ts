import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default nextConfig;

