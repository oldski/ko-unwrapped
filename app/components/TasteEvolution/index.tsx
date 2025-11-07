'use client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import useSWR from 'swr';
import fetcher from '@/lib/fetcher';

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
    <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-cyan-400">Taste Evolution</h2>
        <p className="text-gray-400 text-sm mt-1">
          How your music taste has changed over time
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Loading trends...</p>
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
            <div className="bg-gray-800/50 rounded-lg p-4">
              <p className="text-gray-400 text-sm mb-1">Total Plays</p>
              <p className="text-2xl font-bold text-cyan-400">
                {formattedData.reduce((sum: number, m: any) => sum + m.totalPlays, 0)}
              </p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <p className="text-gray-400 text-sm mb-1">Avg Popularity</p>
              <p className="text-2xl font-bold text-purple-400">
                {Math.round(
                  formattedData.reduce((sum: number, m: any) => sum + m.avgPopularity, 0) /
                    formattedData.length
                )}
              </p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <p className="text-gray-400 text-sm mb-1">Unique Artists</p>
              <p className="text-2xl font-bold text-pink-400">
                {Math.max(...formattedData.map((m: any) => m.uniqueArtists))}
              </p>
              <p className="text-gray-500 text-xs mt-1">Peak in a month</p>
            </div>
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
          <div className="mt-6 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
            <h3 className="text-lg font-semibold text-cyan-400 mb-2">Insights</h3>
            <ul className="space-y-2 text-sm text-gray-300">
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
          </div>
        </>
      )}
    </div>
  );
}