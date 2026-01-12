/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // 이 줄을 꼭 추가해야 'out' 폴더가 생깁니다!
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
