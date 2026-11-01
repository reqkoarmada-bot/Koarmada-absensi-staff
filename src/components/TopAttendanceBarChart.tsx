import React from 'react';
import { MemberMonthlyAttendance } from '../types/attendance';

interface TopAttendanceBarChartProps {
  stats: MemberMonthlyAttendance[];
  targetRoleName?: string;
  monthLabel?: string;
}

export const TopAttendanceBarChart: React.FC<TopAttendanceBarChartProps> = ({
  stats,
  targetRoleName = 'Koarmada Member',
  monthLabel = 'Bulan Oktober 2026',
}) => {
  // Sort strictly by highest attendance descending
  const sorted = [...stats].sort((a, b) => b.presentCount - a.presentCount);
  const topStats = sorted.slice(0, 5);

  // Maximum value for the scale
  const maxRecorded = Math.max(...topStats.map((s) => s.presentCount), 0);
  const chartMax = Math.max(24, Math.ceil((maxRecorded || 24) / 6) * 6);

  // Ticks: 0, 6, 12, 18, 24 (or 4 intervals)
  const step = chartMax / 4;
  const ticks = [0, step, step * 2, step * 3, chartMax];

  return (
    <div className="bg-[#0f1422] border border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Top Presensi Terbanyak
          </h3>
          <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-800/60 font-mono">
            Role: {targetRoleName}
          </span>
        </div>
        <span className="text-[11px] text-slate-400 font-mono font-medium">{monthLabel}</span>
      </div>

      <div className="space-y-3.5 relative">
        {topStats.length === 0 || maxRecorded === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500 font-mono">
            Belum ada data presensi yang tercatat untuk {monthLabel}
          </div>
        ) : (
          topStats.map(({ member, presentCount }) => {
            // Precise percentage based on chartMax
            const percentage =
              presentCount > 0 ? Math.min(100, Math.max(4, (presentCount / chartMax) * 100)) : 0;

            return (
              <div
                key={member.id}
                className="grid grid-cols-[130px_1fr] sm:grid-cols-[170px_1fr] items-center gap-3"
              >
                <div
                  className="text-xs text-slate-300 font-mono truncate"
                  title={`${member.name} (@${member.username})`}
                >
                  {member.name}
                </div>

                {/* Bar track */}
                <div className="relative h-7 bg-slate-900/60 rounded-xl overflow-hidden border border-slate-800/90 flex items-center">
                  {/* Vertical tick guide lines inside the track */}
                  <div className="absolute inset-0 flex justify-between pointer-events-none px-[1px]">
                    {ticks.map((_, i) => (
                      <div key={i} className="h-full border-r border-slate-800/40 w-0" />
                    ))}
                  </div>

                  {/* Animated colored bar */}
                  {presentCount > 0 ? (
                    <div
                      className="h-full bg-[#5865F2] hover:bg-[#4752c4] rounded-lg transition-all duration-300 flex items-center justify-end pr-2.5 shadow-sm relative z-10"
                      style={{ width: `${percentage}%` }}
                    >
                      <span className="text-xs font-bold text-white font-mono tabular-nums drop-shadow-sm">
                        {presentCount}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-600 font-mono pl-3 relative z-10">0</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* X-Axis Scale (0  6  12  18  24) */}
      <div className="grid grid-cols-[130px_1fr] sm:grid-cols-[170px_1fr] items-center gap-3 mt-3 pt-2.5 border-t border-slate-800/80 text-[10px] text-slate-400 font-mono">
        <div className="text-slate-500 text-[10px]">Skala Hari</div>
        <div className="flex justify-between px-1">
          {ticks.map((val) => (
            <span key={val} className="tabular-nums">
              {val}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
