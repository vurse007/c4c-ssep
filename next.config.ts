import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // A stray package-lock.json in a parent directory makes Next guess the wrong
  // workspace root (warning + Turbopack watching far more files than needed).
  turbopack: { root: path.resolve(__dirname) },
};

export default nextConfig;
