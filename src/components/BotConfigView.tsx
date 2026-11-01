import React, { useState } from 'react';
import { BotConfig, Member } from '../types/attendance';
import {
  Save,
  ShieldCheck,
  RefreshCw,
  Check,
  AlertCircle,
  UserCheck,
  Users,
} from 'lucide-react';

interface BotConfigViewProps {
  config: BotConfig;
  onSaveConfig: (newConfig: BotConfig) => void;
  members: Member[];
  onImportMembers: (newMembers: Member[]) => void;
}

export const BotConfigView: React.FC<BotConfigViewProps> = ({
  config,
  onSaveConfig,
  members,
  onImportMembers,
}) => {
  const [botToken, setBotToken] = useState<string>(config.botToken || '');
  const [guildId, setGuildId] = useState<string>(config.guildId || '1265517041725603951');
  const [channelId, setChannelId] = useState<string>(config.channelId || '112233445566778899');
  const [channelName, setChannelName] = useState<string>(config.channelName || '📢 | absensi-personel');
  const [targetRole, setTargetRole] = useState<string>(config.targetRole || 'Koarmada Member');
  const [emoji, setEmoji] = useState<string>(config.requiredEmoji || '✅');
  const [dmTemplate, setDmTemplate] = useState<string>(config.dmWarningTemplate || '');

  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // Server roles
  const [serverRoles, setServerRoles] = useState<any[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState<boolean>(false);

  // Import members status
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const maskedToken = config.botToken
    ? `............${config.botToken.slice(-4)}`
    : 'Belum disimpan';

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig({
      botToken: botToken.trim() || config.botToken,
      guildId: guildId.trim(),
      channelId: channelId.trim(),
      channelName: channelName.trim(),
      targetRole: targetRole.trim() || 'Koarmada Member',
      requiredEmoji: emoji.trim() || '✅',
      dmWarningTemplate: dmTemplate.trim(),
    });

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleTestBot = async () => {
    const tokenToTest = botToken.trim() || config.botToken;
    if (!tokenToTest) {
      setTestResult({ ok: false, message: 'Masukkan Bot Token terlebih dahulu' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/discord/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenToTest }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setTestResult({
          ok: true,
          message: `Terhubung dengan Bot: ${data.bot.username}#${data.bot.discriminator || '0'}`,
        });
      } else {
        setTestResult({ ok: false, message: data.error || 'Token bot tidak valid' });
      }
    } catch (err: any) {
      setTestResult({ ok: false, message: err.message || 'Gagal menghubungi server proxy' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleFetchServerRoles = async () => {
    const tokenToUse = botToken.trim() || config.botToken;
    if (!tokenToUse || !guildId.trim()) {
      alert('Isi Token Bot dan Guild ID terlebih dahulu');
      return;
    }

    setIsLoadingRoles(true);
    try {
      const res = await fetch('/api/discord/guild-roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenToUse, guildId: guildId.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setServerRoles(data.roles || []);
      } else {
        alert(data.error || 'Gagal mengambil role dari server Discord');
      }
    } catch (e: any) {
      alert(e.message || 'Gagal menghubungi server');
    } finally {
      setIsLoadingRoles(false);
    }
  };

  const handleImportServerMembers = async () => {
    const tokenToUse = botToken.trim() || config.botToken;
    if (!tokenToUse || !guildId.trim()) {
      alert('Bot Token dan Guild ID wajib diisi untuk menarik member Discord');
      return;
    }

    setIsImporting(true);
    setImportStatus(null);
    try {
      const res = await fetch('/api/discord/guild-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: tokenToUse,
          guildId: guildId.trim(),
          targetRoleName: targetRole.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        const guildMembers = data.members;
        const newMembers: Member[] = guildMembers.map((gm: any, i: number) => ({
          id: `mem-${gm.id || i}`,
          discordId: gm.id,
          name: gm.displayName,
          username: gm.username,
          avatarUrl: gm.avatar
            ? `https://cdn.discordapp.com/avatars/${gm.id}/${gm.avatar}.png`
            : undefined,
          roles: [targetRole.trim()],
        }));

        if (newMembers.length > 0) {
          onImportMembers(newMembers);
          setImportStatus(
            `Berhasil menyinkronkan ${newMembers.length} personil yang memiliki role "${targetRole}"!`
          );
        } else {
          setImportStatus(`Tidak ditemukan member dengan role "${targetRole}" di server Discord.`);
        }
      } else {
        setImportStatus(data.error || 'Gagal mengambil member dari server');
      }
    } catch (e: any) {
      setImportStatus(e.message || 'Gagal menghubungi server');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Main Form Styled after Screenshot 3 */}
      <div className="bg-[#0f1422] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-indigo-500" />
            <span>Konfigurasi Bot</span>
          </h2>
          <span className="text-xs text-slate-500 font-mono">Discord REST v10</span>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {/* BOT TOKEN */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">
                BOT TOKEN{' '}
                <span className="text-slate-500 font-normal">
                  (tersimpan:{' '}
                  <span className="text-emerald-400 font-mono text-[11px]">{maskedToken}</span>)
                </span>
              </label>
              <button
                type="button"
                onClick={handleTestBot}
                disabled={isTesting}
                className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
                <span>{isTesting ? 'Menguji...' : 'Uji Koneksi Token'}</span>
              </button>
            </div>
            <input
              type="password"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              placeholder="Biarkan kosong bila tidak ingin mengubah"
              className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
            />
            {testResult && (
              <div
                className={`text-xs mt-1 flex items-center gap-1.5 ${
                  testResult.ok ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {testResult.ok ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>

          {/* GUILD ID */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              ID SERVER (GUILD ID)
            </label>
            <input
              type="text"
              value={guildId}
              onChange={(e) => setGuildId(e.target.value)}
              placeholder="1265517041725603951"
              className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono tabular-nums"
            />
          </div>

          {/* ROLE YANG WAJIB ABSEN */}
          <div className="space-y-1.5 p-3.5 bg-indigo-950/20 border border-indigo-900/50 rounded-xl">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-400" />
                <span>ROLE YANG WAJIB ABSEN</span>
              </label>
              <button
                type="button"
                onClick={handleFetchServerRoles}
                disabled={isLoadingRoles}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 underline flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingRoles ? 'animate-spin' : ''}`} />
                <span>Pilih dari Role Server</span>
              </button>
            </div>
            <input
              type="text"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="Koarmada Member"
              className="w-full px-4 py-2.5 bg-slate-950/90 border border-indigo-800/60 rounded-xl text-xs text-white font-semibold focus:outline-none focus:border-indigo-400"
            />
            {serverRoles.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-slate-950 rounded-lg border border-slate-800">
                {serverRoles.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setTargetRole(r.name)}
                    className={`px-2 py-1 text-[11px] rounded transition-colors ${
                      targetRole.toLowerCase() === r.name.toLowerCase()
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    @{r.name}
                  </button>
                ))}
              </div>
            )}
            <p className="text-[11px] text-slate-400 mt-1">
              Hanya anggota Discord yang memiliki role <strong className="text-indigo-300 font-mono">"{targetRole}"</strong> yang dihitung hadir atau absen, serta dikirimi DM peringatan.
            </p>
          </div>

          {/* CHANNEL ID */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              ID CHANNEL ABSENSI
            </label>
            <input
              type="text"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              placeholder="#📢 | absensi-personel"
              className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
            />
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] text-slate-500">Channel ID:</span>
              <input
                type="text"
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                placeholder="112233445566778899"
                className="flex-1 px-2.5 py-1 bg-slate-950 border border-slate-800/80 rounded text-[11px] text-slate-300 font-mono"
              />
            </div>
          </div>

          {/* EMOJI ABSENSI (matching Screenshot 3 big box) */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              EMOJI ABSENSI
            </label>
            <div className="w-full py-4 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-center">
              <input
                type="text"
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                className="w-16 text-center text-3xl bg-transparent border-b border-indigo-500 focus:outline-none"
              />
            </div>
            <p className="text-xs text-slate-500 text-center">
              Hanya react dengan emoji ini yang dihitung sebagai absen.
            </p>
          </div>

          {/* TEMPLATE DM PERINGATAN */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              FORMAT PESAN DM PERINGATAN
            </label>
            <textarea
              rows={3}
              value={dmTemplate}
              onChange={(e) => setDmTemplate(e.target.value)}
              placeholder="Halo {nama}, kamu belum absen hari ini..."
              className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
            <p className="text-[11px] text-slate-500">
              Pesan ini yang otomatis dikirim bot ke DM Discord personil yang belum absen.
            </p>
          </div>

          {/* BUTTON SIMPAN & HUBUNGKAN (matching Screenshot 3) */}
          <div className="pt-3 space-y-3">
            <button
              type="submit"
              className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
            >
              {isSaved ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
              <span>{isSaved ? 'Konfigurasi Berhasil Disimpan!' : 'Simpan & Hubungkan'}</span>
            </button>

            {/* Quick import filtered by role */}
            <button
              type="button"
              onClick={handleImportServerMembers}
              disabled={isImporting}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium rounded-xl border border-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <UserCheck className={`w-3.5 h-3.5 ${isImporting ? 'animate-spin' : ''}`} />
              <span>
                {isImporting
                  ? 'Menarik Personil...'
                  : `Tarik Personil Role "${targetRole}" dari Discord`}
              </span>
            </button>

            {importStatus && (
              <div className="text-xs text-center text-indigo-400 bg-indigo-950/30 p-2.5 rounded-lg border border-indigo-900/40">
                {importStatus}
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
