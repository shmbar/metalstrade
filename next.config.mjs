/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // pdf-parse + pdfjs-dist must NOT be bundled by Next's webpack —
  // their inner webpack runtime fights with Next's and breaks at module
  // load time with "Object.defineProperty called on non-object".
  // Loading them as native Node modules at runtime sidesteps the conflict.
  serverExternalPackages: ['pdf-parse', 'pdfjs-dist'],
};

export default nextConfig;
