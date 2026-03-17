'use client';

import { motion } from 'framer-motion';

export function PackOpeningAnimation() {
  const cards = [0, 1, 2, 3, 4];
  return (
    <div className="relative mx-auto h-[380px] w-[320px]">
      {cards.map((i) => (
        <motion.div
          key={i}
          className="absolute left-1/2 top-1/2 h-[260px] w-[180px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-emerald-300/30 bg-gradient-to-b from-emerald-300/15 to-cyan-400/15 p-4 shadow-2xl"
          initial={{ rotate: -10 + i * 4, x: -50 + i * 25, y: 30 - i * 8 }}
          animate={{ y: [4, -4, 4] }}
          transition={{ repeat: Infinity, duration: 3 + i * 0.3, ease: 'easeInOut' }}
        >
          <div className="grid-fade h-full rounded-xl border border-white/20" />
        </motion.div>
      ))}
    </div>
  );
}
