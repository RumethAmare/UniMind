/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  async rewrites() {
    const apiBaseUrl = process.env.INTERNAL_API_BASE_URL ?? "http://localhost:8000/api/v1";
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiBaseUrl}/:path*`
      }
    ];
  }
};

export default nextConfig;
