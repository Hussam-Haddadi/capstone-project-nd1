import type { NextConfig } from "next";

const API_ORIGIN = process.env.NIDD_API_ORIGIN ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  async rewrites() {
    const origin = API_ORIGIN.replace(/\/$/, "");
    return [
      // /api-proxy/* is handled by app/api-proxy/[[...path]]/route.ts (server proxy).
      {
        source: "/webhooks/:path*",
        destination: `${origin}/webhooks/:path*`,
      },
    ];
  },
};

export default nextConfig;
