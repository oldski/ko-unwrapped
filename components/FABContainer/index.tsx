'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import fetcher from '@/lib/fetcher';
import Drawer from '@/components/Drawer';
import CalendarHeatmap from '@/components/CalendarHeatmap';
import OnThisDay from '@/components/OnThisDay';
import { FaCalendar, FaHistory } from 'react-icons/fa';

type DrawerContent = 'calendar' | 'onThisDay' | null;

export default function FABContainer() {
  const [activeDrawer, setActiveDrawer] = useState<DrawerContent>(null);

  // Fetch summary stats for FAB previews
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 365);

  const { data: historyData } = useSWR(
    `/api/stats/history?start=${startDate.toISOString()}&limit=10000`,
    fetcher
  );

  const today = new Date();
  const monthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const { data: onThisDayData } = useSWR(
    `/api/stats/on-this-day?monthDay=${monthDay}`,
    fetcher
  );

  const totalPlays = historyData?.count || 0;
  const onThisDayCount = onThisDayData?.totalPlays || 0;
  const yearsTracked = onThisDayData?.years?.length || 0;

  const handleClose = () => setActiveDrawer(null);

  return (
    <>
      {/* FAB Buttons - Fixed Right Side (Desktop) / Bottom (Mobile/Tablet) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 lg:left-auto lg:right-6 lg:top-1/2 lg:translate-x-0 lg:translate-y-8 z-40 flex flex-row lg:flex-col gap-3 lg:gap-4">
        {/* Calendar FAB */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          onClick={() => setActiveDrawer('calendar')}
          className="w-[80px] h-[80px] lg:w-[100px] lg:h-[100px] rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-2 border-cyan-500/50 backdrop-blur-sm hover:border-cyan-400 transition-all shadow-lg hover:shadow-cyan-500/50 flex flex-col items-center justify-center gap-0.5 lg:gap-1 group"
        >
          <FaCalendar className="text-cyan-400 text-xl lg:text-2xl group-hover:scale-110 transition-transform" />
          <span className="text-[10px] lg:text-xs font-bold text-cyan-300">Calendar</span>
          {totalPlays > 0 && (
            <span className="hidden lg:block text-[10px] text-cyan-400/80 font-semibold">
              {totalPlays.toLocaleString()} plays
            </span>
          )}
        </motion.button>

        {/* On This Day FAB */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          onClick={() => setActiveDrawer('onThisDay')}
          className="w-[80px] h-[80px] lg:w-[100px] lg:h-[100px] rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-2 border-purple-500/50 backdrop-blur-sm hover:border-purple-400 transition-all shadow-lg hover:shadow-purple-500/50 flex flex-col items-center justify-center gap-0.5 lg:gap-1 group"
        >
          <FaHistory className="text-purple-400 text-xl lg:text-2xl group-hover:scale-110 transition-transform" />
          <span className="text-[10px] lg:text-xs font-bold text-purple-300">This Day</span>
          {onThisDayCount > 0 && yearsTracked > 0 && (
            <span className="hidden lg:block text-[10px] text-purple-400/80 font-semibold">
              {yearsTracked} {yearsTracked === 1 ? 'year' : 'years'}
            </span>
          )}
        </motion.button>
      </div>

      {/* Drawers */}
      <Drawer
        isOpen={activeDrawer === 'calendar'}
        onClose={handleClose}
        title="Listening Calendar"
      >
        <CalendarHeatmap />
      </Drawer>

      <Drawer
        isOpen={activeDrawer === 'onThisDay'}
        onClose={handleClose}
        title="On This Day"
      >
        <OnThisDay />
      </Drawer>
    </>
  );
}
