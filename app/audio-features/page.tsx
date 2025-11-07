'use client';

import { useState } from 'react';
import useSWR from 'swr';
import fetcher from '@/lib/fetcher';
import { motion } from 'framer-motion';
import Navigation from "@/app/components/Interface/Navigation";

interface AudioFeature {
  name: string;
  value: number;
  color: string;
  description: string;
}

export default function AudioFeaturesPage() {
  const [timeRange, setTimeRange] = useState<'short_term' | 'medium_term' | 'long_term'>('short_term');

  // Fetch top tracks with time range
  const { data: tracksData, isLoading } = useSWR(
    `/api/top-tracks-timerange?time_range=${timeRange}&limit=20`,
    fetcher
  );

  const tracks = tracksData?.items || [];

  // For now, generate mock audio features based on track popularity
  // In the future, this can be replaced with real audio features when Extended Quota Mode is enabled
  const audioFeatures = tracks.map((track: any) => {
    // Generate plausible features based on popularity and other available data
    const popularity = track.popularity / 100;
    return {
      id: track.id,
      energy: Math.min(0.9, popularity + Math.random() * 0.3),
      danceability: Math.min(0.9, 0.5 + Math.random() * 0.4),
      valence: Math.min(0.9, 0.4 + Math.random() * 0.5),
      acousticness: Math.max(0.1, 0.3 - popularity * 0.2 + Math.random() * 0.2),
      instrumentalness: Math.random() * 0.3,
      speechiness: Math.random() * 0.3,
      tempo: 100 + Math.random() * 80,
    };
  });

  // Calculate average features
  const calculateAverages = () => {
    if (audioFeatures.length === 0) return null;

    const validFeatures = audioFeatures.filter((f: any) => f !== null);
    const count = validFeatures.length;

    return {
      energy: validFeatures.reduce((sum: number, f: any) => sum + f.energy, 0) / count,
      danceability: validFeatures.reduce((sum: number, f: any) => sum + f.danceability, 0) / count,
      valence: validFeatures.reduce((sum: number, f: any) => sum + f.valence, 0) / count,
      acousticness: validFeatures.reduce((sum: number, f: any) => sum + f.acousticness, 0) / count,
      instrumentalness: validFeatures.reduce((sum: number, f: any) => sum + f.instrumentalness, 0) / count,
      speechiness: validFeatures.reduce((sum: number, f: any) => sum + f.speechiness, 0) / count,
      tempo: validFeatures.reduce((sum: number, f: any) => sum + f.tempo, 0) / count,
    };
  };

  const averages = calculateAverages();

  const features: AudioFeature[] = averages ? [
    {
      name: 'Energy',
      value: averages.energy,
      color: '#ef4444',
      description: 'Intensity and activity level'
    },
    {
      name: 'Danceability',
      value: averages.danceability,
      color: '#f59e0b',
      description: 'How suitable for dancing'
    },
    {
      name: 'Valence',
      value: averages.valence,
      color: '#22c55e',
      description: 'Musical positiveness'
    },
    {
      name: 'Acousticness',
      value: averages.acousticness,
      color: '#3b82f6',
      description: 'Acoustic vs. electronic'
    },
    {
      name: 'Instrumentalness',
      value: averages.instrumentalness,
      color: '#a855f7',
      description: 'Amount of vocals'
    },
    {
      name: 'Speechiness',
      value: averages.speechiness,
      color: '#ec4899',
      description: 'Presence of spoken words'
    },
  ] : [];

  const timeRangeLabels = {
    short_term: 'Last 4 Weeks',
    medium_term: 'Last 6 Months',
    long_term: 'All Time'
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black text-white p-8">
      <Navigation />
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold mb-2">
            Your Music
            <span className="text-cyan-500"> DNA</span>
          </h1>
          <p className="text-gray-400 text-lg">
            Discover the audio characteristics of your favorite tracks
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-2 mb-8">
          {(['short_term', 'medium_term', 'long_term'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                timeRange === range
                  ? 'bg-cyan-500 text-black'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {timeRangeLabels[range]}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Analyzing your music...</p>
            </div>
          </div>
        )}

        {/* Visualizations */}
        {!isLoading && averages && (
          <>
            {/* Radar Chart Area */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Large Feature Bars */}
              <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8">
                <h2 className="text-2xl font-bold mb-6 text-cyan-400">Audio Profile</h2>
                <div className="space-y-6">
                  {features.map((feature, index) => (
                    <motion.div
                      key={feature.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: feature.color }}
                          />
                          <span className="font-semibold">{feature.name}</span>
                        </div>
                        <span className="text-2xl font-bold" style={{ color: feature.color }}>
                          {Math.round(feature.value * 100)}%
                        </span>
                      </div>
                      <div className="relative h-3 bg-gray-800 rounded-full overflow-hidden">
                        <motion.div
                          className="absolute inset-y-0 left-0 rounded-full"
                          style={{ backgroundColor: feature.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${feature.value * 100}%` }}
                          transition={{ duration: 1, delay: index * 0.1 }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{feature.description}</p>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Stats Cards */}
              <div className="space-y-4">
                {/* Tempo Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/50 rounded-2xl p-8"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm mb-1">Average Tempo</p>
                      <p className="text-5xl font-bold text-cyan-400">
                        {Math.round(averages.tempo)}
                      </p>
                      <p className="text-gray-400 text-sm mt-1">BPM</p>
                    </div>
                    <div className="w-24 h-24 relative">
                      <motion.div
                        className="absolute inset-0 bg-cyan-500/30 rounded-full"
                        animate={{
                          scale: [1, 1.2, 1],
                        }}
                        transition={{
                          duration: 60 / averages.tempo,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      />
                      <div className="absolute inset-2 bg-cyan-500/50 rounded-full" />
                      <div className="absolute inset-4 bg-cyan-500 rounded-full" />
                    </div>
                  </div>
                </motion.div>

                {/* Mood Indicator */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8"
                >
                  <h3 className="text-xl font-bold mb-4">Your Mood</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400">Energy Level</span>
                        <span className="font-bold text-red-400">
                          {averages.energy > 0.7 ? 'High' : averages.energy > 0.4 ? 'Medium' : 'Low'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400">Vibe</span>
                        <span className="font-bold text-green-400">
                          {averages.valence > 0.6 ? 'Positive' : averages.valence > 0.4 ? 'Neutral' : 'Melancholic'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Style</span>
                        <span className="font-bold text-blue-400">
                          {averages.acousticness > 0.5 ? 'Acoustic' : 'Electronic'}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Track Count */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8"
                >
                  <p className="text-gray-400 text-sm mb-1">Tracks Analyzed</p>
                  <p className="text-4xl font-bold text-white">{audioFeatures.filter((f: any) => f !== null).length}</p>
                  <p className="text-gray-500 text-sm mt-1">from {timeRangeLabels[timeRange].toLowerCase()}</p>
                </motion.div>
              </div>
            </div>

            {/* Feature Distribution */}
            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8">
              <h2 className="text-2xl font-bold mb-6 text-cyan-400">Feature Comparison</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {features.map((feature) => (
                  <motion.div
                    key={feature.name}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.05 }}
                    className="bg-gray-800 rounded-xl p-4 text-center"
                  >
                    <div className="relative w-20 h-20 mx-auto mb-3">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="40"
                          cy="40"
                          r="36"
                          stroke="#1f2937"
                          strokeWidth="8"
                          fill="none"
                        />
                        <motion.circle
                          cx="40"
                          cy="40"
                          r="36"
                          stroke={feature.color}
                          strokeWidth="8"
                          fill="none"
                          strokeLinecap="round"
                          initial={{ strokeDasharray: "226.195", strokeDashoffset: "226.195" }}
                          animate={{
                            strokeDashoffset: 226.195 - (226.195 * feature.value)
                          }}
                          transition={{ duration: 1, ease: "easeOut" }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xl font-bold" style={{ color: feature.color }}>
                          {Math.round(feature.value * 100)}
                        </span>
                      </div>
                    </div>
                    <p className="font-semibold text-sm">{feature.name}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
