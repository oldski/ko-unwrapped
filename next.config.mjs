/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: false, // Disable to avoid React DevTools compatibility issues
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'i.scdn.co',
                port: '',
            },
            {
                protocol: 'https',
                hostname: 'tailwind-generator.b-cdn.net',
                port: '',
            }
        ],
    },
};

export default nextConfig;
