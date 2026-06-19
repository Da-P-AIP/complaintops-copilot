/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // shared パッケージ(TSソース)をNext側でトランスパイル
  transpilePackages: ["@complaintops/shared"],
};

module.exports = nextConfig;
