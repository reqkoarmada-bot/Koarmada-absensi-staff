import React, { useState, useMemo, useEffect } from 'react';
import { Member, AttendanceDay, MemberMonthlyAttendance, BotConfig } from '../types/attendance';
import { TopAttendanceBarChart } from './TopAttendanceBarChart';
import { CalendarDotMatrix } from './CalendarDotMatrix';
import {
  Search,
  Download,
  Copy,
  Check,
  Send,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  ArrowUpDown,
  TrendingUp,
  AlertTriangle,
  Award,
} from 'lucide-react';

interface MonthlyCalendarViewProps {
  members: Member[];
  days: Record<string, AttendanceDay>;
  config: BotConfig;
  currentYear: number;
  currentMonth: number;
  onMonthChange: (year: number, month: number) => void;
  onOpenDMModal: (recipient: Member) => void;
  onPopulateMonth?: (newDays: Record<string, AttendanceDay>) => void;
}

const MONTHS = [
  { value: 1, label: 'Januari' },
  { value: 2, label: 'Februari' },
  { value: 3, label: 'Maret' },
  { value: 4, label: 'April' },
  { value: 5, label: 'Mei' },
  { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' },
  { value: 8, label: 'Agustus' },
  { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' },
  { value: 12, label: 'Desember' },
];

export const MonthlyCalendarView: React.FC<MonthlyCalendarViewProps> = ({
  members,
  days,
  config,
  currentYear,
  currentMonth,
  onMonthChange,
  onOpenDMModal,
  onPopulateMonth,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedSheets, setCopiedSheets] = useState(false);
  const [sortBy, setSortBy] = useState<'most' | 'least' | 'name'>('most');

  // Days in selected month
  const daysInMonth = useMemo(() => new Date(currentYear, currentMonth, 0).getDate(), [currentYear, currentMonth]);
  const selectedMonthObj = MONTHS.find((m) => m.value === currentMonth) || MONTHS[9];
  const monthName = selectedMonthObj.label;
  const monthPrefix = `${currentYear}-${currentMonth.toString().padStart(2, '0')}`;

  // Filter strictly by targetRole (e.g. "Koarmada Member")
  const targetRoleLower = (config.targetRole || 'koarmada member').toLowerCase().trim();
  const eligibleMembers = useMemo(() => {
    return members.filter((m) => {
      if (!m.roles || m.roles.length === 0) return true;
      return m.roles.some(
        (r) => r.toLowerCase().includes(targetRoleLower) || targetRoleLower.includes(r.toLowerCase())
      );
    });
  }, [members, targetRoleLower]);

  // Ensure this month has data populated; if completely missing in `days`, generate it
  useEffect(() => {
    const hasData = Object.keys(days).some((k) => k.startsWith(monthPrefix));
    if (!hasData && onPopulateMonth && eligibleMembers.length > 0) {
      const newMonthRecords: Record<string, AttendanceDay> = {};
      const totalDays = new Date(currentYear, currentMonth, 0).getDate();

      // Create deterministic realistic attendances for this month
      for (let d = 1; d <= totalDays; d++) {
        const dStr = d.toString().padStart(2, '0');
        const dateKey = `${monthPrefix}-${dStr}`;
        const presentIds: string[] = [];

        eligibleMembers.forEach((m, idx) => {
          const target = Math.min(totalDays - 1, Math.max(7, 26 - ((idx * 3 + currentMonth * 5) % 15)));
          const hash = Math.abs(Math.sin(d * 13 + (idx + 1) * 19 + currentMonth * 29));
          if (hash <= target / totalDays) {
            presentIds.push(m.id);
          }
        });

        newMonthRecords[dateKey] = {
          date: dateKey,
          presentIds,
          syncedAt: `${dateKey}T20:00:00Z`,
        };
      }

      onPopulateMonth(newMonthRecords);
    }
  }, [currentYear, currentMonth, monthPrefix, days, eligibleMembers, onPopulateMonth]);

  // Calculate monthly stats strictly for members with target role for THIS specific month
  const monthlyStats: MemberMonthlyAttendance[] = useMemo(() => {
    return eligibleMembers.map((member) => {
      let presentCount = 0;
      const dayPresence: boolean[] = [];

      for (let d = 1; d <= daysInMonth; d++) {
        const dayStr = d.toString().padStart(2, '0');
        const dateKey = `${monthPrefix}-${dayStr}`;
        const session = days[dateKey];
        const isPresent = session ? session.presentIds.includes(member.id) : false;

        if (isPresent) presentCount++;
        dayPresence.push(isPresent);
      }

      return {
        member,
        presentCount,
        absentCount: daysInMonth - presentCount,
        totalDays: daysInMonth,
        dayPresence,
      };
    });
  }, [eligibleMembers, days, daysInMonth, monthPrefix]);

  // Filter by search query
  const searchFiltered = useMemo(() => {
    if (!searchQuery.trim()) return monthlyStats;
    const q = searchQuery.toLowerCase();
    return monthlyStats.filter(({ member }) => {
      return (
        member.name.toLowerCase().includes(q) ||
        member.username.toLowerCase().includes(q) ||
        member.discordId.includes(q)
      );
    });
  }, [monthlyStats, searchQuery]);

  // Strictly accurate sorting
  const sortedStats = useMemo(() => {
    return [...searchFiltered].sort((a, b) => {
      if (sortBy === 'most') {
        // High to Low
        if (b.presentCount !== a.presentCount) {
          return b.presentCount - a.presentCount;
        }
        return a.member.name.localeCompare(b.member.name);
      }
      if (sortBy === 'least') {
        // Low to High (fewest presence / most alpha at top)
        if (a.presentCount !== b.presentCount) {
          return a.presentCount - b.presentCount;
        }
        return a.member.name.localeCompare(b.member.name);
      }
      return a.member.name.localeCompare(b.member.name);
    });
  }, [searchFiltered, sortBy]);

  // High-level statistics for this month
  const totalPresenceAll = monthlyStats.reduce((acc, curr) => acc + curr.presentCount, 0);
  const averageAttendance =
    monthlyStats.length > 0 && daysInMonth > 0
      ? Math.round((totalPresenceAll / (monthlyStats.length * daysInMonth)) * 100)
      : 0;

  const highestPresence = Math.max(...monthlyStats.map((s) => s.presentCount), 0);
  const lowestPresence = Math.min(...monthlyStats.map((s) => s.presentCount), 0);

  // Month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      onMonthChange(currentYear - 1, 12);
    } else {
      onMonthChange(currentYear, currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      onMonthChange(currentYear + 1, 1);
    } else {
      onMonthChange(currentYear, currentMonth + 1);
    }
  };

  // Copy TSV to clipboard for Google Sheets
  const handleCopySheets = async () => {
    const headers = [
      'Peringkat',
      'Nama Anggota',
      'Username Discord',
      'Role',
      `Hadir (${monthName})`,
      `Alpha (${monthName})`,
      'Persentase',
    ];
    const rows = sortedStats.map((s, idx) => [
      idx + 1,
      s.member.name,
      `@${s.member.username}`,
      config.targetRole || 'Koarmada Member',
      s.presentCount,
      s.absentCount,
      `${Math.round((s.presentCount / daysInMonth) * 100)}%`,
    ]);
    const tsv = [headers.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n');
    try {
      await navigator.clipboard.writeText(tsv);
      setCopiedSheets(true);
      setTimeout(() => setCopiedSheets(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Peringkat',
      'Nama Anggota',
      'Username Discord',
      'Discord ID',
      'Role',
      `Hadir (${monthName})`,
      `Alpha (${monthName})`,
      'Persentase Kehadiran',
    ];
    const rows = sortedStats.map((s, idx) => [
      idx + 1,
      `"${s.member.name.replace(/"/g, '""')}"`,
      `"${s.member.username.replace(/"/g, '""')}"`,
      `"${s.member.discordId}"`,
      `"${config.targetRole || 'Koarmada Member'}"`,
      s.presentCount,
      s.absentCount,
      `"${Math.round((s.presentCount / daysInMonth) * 100)}%"`,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rekap_Absensi_${config.targetRole.replace(/\s+/g, '_')}_${monthName}_${currentYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Month Selector Bar & Year Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 bg-[#0f1422] border border-slate-800 rounded-2xl shadow-lg">
        {/* Month Selector Dropdown & Chevron Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-950 p-1 border border-slate-800 rounded-xl text-slate-300">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
              title="Bulan Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 px-2">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <select
                value={currentMonth}
                onChange={(e) => onMonthChange(currentYear, parseInt(e.target.value, 10))}
                className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer py-1 pr-1 font-mono"
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value} className="bg-slate-900 text-slate-200">
                    {m.label} ({new Date(currentYear, m.value, 0).getDate()} hari)
                  </option>
                ))}
              </select>

              <select
                value={currentYear}
                onChange={(e) => onMonthChange(parseInt(e.target.value, 10), currentMonth)}
                className="bg-transparent text-xs font-bold text-slate-300 focus:outline-none cursor-pointer py-1 font-mono"
              >
                {[2025, 2026, 2027].map((y) => (
                  <option key={y} value={y} className="bg-slate-900 text-slate-200">
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
              title="Bulan Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <span className="text-xs text-indigo-400 font-mono">
            Role: @{config.targetRole || 'Koarmada Member'} ({eligibleMembers.length} Personil)
          </span>
        </div>

        {/* Sorting Controls: Terbanyak vs Tersedikit */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Urutkan Berdasarkan:</span>
          <div className="flex items-center bg-slate-950 p-1 border border-slate-800 rounded-xl text-xs">
            <button
              onClick={() => setSortBy('most')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                sortBy === 'most'
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Urutkan dari presensi tertinggi ke terendah"
            >
              <ArrowDownWideNarrow className="w-3.5 h-3.5" />
              <span>Hadir Terbanyak</span>
            </button>

            <button
              onClick={() => setSortBy('least')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                sortBy === 'least'
                  ? 'bg-rose-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-rose-300'
              }`}
              title="Urutkan dari presensi tersedikit / paling sering alpha ke atas"
            >
              <ArrowUpNarrowWide className="w-3.5 h-3.5" />
              <span>Tersedikit (Banyak Alpha)</span>
            </button>

            <button
              onClick={() => setSortBy('name')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                sortBy === 'name'
                  ? 'bg-slate-800 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>Nama A–Z</span>
            </button>
          </div>
        </div>
      </div>

      {/* Month KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-[#0f1422] border border-slate-800 rounded-2xl">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>Rata-Rata Kehadiran {monthName}</span>
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-indigo-400 tabular-nums">
              {averageAttendance}%
            </span>
            <span className="text-xs text-slate-500 font-mono">({daysInMonth} hari)</span>
          </div>
        </div>

        <div className="p-4 bg-[#0f1422] border border-slate-800 rounded-2xl">
          <div className="text-xs text-emerald-400 flex items-center justify-between">
            <span>Presensi Tertinggi ({monthName})</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
              {highestPresence}
            </span>
            <span className="text-xs text-slate-500 font-mono">hari hadir</span>
          </div>
        </div>

        <div className="p-4 bg-[#0f1422] border border-slate-800 rounded-2xl">
          <div className="text-xs text-rose-400 flex items-center justify-between">
            <span>Presensi Terendah ({monthName})</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-rose-400 tabular-nums">
              {lowestPresence}
            </span>
            <span className="text-xs text-slate-500 font-mono">
              (Alpha: {daysInMonth - lowestPresence} hari)
            </span>
          </div>
        </div>
      </div>

      {/* Top Section: Horizontal Bar Chart Matching Screenshot 1 */}
      <TopAttendanceBarChart
        stats={monthlyStats}
        targetRoleName={config.targetRole || 'Koarmada Member'}
        monthLabel={`Bulan ${monthName} ${currentYear}`}
      />

      {/* Main Table Card Matching Screenshot 1 & 2 */}
      <div className="bg-[#0f1422] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {/* Table Controls */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-950/40">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <span>
                Rekapitulasi {monthName} {currentYear}
              </span>
            </span>
            <span className="text-xs text-indigo-400 font-mono">
              ({sortedStats.length} Personil ·{' '}
              {sortBy === 'most'
                ? 'Urut Hadir Terbanyak'
                : sortBy === 'least'
                ? 'Urut Hadir Tersedikit'
                : 'Urut Nama'}
              )
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari anggota..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              onClick={handleCopySheets}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-xs font-medium text-slate-200 rounded-lg border border-slate-800 transition-colors"
              title="Salin untuk Google Sheets"
            >
              {copiedSheets ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Salin ke Sheets</span>
                </>
              )}
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-xs font-medium text-slate-200 rounded-lg border border-slate-800 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Unduh CSV</span>
            </button>
          </div>
        </div>

        {/* Table Matching Screenshot 1 & 2 */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-950/60 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                <th className="py-3 px-3 sm:px-4 w-12 text-center font-mono">NO</th>
                <th className="py-3 px-4 sm:px-6">ANGGOTA</th>
                <th className="py-3 px-4 text-center">
                  <button
                    onClick={() => setSortBy(sortBy === 'most' ? 'least' : 'most')}
                    className="inline-flex items-center gap-1 text-slate-300 hover:text-white font-bold"
                    title="Klik untuk membalikkan urutan terbanyak/tersedikit"
                  >
                    <span>HADIR</span>
                    {sortBy === 'most' ? (
                      <ArrowDownWideNarrow className="w-3 h-3 text-indigo-400" />
                    ) : sortBy === 'least' ? (
                      <ArrowUpNarrowWide className="w-3 h-3 text-rose-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-4 sm:px-6">KALENDER {monthName.toUpperCase()}</th>
                <th className="py-3 px-4 text-right">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {sortedStats.map(({ member, presentCount, absentCount, dayPresence }, idx) => {
                const isVeryLow = presentCount <= Math.round(daysInMonth * 0.5);

                return (
                  <tr
                    key={member.id}
                    className={`transition-colors group ${
                      sortBy === 'least' && isVeryLow
                        ? 'hover:bg-rose-950/20 bg-rose-950/10'
                        : 'hover:bg-slate-900/50'
                    }`}
                  >
                    {/* Rank Number */}
                    <td className="py-3.5 px-3 sm:px-4 text-center font-mono text-slate-500 tabular-nums">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          sortBy === 'most' && idx === 0
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : sortBy === 'most' && idx < 3
                            ? 'bg-indigo-500/20 text-indigo-300'
                            : sortBy === 'least' && idx < 3
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'text-slate-500'
                        }`}
                      >
                        #{idx + 1}
                      </span>
                    </td>

                    {/* ANGGOTA: Avatar + Name + Username */}
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700/60 overflow-hidden flex items-center justify-center shrink-0">
                          {member.avatarUrl ? (
                            <img
                              src={member.avatarUrl}
                              alt={member.name}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <span className="text-xs font-bold text-slate-300">
                              {member.name.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-200 group-hover:text-white truncate flex items-center gap-1.5">
                            <span>{member.name}</span>
                            {isVeryLow && (
                              <span className="text-[10px] text-rose-400 font-mono">
                                (Alpha: {absentCount} hari)
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono truncate">
                            @{member.username} · ID: {member.discordId}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* HADIR: Tabular count with percentage */}
                    <td className="py-3.5 px-4 text-center font-mono tabular-nums">
                      <div className="text-base font-bold text-slate-100">
                        <span
                          className={
                            presentCount >= Math.round(daysInMonth * 0.75)
                              ? 'text-emerald-400'
                              : presentCount >= Math.round(daysInMonth * 0.5)
                              ? 'text-slate-100'
                              : 'text-rose-400'
                          }
                        >
                          {presentCount}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {Math.round((presentCount / daysInMonth) * 100)}% ({absentCount} alpha)
                      </div>
                    </td>

                    {/* KALENDER BULAN: Dot Matrix Matching Screenshot 1 */}
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="flex items-center gap-2">
                        <CalendarDotMatrix dayPresence={dayPresence} totalDays={daysInMonth} />
                      </div>
                    </td>

                    {/* AKSI: Kirim DM Peringatan */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => onOpenDMModal(member)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-lg border transition-colors ${
                          isVeryLow
                            ? 'bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border-rose-800/60'
                            : 'bg-indigo-950/40 hover:bg-indigo-900/60 text-indigo-300 border-indigo-800/60'
                        }`}
                        title="Kirim pesan DM peringatan langsung via Discord Bot"
                      >
                        <Send className="w-3 h-3 text-indigo-400" />
                        <span>Kirim DM</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
