import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Rewrites removed — backend proxying is handled by the
  // /api/proxy/[...path] API route which reads BACKEND_URL at runtime.
};

export default nextConfig;
