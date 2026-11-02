import { Member, BotConfig, AttendanceDay } from '../types/attendance';
import { INITIAL_MEMBERS, DEFAULT_CONFIG, generateInitialDays } from '../data/mockRPData';

const STORAGE_KEYS = {
  MEMBERS: 'absensi_rp_members_v3',
  CONFIG: 'absensi_rp_config_v3',
  DAYS: 'absensi_rp_days_v4',
};

export function normalizeMembers(members: Member[]): Member[] {
  const deduped = new Map<string, Member>();

  const getKey = (member: Member) => {
    const discordId = member.discordId?.trim();
    if (discordId) return `discord:${discordId.toLowerCase()}`;

    const username = member.username?.trim();
    if (username) return `username:${username.toLowerCase()}`;

    const name = member.name?.trim();
    if (name) return `name:${name.toLowerCase()}`;

    return `id:${member.id || Math.random().toString(36).slice(2)}`;
  };

  const mergeRoles = (a?: string[], b?: string[]) => {
    const roles = [...(a || []), ...(b || [])]
      .map((role) => role?.trim())
      .filter((role): role is string => Boolean(role));

    return Array.from(new Set(roles));
  };

  const safeMember = (member: Member): Member => ({
    ...member,
    id: member.id || `member-${Math.random().toString(36).slice(2, 10)}`,
    discordId: member.discordId || '',
    name: member.name || member.username || 'Unknown Member',
    username: member.username || member.name || 'unknown_member',
    roles: member.roles ? [...new Set(member.roles.map((r) => r.trim()).filter(Boolean))] : [],
  });

  for (const rawMember of Array.isArray(members) ? members : []) {
    const member = safeMember(rawMember);
    const key = getKey(member);
    const existing = deduped.get(key);

    if (!existing) {
      deduped.set(key, member);
      continue;
    }

    deduped.set(key, {
      ...existing,
      ...member,
      id: existing.id || member.id,
      discordId: existing.discordId || member.discordId,
      name: existing.name || member.name,
      username: existing.username || member.username,
      avatarUrl: existing.avatarUrl || member.avatarUrl,
      roles: mergeRoles(existing.roles, member.roles),
    });
  }

  return Array.from(deduped.values())
    .filter((member) => Boolean(member.name) && Boolean(member.username))
    .sort((a, b) => a.name.localeCompare(b.name, 'id'));
}

export function loadMembers(): Member[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MEMBERS);
    if (!raw) return normalizeMembers(INITIAL_MEMBERS);
    const parsed = JSON.parse(raw);
    const safeParsed = Array.isArray(parsed) ? parsed : [];
    return normalizeMembers(safeParsed.length > 0 ? safeParsed : INITIAL_MEMBERS);
  } catch {
    return normalizeMembers(INITIAL_MEMBERS);
  }
}

export function saveMembers(members: Member[]): void {
  try {
    const cleaned = normalizeMembers(members);
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(cleaned));
  } catch (e) {
    console.error('Failed to save members', e);
  }
}

export function loadConfig(): BotConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(config: BotConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save config', e);
  }
}

export function loadDays(members: Member[]): Record<string, AttendanceDay> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DAYS);
    if (!raw) {
      const initial = generateInitialDays(members);
      saveDays(initial);
      return initial;
    }
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : generateInitialDays(members);
  } catch {
    return generateInitialDays(members);
  }
}

export function saveDays(days: Record<string, AttendanceDay>): void {
  try {
    localStorage.setItem(STORAGE_KEYS.DAYS, JSON.stringify(days));
  } catch (e) {
    console.error('Failed to save days', e);
  }
}

export function resetAllData(): {
  members: Member[];
  config: BotConfig;
  days: Record<string, AttendanceDay>;
} {
  const members = normalizeMembers(INITIAL_MEMBERS);
  const config = DEFAULT_CONFIG;
  const days = generateInitialDays(members);

  saveMembers(members);
  saveConfig(config);
  saveDays(days);

  return { members, config, days };
}

