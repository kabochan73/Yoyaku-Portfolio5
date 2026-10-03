import type { NextConfig } from "next";

const apiUrl = process.env.API_URL;
if (!apiUrl) {
  throw new Error("API_URL is not set. See frontend/.env.example.");
}
const backendOrigin = apiUrl.replace(/\/api\/?$/, "");

const nextConfig: NextConfig = {
  output: "standalone",
  cacheComponents: true,
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${apiUrl}/:path*` },
      {
        source: "/sanctum/:path*",
        destination: `${backendOrigin}/sanctum/:path*`,
      },
    ];
  },
};

export default nextConfig;
