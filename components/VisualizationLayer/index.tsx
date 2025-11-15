'use client';
import { useEffect, useState, useRef } from 'react';
import useSWR from 'swr';
import fetcher from '@/lib/fetcher';
import { AnimatePresence, motion } from 'framer-motion';
import { useVisualizer } from '@/contexts/VisualizerContext';
import dynamic from 'next/dynamic';

// Lazy-load visualizers for better performance
const RetroPixelated = dynamic(() => import('@/components/visualizers/RetroPixelated'), {
  ssr: false,
  loading: () => <div className="fixed inset-0 bg-gray-900/20" />,
});

const WaveformOscilloscope = dynamic(() => import('@/components/visualizers/WaveformOscilloscope'), {
  ssr: false,
  loading: () => <div className="fixed inset-0 bg-gray-900/20" />,
});

const RadarCircular = dynamic(() => import('@/components/visualizers/RadarCircular'), {
  ssr: false,
  loading: () => <div className="fixed inset-0 bg-gray-900/20" />,
});

const MatrixRain = dynamic(() => import('@/components/visualizers/MatrixRain'), {
  ssr: false,
  loading: () => <div className="fixed inset-0 bg-gray-900/20" />,
});

const GridTunnel = dynamic(() => import('@/components/visualizers/GridTunnel'), {
  ssr: false,
  loading: () => <div className="fixed inset-0 bg-gray-900/20" />,
});

const SpectrumOrbs = dynamic(() => import('@/components/visualizers/SpectrumOrbs'), {
  ssr: false,
  loading: () => <div className="fixed inset-0 bg-gray-900/20" />,
});

interface AudioFeatures {
  tempo: number;
  energy: number;
  valence: number;
  danceability: number;
}

interface NowPlayingData {
  isPlaying: boolean;
  audioFeatures?: AudioFeatures;
  albumImageUrl?: string;
}

type VisualizerType = 'retro' | 'waveform' | 'radar' | 'matrix' | 'tunnel' | 'orbs';

const VISUALIZERS: VisualizerType[] = ['retro', 'waveform', 'radar', 'matrix', 'tunnel', 'orbs'];

export default function VisualizationLayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [valence, setValence] = useState(0.5);
  const previousTrackRef = useRef<string>('');

  // Use shared visualizer context
  const {
    activeVisualizer,
    setActiveVisualizer,
    bpm,
    setBpm,
    energy,
    setEnergy,
    danceability,
    setDanceability,
  } = useVisualizer();

  const { data } = useSWR<NowPlayingData>(
    `${process.env.NEXT_PUBLIC_HOST}/api/now-playing`,
    fetcher,
    { refreshInterval: 5000 }
  );

  useEffect(() => {
    if (data) {
      setIsPlaying(data.isPlaying);

      if (data.audioFeatures) {
        setBpm(data.audioFeatures.tempo);
        setEnergy(data.audioFeatures.energy);
        setDanceability(data.audioFeatures.danceability);
        setValence(data.audioFeatures.valence);
      }

      // Switch visualizer when track changes
      if (data.albumImageUrl && data.albumImageUrl !== previousTrackRef.current) {
        previousTrackRef.current = data.albumImageUrl;

        // Randomly select a new visualizer
        const randomIndex = Math.floor(Math.random() * VISUALIZERS.length);
        setActiveVisualizer(VISUALIZERS[randomIndex]);
      }
    }
  }, [data]);

  const renderVisualizer = () => {
    const props = { bpm, energy, danceability, valence, isPlaying };

    switch (activeVisualizer) {
      case 'retro':
        return <RetroPixelated key="retro" {...props} />;
      case 'waveform':
        return <WaveformOscilloscope key="waveform" {...props} />;
      case 'radar':
        return <RadarCircular key="radar" {...props} />;
      case 'matrix':
        return <MatrixRain key="matrix" bpm={bpm} energy={energy} isPlaying={isPlaying} />;
      case 'tunnel':
        return <GridTunnel key="tunnel" {...props} />;
      case 'orbs':
        return <SpectrumOrbs key="orbs" {...props} />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeVisualizer}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 2, ease: 'easeInOut' }}
        >
          {renderVisualizer()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
