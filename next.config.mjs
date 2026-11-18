/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@libsql/client", "mammoth", "@tiptap/html", "bcryptjs"],
  poweredByHeader: false,
};
export default nextConfig;
