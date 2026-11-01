import React, { useState } from 'react';
import { Member, AttendanceDay, BotConfig } from '../types/attendance';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Send,
  UserCheck,
  UserX,
  Search,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
} from 'lucide-react';

interface DailyViewProps {
  selectedDate: string;
  onDateChange: (newDate: string) => void;
  members: Member[];
  session: AttendanceDay;
  config: BotConfig;
  onToggleStatus: (memberId: string) => void;
  onOpenSingleDM: (member: Member) => void;
  onOpenBatchDM: (absentMembers: Member[]) => void;
  onOpenSync: () => void;
}

export const DailyView: React.FC<DailyViewProps> = ({
  selectedDate,
  onDateChange,
  members,
  session,
  config,
  onToggleStatus,
  onOpenSingleDM,
  onOpenBatchDM,
  onOpenSync,
}) => {
  const [filter, setFilter] = useState<'all' | 'absent' | 'present'>('all');
  const [search, setSearch] = useState('');
  const [copiedPing, setCopiedPing] = useState(false);

  const targetRoleLower = (config.targetRole || 'koarmada member').toLowerCase().trim();
  const eligibleMembers = members.filter((m) => {
    if (!m.roles || m.roles.length === 0) return true;
    return m.roles.some((r) => r.toLowerCase().includes(targetRoleLower) || targetRoleLower.includes(r.toLowerCase()));
  });

  const presentIdSet = new Set(session.presentIds || []);

  const presentMembers = eligibleMembers.filter((m) => presentIdSet.has(m.id));
  const absentMembers = eligibleMembers.filter((m) => !presentIdSet.has(m.id));

  const filteredMembers = eligibleMembers.filter((m) => {
    const isPresent = presentIdSet.has(m.id);
    if (filter === 'present' && !isPresent) return false;
    if (filter === 'absent' && isPresent) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        m.name.toLowerCase().includes(q) ||
        m.username.toLowerCase().includes(q) ||
        m.discordId.includes(q)
      );
    }
    return true;
  });

  const handleShiftDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    onDateChange(d.toISOString().split('T')[0]);
  };

  const handleCopyTags = async () => {
    if (absentMembers.length === 0) return;
    const mentions = absentMembers
      .map((m) => (m.discordId ? `<@${m.discordId}>` : `@${m.username}`))
      .join(' ');
    const text = `⚠️ **PENGINGAT ABSENSI (${selectedDate})**\nHalo rekan yang belum absen:\n${mentions}\nSilakan react emoji \`${config.requiredEmoji}\` di #${config.channelName || 'absensi'} segera!`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPing(true);
      setTimeout(() => setCopiedPing(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const formattedDate = new Date(selectedDate).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Date Navigation & Primary DM Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <span className="text-xs text-indigo-400 font-mono">
            Channel: #{config.channelName || 'absensi-personel'} · Emoji: {config.requiredEmoji} · Khusus Role: @{config.targetRole || 'Koarmada Member'}
          </span>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>Presensi Harian</span>
            <span className="text-sm font-normal text-slate-400 font-mono">({selectedDate})</span>
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Date Picker Buttons */}
          <div className="flex items-center bg-[#0f1422] border border-slate-800 rounded-xl p-1 text-slate-300">
            <button
              onClick={() => handleShiftDate(-1)}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
              title="Hari Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>{formattedDate}</span>
            </div>
            <button
              onClick={() => handleShiftDate(1)}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
              title="Hari Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Kirim DM ke Semua yang Belum Absen */}
          {absentMembers.length > 0 && (
            <button
              onClick={() => onOpenBatchDM(absentMembers)}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all whitespace-nowrap shrink-0"
              title="Kirim pesan peringatan otomatis ke DM Discord semua anggota yang belum absen"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Kirim DM Peringatan ({absentMembers.length})</span>
            </button>
          )}

          <button
            onClick={handleCopyTags}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#0f1422] hover:bg-slate-800 text-slate-300 text-xs font-medium rounded-xl border border-slate-800 transition-colors"
          >
            {copiedPing ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedPing ? 'Tag Disalin!' : 'Salin Tag Discord'}</span>
          </button>

          <button
            onClick={onOpenSync}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sinkronkan Reaksi</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-[#0f1422] border border-slate-800 rounded-2xl">
          <div className="text-xs text-slate-400">Total Role @{config.targetRole || 'Koarmada Member'}</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white tabular-nums">
              {eligibleMembers.length}
            </span>
            <span className="text-xs text-slate-500">anggota</span>
          </div>
        </div>

        <div className="p-4 bg-[#0f1422] border border-slate-800 rounded-2xl">
          <div className="text-xs text-emerald-400 flex items-center justify-between">
            <span>Sudah Absen (Hadir)</span>
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
              {presentMembers.length}
            </span>
            <span className="text-xs font-mono text-emerald-500/80">
              ({eligibleMembers.length > 0 ? Math.round((presentMembers.length / eligibleMembers.length) * 100) : 0}%)
            </span>
          </div>
        </div>

        <div className="p-4 bg-[#0f1422] border border-slate-800 rounded-2xl">
          <div className="text-xs text-rose-400 flex items-center justify-between">
            <span>Belum Absen (Alpha)</span>
            <UserX className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-rose-400 tabular-nums">
              {absentMembers.length}
            </span>
            <span className="text-xs font-mono text-rose-500/80">
              ({eligibleMembers.length > 0 ? Math.round((absentMembers.length / eligibleMembers.length) * 100) : 0}%)
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 bg-[#0f1422] border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              filter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Semua ({members.length})
          </button>
          <button
            onClick={() => setFilter('absent')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              filter === 'absent'
                ? 'bg-rose-600 text-white'
                : 'text-rose-400 hover:text-rose-300'
            }`}
          >
            Belum Absen ({absentMembers.length})
          </button>
          <button
            onClick={() => setFilter('present')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              filter === 'present'
                ? 'bg-emerald-600 text-white'
                : 'text-emerald-400 hover:text-emerald-300'
            }`}
          >
            Sudah Hadir ({presentMembers.length})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau handle..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Main List Table */}
      <div className="bg-[#0f1422] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                <th className="py-3 px-4 sm:px-6">ANGGOTA</th>
                <th className="py-3 px-4">STATUS HARI INI</th>
                <th className="py-3 px-4 text-right">AKSI CEPAT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-12 text-center text-slate-500">
                    <AlertCircle className="w-5 h-5 mx-auto mb-2 text-slate-600" />
                    Tidak ada anggota yang cocok dengan filter saat ini.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => {
                  const isPresent = presentIdSet.has(member.id);

                  return (
                    <tr key={member.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-4 sm:px-6">
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
                          <div>
                            <div className="font-semibold text-slate-200">{member.name}</div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              @{member.username} · ID: {member.discordId}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {isPresent ? (
                          <div className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span>Hadir ({config.requiredEmoji})</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 text-rose-400 font-semibold">
                            <span className="w-2 h-2 rounded-full bg-rose-500" />
                            <span>Belum Absen (Alpha)</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          {!isPresent && (
                            <button
                              onClick={() => onOpenSingleDM(member)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-800/60 rounded-lg text-[11px] font-medium transition-colors"
                              title="Kirim pesan DM peringatan ke Discord user ini"
                            >
                              <Send className="w-3 h-3 text-rose-400" />
                              <span>Kirim DM</span>
                            </button>
                          )}

                          <button
                            onClick={() => onToggleStatus(member.id)}
                            className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 text-[11px] font-medium transition-colors"
                          >
                            {isPresent ? 'Jadikan Alpha' : 'Tandai Hadir'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
