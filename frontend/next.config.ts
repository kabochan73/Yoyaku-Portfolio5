import type { NextConfig } from "next";

const apiUrl = process.env.API_URL;
if (!apiUrl) {
  throw new Error("API_URL is not set. See frontend/.env.example.");
}
const backendOrigin = apiUrl.replace(/\/api\/?$/, "");

const nextConfig: NextConfig = {
  output: "standalone",
  cacheComponents: true,
  experimental: {
    // 開発中に HMR で fetch の結果が使い回されると、再検証後も古い施設情報でキャッシュが作り直される
    serverComponentsHmrCache: false,
  },
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
