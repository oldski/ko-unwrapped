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
    env: {
        SPOTIFY_CLIENT_ID:'1fd98e902f6a4d5d819124e2cbf0563d',
        SPOTIFY_CLIENT_SECRET:'2155824fe4774999b6f4183a4ab62f9d',
        SPOTIFY_REFRESH_TOKEN: "AQAgV7ykJZk_kCryM8PhP__U0nHJNdcq-f_gIDOr87-ljCzKzhQ72ak1Oidwvw4IHYlOMZOjvOuGZl10WnKcDHMA-U9KSC7waddIk96tJ2xi8Z8-mFXPAVeMIIyWA_HfrXI",
    }
};

export default nextConfig;
