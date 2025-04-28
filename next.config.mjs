/** @type {import('next').NextConfig} */
const nextConfig = {
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
        SPOTIFY_CLIENT_ID:'58cb2288c79a4901ae1e9cf928eb518f',
        SPOTIFY_CLIENT_SECRET:'c712b97c2c6e4eafa6edf7030ade14b5',
        SPOTIFY_REFRESH_TOKEN: "AQBuXuID4jTOauE0bNDZgiFcwYDrqrLkwzcXP3XAQKj5WlDdp8gnry1znsWoblqrWasLNggumgL31wh5IlTXUnR6_zJjJ4dBSnE22v3WJgNWnMo11BCHgtQvhWinHGJmkFc",
    }
};

export default nextConfig;
