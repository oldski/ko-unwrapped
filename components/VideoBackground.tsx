'use client';

import { useState } from 'react';
import useSWR from 'swr';
import fetcher from '@/lib/fetcher';
import { motion, AnimatePresence } from 'framer-motion';

interface NowPlayingData {
  isPlaying: boolean;
}

const VideoBackground = () => {
  const { data } = useSWR<NowPlayingData>(
    `${process.env.NEXT_PUBLIC_HOST}/api/now-playing`,
    fetcher,
    { refreshInterval: 5000 }
  );

  return (
    <div className="fixed inset-0 -z-10">
      <AnimatePresence mode="wait">
        {!data?.isPlaying && (
          // Video background when not playing
          <motion.div
            key="video"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2 }}
            className="absolute inset-0"
          >
            <video
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover"
            >
              <source src="/video/not-playing.mov" type="video/mp4" />
            </video>

            {/* Overlay for video background */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VideoBackground;
