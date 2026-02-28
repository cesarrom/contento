import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: "standalone",
  serverExternalPackages: ["postgres", "bullmq", "ioredis"],
};

export default nextConfig;
