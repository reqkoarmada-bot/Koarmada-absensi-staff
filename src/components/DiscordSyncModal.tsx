import React, { useState } from 'react';
import { Member, BotConfig, AttendanceDay } from '../types/attendance';
import {
  X,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Hash,
  MessageSquare,
  Sparkles,
  ClipboardPaste,
  ShieldCheck,
} from 'lucide-react';

interface DiscordSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: BotConfig;
  members: Member[];
  selectedDate: string;
  onSyncComplete: (day: AttendanceDay) => void;
}

export const DiscordSyncModal: React.FC<DiscordSyncModalProps> = ({
  isOpen,
  onClose,
  config,
  members,
  selectedDate,
  onSyncComplete,
}) => {
  const [syncTab, setSyncTab] = useState<'bot' | 'paste' | 'simulate'>('bot');
  const [channelId, setChannelId] = useState<string>(config.channelId || '');
  const [messageIdOrUrl, setMessageIdOrUrl] = useState<string>('');
  const [emoji, setEmoji] = useState<string>(config.requiredEmoji || '✅');

  // Status
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Recent messages in channel
  const [recentMessages, setRecentMessages] = useState<any[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);

  // Manual paste
  const [pastedText, setPastedText] = useState<string>('');

  if (!isOpen) return null;

  const parseMessageId = (input: string) => {
    const clean = input.trim();
    const urlMatch = clean.match(/discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)/);
    if (urlMatch) {
      return { channelId: urlMatch[2], messageId: urlMatch[3] };
    }
    return { messageId: clean };
  };

  // Load recent channel messages
  const handleFetchMessages = async () => {
    if (!config.botToken.trim() || !channelId.trim()) {
      setErrorMsg('Bot Token dan Channel ID wajib diisi di Konfigurasi');
      return;
    }

    setIsLoadingMessages(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/discord/channel-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: config.botToken.trim(), channelId: channelId.trim(), limit: 10 }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setRecentMessages(data.messages);
      } else {
        setErrorMsg(data.error || 'Gagal membaca pesan channel');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Gagal menghubungi server');
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Sync with Discord API
  const handleSyncWithDiscord = async (overrideMsgId?: string) => {
    const parsed = parseMessageId(overrideMsgId || messageIdOrUrl);
    const targetChannel = parsed.channelId || channelId.trim();
    const targetMsg = parsed.messageId;

    if (!config.botToken.trim()) {
      setErrorMsg('Bot Token belum diisi di menu Konfigurasi Bot');
      return;
    }
    if (!targetChannel) {
      setErrorMsg('Channel ID absensi wajib diisi');
      return;
    }
    if (!targetMsg) {
      setErrorMsg('Message ID atau URL pesan absensi wajib diisi');
      return;
    }

    setIsSyncing(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/discord/fetch-reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: config.botToken.trim(),
          channelId: targetChannel,
          messageId: targetMsg,
          emoji: emoji.trim() || '✅',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Gagal mengambil reaksi dari Discord');
      }

      const reactedUsers: Array<{ id: string; username: string }> = data.users || [];
      const reactedIdSet = new Set(reactedUsers.map((u) => u.id));
      const reactedUsernameSet = new Set(reactedUsers.map((u) => u.username.toLowerCase()));

      const targetRoleLower = (config.targetRole || 'koarmada member').toLowerCase().trim();
      const eligibleMembers = members.filter((m) => {
        if (!m.roles || m.roles.length === 0) return true;
        return m.roles.some((r) => r.toLowerCase().includes(targetRoleLower) || targetRoleLower.includes(r.toLowerCase()));
      });

      const presentIds: string[] = [];
      eligibleMembers.forEach((m) => {
        const isPresentById = m.discordId && reactedIdSet.has(m.discordId);
        const isPresentByUsername = reactedUsernameSet.has(m.username.toLowerCase());
        if (isPresentById || isPresentByUsername) {
          presentIds.push(m.id);
        }
      });

      const newDay: AttendanceDay = {
        date: selectedDate,
        presentIds,
        syncedAt: new Date().toISOString(),
        messageId: targetMsg,
      };

      onSyncComplete(newDay);
      setSuccessMsg(
        `Sukses! Ditemukan ${reactedUsers.length} total reaksi. ${presentIds.length} dari ${eligibleMembers.length} personil role "${config.targetRole || 'Koarmada Member'}" ditandai Hadir.`
      );
      setTimeout(() => onClose(), 1500);
    } catch (e: any) {
      setErrorMsg(e.message || 'Gagal sinkronisasi');
    } finally {
      setIsSyncing(false);
    }
  };

  // Sync via manual paste
  const handleSyncPaste = () => {
    if (!pastedText.trim()) {
      setErrorMsg('Tempelkan daftar username atau tag yang absen');
      return;
    }

    const tokens = pastedText
      .split(/[\n,;\t]+/)
      .map((s) => s.replace(/[@<>\s]/g, '').toLowerCase().trim())
      .filter(Boolean);

    const tokenSet = new Set(tokens);
    const targetRoleLower = (config.targetRole || 'koarmada member').toLowerCase().trim();
    const eligibleMembers = members.filter((m) => {
      if (!m.roles || m.roles.length === 0) return true;
      return m.roles.some((r) => r.toLowerCase().includes(targetRoleLower) || targetRoleLower.includes(r.toLowerCase()));
    });

    const presentIds: string[] = [];

    eligibleMembers.forEach((m) => {
      const byUser = tokenSet.has(m.username.toLowerCase());
      const byId = m.discordId && tokenSet.has(m.discordId);
      const byName = tokenSet.has(m.name.toLowerCase().replace(/\s+/g, ''));
      if (byUser || byId || byName) {
        presentIds.push(m.id);
      }
    });

    const newDay: AttendanceDay = {
      date: selectedDate,
      presentIds,
      syncedAt: new Date().toISOString(),
    };

    onSyncComplete(newDay);
    setSuccessMsg(`Berhasil! ${presentIds.length} dari ${eligibleMembers.length} personil role "${config.targetRole || 'Koarmada Member'}" ditandai Hadir.`);
    setTimeout(() => onClose(), 1200);
  };

  // Instant simulation
  const handleSimulate = () => {
    // 80% attendance
    const presentIds = members
      .filter((_, idx) => (idx * 5 + 3) % 10 < 8)
      .map((m) => m.id);

    const newDay: AttendanceDay = {
      date: selectedDate,
      presentIds,
      syncedAt: new Date().toISOString(),
    };

    onSyncComplete(newDay);
    setSuccessMsg(`Simulasi selesai! ${presentIds.length} personil hadir hari ini.`);
    setTimeout(() => onClose(), 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0f1422] border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-indigo-400" />
              <span>Sinkronkan Reaksi Absensi</span>
            </h2>
            <p className="text-xs text-slate-400">
              Ambil data yang react untuk tanggal {selectedDate}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-6 pt-3 gap-2">
          <button
            onClick={() => setSyncTab('bot')}
            className={`pb-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              syncTab === 'bot'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Koneksi Bot Discord</span>
          </button>

          <button
            onClick={() => setSyncTab('paste')}
            className={`pb-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              syncTab === 'paste'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ClipboardPaste className="w-4 h-4" />
            <span>Tempel Manual</span>
          </button>

          <button
            onClick={() => setSyncTab('simulate')}
            className={`pb-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              syncTab === 'simulate'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Simulasi Demo</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 flex-1">
          {successMsg && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* TAB 1: BOT SYNC */}
          {syncTab === 'bot' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5 text-slate-400" />
                    <span>Channel ID</span>
                  </label>
                  <input
                    type="text"
                    value={channelId}
                    onChange={(e) => setChannelId(e.target.value)}
                    placeholder="112233445566778899"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Emoji Absensi</label>
                  <input
                    type="text"
                    value={emoji}
                    onChange={(e) => setEmoji(e.target.value)}
                    placeholder="✅"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 text-center font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                    <span>Message ID atau Link Pesan Absensi</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleFetchMessages}
                    disabled={isLoadingMessages}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 hover:underline"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingMessages ? 'animate-spin' : ''}`} />
                    <span>Tampilkan Pesan Channel</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={messageIdOrUrl}
                  onChange={(e) => setMessageIdOrUrl(e.target.value)}
                  placeholder="Tempel link pesan (https://discord.com/channels/...) atau ID"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono"
                />

                {recentMessages.length > 0 && (
                  <div className="mt-2 space-y-1.5 max-h-36 overflow-y-auto p-2 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-[11px] text-slate-400 font-semibold block px-1">
                      Pilih pesan absensi hari ini:
                    </span>
                    {recentMessages.map((msg: any) => (
                      <div
                        key={msg.id}
                        onClick={() => {
                          setMessageIdOrUrl(msg.id);
                          if (msg.reactions?.[0]?.name) setEmoji(msg.reactions[0].name);
                        }}
                        className={`p-2 rounded-lg text-xs cursor-pointer border transition-colors ${
                          messageIdOrUrl === msg.id
                            ? 'bg-indigo-950/60 border-indigo-500 text-white'
                            : 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="line-clamp-1">{msg.content || '(Pesan Embed / Gambar)'}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          ID: {msg.id} · Reaksi: {msg.reactions?.length || 0}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: MANUAL PASTE */}
          {syncTab === 'paste' && (
            <div className="space-y-2">
              <label className="text-xs text-slate-300 block">
                Salin nama atau handle dari Discord, lalu tempel di sini:
              </label>
              <textarea
                rows={5}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="pandunothuman&#10;hanzxtzy&#10;mtchaboy.&#10;odroger_rp"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono"
              />
            </div>
          )}

          {/* TAB 3: SIMULATE */}
          {syncTab === 'simulate' && (
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs text-slate-300">
              <div className="font-semibold text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>Simulasi Otomatis</span>
              </div>
              <p className="text-slate-400">
                Sistem akan secara acak mensimulasikan reaksi kehadiran hari ini (~80% hadir) untuk menguji fitur tanpa bot.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
          >
            Tutup
          </button>

          {syncTab === 'bot' && (
            <button
              type="button"
              onClick={() => handleSyncWithDiscord()}
              disabled={isSyncing}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Mengambil Reaksi...' : 'Ambil Reaksi Sekarang'}</span>
            </button>
          )}

          {syncTab === 'paste' && (
            <button
              type="button"
              onClick={handleSyncPaste}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md"
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span>Proses Input Tempel</span>
            </button>
          )}

          {syncTab === 'simulate' && (
            <button
              type="button"
              onClick={handleSimulate}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Jalankan Simulasi Hari Ini</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
