'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import useSWR from 'swr';
import fetcher from '@/lib/fetcher';
import useColorThief from 'use-color-thief';

interface NowPlayingData {
  isPlaying: boolean;
  albumImageUrl: string;
}

export default function AmbientLayer() {
  const pathname = usePathname();
  const isHomePage = pathname === '/';
  const [imgSrc, setImgSrc] = useState<string>('');

  const { data } = useSWR<NowPlayingData>(
    `${process.env.NEXT_PUBLIC_HOST}/api/now-playing`,
    fetcher,
    { refreshInterval: 5000 }
  );

  const { palette: colors } = useColorThief(imgSrc, {
    format: 'hex',
    quality: 10,
    colorCount: 6
  });

  const backgroundColor = (colors?.[2] as string) || '#1DB954';

  useEffect(() => {
    if (data?.isPlaying && data.albumImageUrl) {
      setImgSrc(data.albumImageUrl);
    }
  }, [data]);

  if (!data?.isPlaying) return null;

  return (
    <div className="h-screen w-screen fixed top-0 left-0 duration-300 transition-all pointer-events-none z-[-5]">
      <motion.div
        className="h-full w-full"
        style={isHomePage ? {
          backgroundColor: 'transparent',
          backgroundImage: `radial-gradient(transparent 1px, ${backgroundColor} 1px)`,
          backgroundSize: '4px 4px',
          backdropFilter: 'blur(3px)',
        } : {
          backgroundColor: 'transparent',
          backgroundImage: `radial-gradient(transparent 1px, ${backgroundColor} 1px)`,
          backgroundSize: '4px 4px',
          backdropFilter: 'blur(40px)',
        }}
      />
    </div>
  );
}
