'use client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import useSWR from 'swr';
import fetcher from '@/lib/fetcher';
import AnimatedCard from '@/components/AnimatedCard';
import Spinner from '@/components/Spinner';
import { motion } from 'framer-motion';

interface TasteEvolutionProps {
  months?: number;
}

export default function TasteEvolution({ months = 12 }: TasteEvolutionProps) {
  const { data: monthlyData, isLoading } = useSWR(
    `/api/stats/monthly-trends?months=${months}`,
    fetcher
  );

  const trends = monthlyData?.data || [];

  // Format month labels for display
  const formattedData = trends.map((item: any) => ({
    ...item,
    monthLabel: new Date(item.month + '-01').toLocaleDateString('en-US', {
      month: 'short',
      year: '2-digit',
    }),
  }));

  return (
    <AnimatedCard>
      <AnimatedCard.Header
        title="Taste Evolution"
        description="How your music taste has changed over time"
      />

      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Spinner size="lg" className="mx-auto mb-3" />
            <p className="text-[var(--color-text-secondary)] text-sm">Loading trends...</p>
          </div>
        </div>
      )}

      {!isLoading && formattedData.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">No trend data available yet</p>
          <p className="text-gray-500 text-sm mt-1">
            Listen to more music to see your taste evolution!
          </p>
        </div>
      )}

      {!isLoading && formattedData.length > 0 && (
        <>
          {/* Stats Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-[var(--color-bg-2)]/30 border border-[var(--color-border)]/20 rounded-lg p-4 hover:bg-[var(--color-bg-2)]/50 transition-all hover:scale-105"
            >
              <p className="text-[var(--color-text-secondary)] text-sm mb-1">Total Plays</p>
              <p className="text-2xl font-bold text-[var(--color-primary-safe)]">
                {formattedData.reduce((sum: number, m: any) => sum + m.totalPlays, 0)}
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-[var(--color-bg-2)]/30 border border-[var(--color-border)]/20 rounded-lg p-4 hover:bg-[var(--color-bg-2)]/50 transition-all hover:scale-105"
            >
              <p className="text-[var(--color-text-secondary)] text-sm mb-1">Avg Popularity</p>
              <p className="text-2xl font-bold text-[var(--color-accent-safe)]">
                {Math.round(
                  formattedData.reduce((sum: number, m: any) => sum + m.avgPopularity, 0) /
                    formattedData.length
                )}
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-[var(--color-bg-2)]/30 border border-[var(--color-border)]/20 rounded-lg p-4 hover:bg-[var(--color-bg-2)]/50 transition-all hover:scale-105"
            >
              <p className="text-[var(--color-text-secondary)] text-sm mb-1">Unique Artists</p>
              <p className="text-2xl font-bold text-[var(--color-vibrant-safe)]">
                {Math.max(...formattedData.map((m: any) => m.uniqueArtists))}
              </p>
              <p className="text-[var(--color-text-secondary)]/70 text-xs mt-1">Peak in a month</p>
            </motion.div>
          </div>

          {/* Chart */}
          <ResponsiveContainer width="100%" height={400}>
            <LineChart
              data={formattedData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="monthLabel"
                stroke="#9ca3af"
                style={{ fontSize: '12px' }}
              />
              <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#fff',
                }}
                labelStyle={{ color: '#9ca3af' }}
              />
              <Legend
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="line"
              />
              <Line
                type="monotone"
                dataKey="avgPopularity"
                stroke="#06b6d4"
                strokeWidth={3}
                name="Avg Popularity"
                dot={{ fill: '#06b6d4', r: 5 }}
                activeDot={{ r: 7 }}
              />
              <Line
                type="monotone"
                dataKey="uniqueArtists"
                stroke="#ec4899"
                strokeWidth={3}
                name="Unique Artists"
                dot={{ fill: '#ec4899', r: 5 }}
                activeDot={{ r: 7 }}
              />
              <Line
                type="monotone"
                dataKey="totalPlays"
                stroke="#8b5cf6"
                strokeWidth={3}
                name="Total Plays"
                dot={{ fill: '#8b5cf6', r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>

          {/* Insights */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-6 p-4 bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 rounded-lg"
          >
            <h3 className="text-lg font-semibold text-[var(--color-accent-safe)] mb-2">Insights</h3>
            <ul className="space-y-2 text-sm text-[var(--color-text-secondary)]">
              {formattedData.length > 1 && (
                <>
                  <li>
                    • Your average track popularity {
                      formattedData[formattedData.length - 1].avgPopularity >
                      formattedData[0].avgPopularity
                        ? 'increased'
                        : 'decreased'
                    } from {formattedData[0].avgPopularity} to{' '}
                    {formattedData[formattedData.length - 1].avgPopularity} over this period.
                  </li>
                  <li>
                    • You discovered {formattedData[formattedData.length - 1].uniqueArtists} unique
                    artists in {formattedData[formattedData.length - 1].monthLabel}.
                  </li>
                  <li>
                    • Your most active month was{' '}
                    {
                      formattedData.reduce((max: any, m: any) =>
                        m.totalPlays > max.totalPlays ? m : max
                      ).monthLabel
                    }{' '}
                    with{' '}
                    {
                      formattedData.reduce((max: any, m: any) =>
                        m.totalPlays > max.totalPlays ? m : max
                      ).totalPlays
                    }{' '}
                    plays.
                  </li>
                </>
              )}
            </ul>
          </motion.div>
        </>
      )}
    </AnimatedCard>
  );
}