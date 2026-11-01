import React from 'react';

interface CalendarDotMatrixProps {
  dayPresence: boolean[]; // array of length totalDays (true = attended, false = absent)
  totalDays?: number;
}

/**
 * Renders the mini dot-matrix grid shown in Screenshot 1
 * (green rounded dots for attended days, dark muted dots for absent days)
 */
export const CalendarDotMatrix: React.FC<CalendarDotMatrixProps> = ({
  dayPresence,
  totalDays = 31,
}) => {
  return (
    <div className="grid grid-flow-col grid-rows-5 gap-1 w-fit" title="Hijau: Hadir, Gelap: Tidak Hadir">
      {Array.from({ length: totalDays }, (_, i) => {
        const isPresent = dayPresence[i] ?? false;
        return (
          <div
            key={i}
            title={`Tgl ${i + 1}: ${isPresent ? 'Hadir' : 'Tidak Hadir'}`}
            className={`w-2.5 h-2.5 rounded-[3px] transition-colors ${
              isPresent
                ? 'bg-emerald-500 shadow-sm shadow-emerald-500/20'
                : 'bg-slate-800/80 border border-slate-700/40'
            }`}
          />
        );
      })}
    </div>
  );
};
