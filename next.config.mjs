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
  // Force-include pdfjs's worker file in the Vercel serverless bundle. Without
  // this, Vercel's nft tracing misses the worker (it's loaded dynamically) and
  // the function errors with "Cannot find module .../pdf.worker.mjs".
  outputFileTracingIncludes: {
    '/api/ai/document-reader': ['./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'],
    '/api/ai/cert-checker': ['./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'],
  },
  experimental: {
    // Tree-shake heavy barrel-export packages so a single named import doesn't pull
    // in the whole library. Next 15 already does this by default for lucide-react,
    // @radix-ui/* and date-fns; react-icons and framer-motion are the big ones it
    // doesn't cover out of the box.
    optimizePackageImports: ['react-icons', 'framer-motion', 'lucide-react', 'date-fns'],
  },
};

export default nextConfig;
