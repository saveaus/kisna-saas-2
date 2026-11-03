import type { NextConfig } from "next";

// Cache Components is off: almost every page is per-user, signed-in data,
// so pages render per request. Revisit when there are public pages.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
