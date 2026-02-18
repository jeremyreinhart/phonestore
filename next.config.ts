/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ndhtlgcpjiypzfdfflwf.supabase.co",
      },
    ],
  },
};

export default nextConfig;
