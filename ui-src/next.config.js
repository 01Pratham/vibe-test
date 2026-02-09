const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/api-tester'

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',
    distDir: '../ui',
    basePath: basePath,
    assetPrefix: basePath,
    images: {
        unoptimized: true
    }
}

module.exports = nextConfig
