import type { NextConfig } from "next";

const nextConfig: NextConfig = {

  images: {

    remotePatterns: [

      {
        protocol: "https",

        hostname:
          "https://pub-3017eb5d70cd44ddb3ce5b8a99508547.r2.dev",
      },

    ],

  },

};

export default nextConfig;