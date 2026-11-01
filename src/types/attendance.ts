export interface Member {
  id: string; // unique ID
  discordId: string; // 18-digit Discord user ID (for DMs and mentions)
  name: string; // In-server nickname, e.g. "[ESCORTA] taruna_akmil" or "[PLH DANSATPROV] Aboy"
  username: string; // Discord handle, e.g. "pandunothuman" or "mtchaboy."
  avatarUrl?: string;
  roles?: string[]; // Discord Role names or IDs
}

export interface AttendanceDay {
  date: string; // YYYY-MM-DD
  presentIds: string[]; // member IDs who attended
  dmSentIds?: string[]; // member IDs who were sent DM warning
  syncedAt?: string;
  messageId?: string;
}

export interface BotConfig {
  botToken: string;
  guildId: string;
  channelId: string;
  channelName: string; // e.g. "absensi-personel"
  requiredEmoji: string; // e.g. "✅"
  targetRole: string; // e.g. "Koarmada Member"
  targetRoleId?: string;
  dmWarningTemplate: string;
}

export interface MemberMonthlyAttendance {
  member: Member;
  presentCount: number;
  absentCount: number;
  totalDays: number;
  dayPresence: boolean[]; // array of length daysInMonth (true = attended, false = missed)
}
