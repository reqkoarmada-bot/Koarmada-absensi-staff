import { Member, BotConfig, AttendanceDay } from '../types/attendance';

export const DEFAULT_CONFIG: BotConfig = {
  botToken: '',
  guildId: '1265517041725603951',
  channelId: '112233445566778899',
  channelName: '📢 | absensi-personel',
  requiredEmoji: '✅',
  targetRole: 'Koarmada Member',
  targetRoleId: '',
  dmWarningTemplate:
    'Halo {nama}! ⚠️ Kamu tercatat belum melakukan absensi hari ini di #{channel}. Mohon segera berikan reaksi emoji {emoji} sebelum batas waktu agar tidak terhitung Alpha. Terima kasih!',
};

export const INITIAL_MEMBERS: Member[] = [
  {
    id: 'm-1',
    discordId: '381928374650192831',
    name: '[COM] OD_ROGER',
    username: 'odroger_rp',
    avatarUrl: 'https://cdn.discordapp.com/embed/avatars/3.png',
    roles: ['Koarmada Member'],
  },
  {
    id: 'm-2',
    discordId: '492817263548192031',
    name: '[SUM] Mil_warrior',
    username: 'mil_warrior',
    avatarUrl: 'https://cdn.discordapp.com/embed/avatars/4.png',
    roles: ['Koarmada Member'],
  },
  {
    id: 'm-3',
    discordId: '581920394857291024',
    name: '[CUTI] GANZ_PRO',
    username: 'ganz_official',
    avatarUrl: 'https://cdn.discordapp.com/embed/avatars/5.png',
    roles: ['Koarmada Member'],
  },
  {
    id: 'm-4',
    discordId: '692830192837465012',
    name: '[ESCORTA] taruna_akmil',
    username: 'pandunothuman',
    avatarUrl: 'https://cdn.discordapp.com/embed/avatars/0.png',
    roles: ['Koarmada Member'],
  },
  {
    id: 'm-5',
    discordId: '781920394850192835',
    name: '[MAGANG DIKTUPA] Hanz',
    username: 'hanzxtzy',
    avatarUrl: 'https://cdn.discordapp.com/embed/avatars/1.png',
    roles: ['Koarmada Member'],
  },
  {
    id: 'm-6',
    discordId: '892019283746501923',
    name: '[PLH DANSATPROV] Aboy',
    username: 'mtchaboy.',
    avatarUrl: 'https://cdn.discordapp.com/embed/avatars/2.png',
    roles: ['Koarmada Member'],
  },
  {
    id: 'm-7',
    discordId: '901928374650192834',
    name: '[PROV] Kevin Alexander',
    username: 'kevin_alex',
    avatarUrl: 'https://cdn.discordapp.com/embed/avatars/0.png',
    roles: ['Koarmada Member'],
  },
  {
    id: 'm-8',
    discordId: '102938475610293847',
    name: '[LOGISTIK] Nadia Safitri',
    username: 'nadia_saf',
    avatarUrl: 'https://cdn.discordapp.com/embed/avatars/1.png',
    roles: ['Koarmada Member'],
  },
  {
    id: 'm-9',
    discordId: '213049586721304958',
    name: '[OPERASI] Dimas Anggara',
    username: 'dimas_ang',
    avatarUrl: 'https://cdn.discordapp.com/embed/avatars/2.png',
    roles: ['Koarmada Member'],
  },
  {
    id: 'm-10',
    discordId: '324150697832415069',
    name: '[ANGGOTA] Rendy Oktavian',
    username: 'rendy_okta',
    avatarUrl: 'https://cdn.discordapp.com/embed/avatars/3.png',
    roles: ['Koarmada Member'],
  },
  {
    id: 'm-11',
    discordId: '435261708943526170',
    name: '[ANGGOTA] Gilang Ramadhan',
    username: 'gilang_rmd',
    avatarUrl: 'https://cdn.discordapp.com/embed/avatars/4.png',
    roles: ['Koarmada Member'],
  },
  {
    id: 'm-12',
    discordId: '546372819054637281',
    name: '[ANGGOTA] Budi Santoso',
    username: 'budi_santoso',
    avatarUrl: 'https://cdn.discordapp.com/embed/avatars/5.png',
    roles: ['Koarmada Member'],
  },
];

// Target counts for October 2026 to match Screenshot 1 & 2 exactly:
// m-1: 24, m-2: 24, m-3: 23, m-4: 23, m-5: 23, m-6: 23
const OCTOBER_TARGETS: Record<string, number> = {
  'm-1': 24,
  'm-2': 24,
  'm-3': 23,
  'm-4': 23,
  'm-5': 23,
  'm-6': 23,
  'm-7': 21,
  'm-8': 20,
  'm-9': 19,
  'm-10': 16,
  'm-11': 14,
  'm-12': 12,
};

/**
 * Generates realistic, fully accurate attendance history for all 12 months (Januari - Desember) of 2026.
 * Each month has distinct, realistic presences and rankings.
 */
export function generateInitialDays(members: Member[]): Record<string, AttendanceDay> {
  const days: Record<string, AttendanceDay> = {};
  const year = 2026;

  // Populate all 12 months (1 = Januari, 12 = Desember)
  for (let month = 1; month <= 12; month++) {
    const totalDays = new Date(year, month, 0).getDate();
    const monthStr = month.toString().padStart(2, '0');

    // Create a deterministic target count for each member in this month
    const monthTargets: Record<string, number> = {};

    members.forEach((m, idx) => {
      if (month === 10) {
        // October matches screenshot exactly
        monthTargets[m.id] = OCTOBER_TARGETS[m.id] ?? 20;
      } else {
        // Vary naturally per month (so each month has its own top performers and low performers)
        // Shift rotation by month so different members excel or have absences in different months
        const base = 26 - ((idx * 3 + month * 5) % 15); // ranges between 11 and 26
        const adjusted = Math.min(totalDays - 1, Math.max(7, base));
        monthTargets[m.id] = adjusted;
      }
    });

    // Populate each day of the month
    for (let d = 1; d <= totalDays; d++) {
      const dayStr = d.toString().padStart(2, '0');
      const dateStr = `${year}-${monthStr}-${dayStr}`;

      const presentIds: string[] = [];

      members.forEach((m, idx) => {
        const target = monthTargets[m.id] || 18;

        // Spread the member's attendances across the month
        // In October: keep exact deterministic pattern
        let isPresent = false;
        if (month === 10) {
          const dayHash = (d * 7 + (idx + 1) * 11) % 31;
          isPresent = dayHash < target;
        } else {
          // Spread evenly across totalDays
          const pseudoHash = Math.abs(Math.sin(d * 13 + (idx + 1) * 19 + month * 29));
          const threshold = target / totalDays;
          isPresent = pseudoHash <= threshold;
        }

        if (isPresent) {
          presentIds.push(m.id);
        }
      });

      days[dateStr] = {
        date: dateStr,
        presentIds,
        syncedAt: `${dateStr}T20:00:00Z`,
      };
    }
  }

  return days;
}
