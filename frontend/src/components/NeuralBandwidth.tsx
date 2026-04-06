import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity } from 'lucide-react';
import { api } from '../services/api';
import type { CapacityData } from '../services/api';

const SEGMENT_COUNT = 20;

interface NeuralBandwidthProps {
  /** Trigger a re-fetch from the outside (e.g. when a task is added) */
  refreshKey?: number;
}

export function NeuralBandwidth({ refreshKey }: NeuralBandwidthProps) {
  const [data, setData] = useState<CapacityData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api.getCapacity()
      .then((d) => { if (mounted) { setData(d); setLoading(false); } })
      .catch(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [refreshKey]);

  const ratio = data ? Math.min(data.current_load / data.max_capacity, 1) : 0;
  const filledSegments = Math.round(ratio * SEGMENT_COUNT);

  // Status-based colour palette
  const isOverload = data?.status === 'Overload';
  const isHigh = data?.status === 'High';
  const activeColor = isOverload
    ? '#dc143c'            // Scarlet
    : isHigh
    ? '#ff8c00'            // Orange
    : '#22c55e';           // Green

  const glowColor = isOverload
    ? 'rgba(220,20,60,0.35)'
    : isHigh
    ? 'rgba(255,140,0,0.30)'
    : 'rgba(34,197,94,0.20)';

  const statusLabel = data?.status ?? '—';
  const pct = Math.round(ratio * 100);

  return (
    <div
      className="rounded-2xl border p-4 mb-4 relative overflow-hidden"
      style={{
        background: 'rgba(10,10,10,0.7)',
        borderColor: isOverload
          ? 'rgba(220,20,60,0.30)'
          : isHigh
          ? 'rgba(255,140,0,0.25)'
          : 'rgba(255,255,255,0.05)',
        boxShadow: isOverload || isHigh ? `0 0 24px ${glowColor}` : 'none',
        transition: 'box-shadow 0.4s, border-color 0.4s',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity
            size={12}
            strokeWidth={2.5}
            style={{ color: activeColor, transition: 'color 0.4s' }}
          />
          <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">
            Neural Bandwidth
          </span>
        </div>
        <AnimatePresence mode="wait">
          <motion.span
            key={statusLabel}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.2 }}
            className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
            style={{
              color: activeColor,
              background: `${activeColor}1A`,
              border: `1px solid ${activeColor}40`,
            }}
          >
            {statusLabel}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Segmented bar */}
      {loading ? (
        <div className="h-2.5 rounded-full bg-white/[0.04] animate-pulse" />
      ) : (
        <div className="flex gap-[3px] h-2.5">
          {Array.from({ length: SEGMENT_COUNT }).map((_, i) => {
            const filled = i < filledSegments;
            return (
              <motion.div
                key={i}
                className="flex-1 rounded-full"
                animate={{
                  backgroundColor: filled ? activeColor : 'rgba(255,255,255,0.05)',
                  opacity: filled ? 1 : 0.4,
                }}
                transition={{ duration: 0.35, delay: i * 0.018 }}
                style={{
                  boxShadow: filled && (isOverload || isHigh)
                    ? `0 0 6px ${glowColor}`
                    : 'none',
                }}
              />
            );
          })}
        </div>
      )}

      {/* Footer metrics */}
      <div className="flex justify-between mt-2.5">
        <span className="text-[9px] text-neutral-600 font-bold">
          {loading ? '…' : `${data?.current_load ?? 0} / ${data?.max_capacity ?? 40} pts`}
        </span>
        <motion.span
          key={pct}
          animate={{ opacity: [0.6, 1] }}
          transition={{ duration: 0.3 }}
          className="text-[9px] font-black"
          style={{ color: activeColor }}
        >
          {loading ? '' : `${pct}%`}
        </motion.span>
      </div>

      {/* Pulse overlay when overloaded */}
      {isOverload && (
        <motion.div
          className="absolute inset-0 pointer-events-none rounded-2xl"
          animate={{ opacity: [0, 0.12, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          style={{ background: 'radial-gradient(ellipse at center, #dc143c 0%, transparent 70%)' }}
        />
      )}
    </div>
  );
}
