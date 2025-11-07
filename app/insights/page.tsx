'use client';

import Navigation from "@/app/components/Interface/Navigation";
import CalendarHeatmap from "@/app/components/CalendarHeatmap";
import TasteEvolution from "@/app/components/TasteEvolution";
import OnThisDay from "@/app/components/OnThisDay";
import ListeningStreaks from "@/app/components/ListeningStreaks";
import ExportData from "@/app/components/ExportData";
import { motion } from 'framer-motion';

export default function InsightsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black text-white p-8">
      <Navigation />
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-5xl font-bold mb-2">
            Your Listening
            <span className="text-cyan-500"> Insights</span>
          </h1>
          <p className="text-gray-400 text-lg">
            Deep dive into your music journey with historical data and trends
          </p>
        </motion.div>

        {/* Main Content Grid */}
        <div className="space-y-8">
          {/* Row 1: Calendar Heatmap (Full Width) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <CalendarHeatmap />
          </motion.div>

          {/* Row 2: Taste Evolution (Full Width) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <TasteEvolution months={12} />
          </motion.div>

          {/* Row 3: On This Day + Listening Streaks (Side by Side) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <OnThisDay />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <ListeningStreaks />
            </motion.div>
          </div>

          {/* Row 4: Export Data (Development Only) */}
          {process.env.NODE_ENV === 'development' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <ExportData />
            </motion.div>
          )}
        </div>

        {/* Footer Note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center text-gray-500 text-sm"
        >
          <p>All data is stored locally in your database and never shared with third parties.</p>
        </motion.div>
      </div>
    </div>
  );
}
