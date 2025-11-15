'use client';
import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import useSWR from 'swr';
import fetcher from '@/lib/fetcher';
import clsx from "clsx";

interface NowPlayingData {
  isPlaying: boolean;
}

export default function AmbientLayer() {
  const pathname = usePathname();
  const isHomePage = pathname === '/';

  const { data } = useSWR<NowPlayingData>(
    `${process.env.NEXT_PUBLIC_HOST}/api/now-playing`,
    fetcher,
    { refreshInterval: 5000 }
  );

  if (!data?.isPlaying) return null;

  return (
    <div className={clsx(
	    "h-screen w-screen fixed top-0 left-0",
	    "duration-300 transition-all pointer-events-none",
	    // "backdrop-blur-3xl",
	    // "blur-3xl",
	    "z-[-1] opacity-80",
    )}>
	    <motion.div
		    className={clsx(
			    "h-screen w-screen fixed top-0 left-0",
			    "duration-300 transition-all pointer-events-none",
			    // "backdrop-blur-3xl",
			    // "blur-3xl",
			    "z-[-1] opacity-80",
		    )}
		    style={isHomePage ? {
			    backgroundColor: 'transparent',
			    backgroundImage: `radial-gradient(transparent 1px, var(--color-6) 1px)`,
			    backgroundSize: '4px 4px',
			    backdropFilter: 'blur(3px)',
		    } : {
			    backgroundColor: 'transparent',
			    backgroundImage: `radial-gradient(transparent 1px, var(--color-3) 1px)`,
			    backgroundSize: '4px 4px',
			    backdropFilter: 'blur(40px)',
		    }}
	    />
    </div>
  );
}
