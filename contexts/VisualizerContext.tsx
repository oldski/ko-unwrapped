'use client';
import { createContext, useContext, useState, ReactNode } from 'react';

type VisualizerType = 'retro' | 'waveform' | 'radar' | 'matrix' | 'tunnel' | 'orbs';

interface VisualizerContextType {
  activeVisualizer: VisualizerType;
  setActiveVisualizer: (visualizer: VisualizerType) => void;
  bpm: number;
  setBpm: (bpm: number) => void;
  energy: number;
  setEnergy: (energy: number) => void;
  danceability: number;
  setDanceability: (danceability: number) => void;
}

const VisualizerContext = createContext<VisualizerContextType | undefined>(undefined);

export function VisualizerProvider({ children }: { children: ReactNode }) {
  const [activeVisualizer, setActiveVisualizer] = useState<VisualizerType>('retro');
  const [bpm, setBpm] = useState(120);
  const [energy, setEnergy] = useState(0.5);
  const [danceability, setDanceability] = useState(0.5);

  return (
    <VisualizerContext.Provider
      value={{
        activeVisualizer,
        setActiveVisualizer,
        bpm,
        setBpm,
        energy,
        setEnergy,
        danceability,
        setDanceability,
      }}
    >
      {children}
    </VisualizerContext.Provider>
  );
}

export function useVisualizer() {
  const context = useContext(VisualizerContext);
  if (context === undefined) {
    throw new Error('useVisualizer must be used within a VisualizerProvider');
  }
  return context;
}
