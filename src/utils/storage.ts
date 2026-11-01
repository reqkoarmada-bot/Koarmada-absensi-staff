import { Member, BotConfig, AttendanceDay } from '../types/attendance';
import { INITIAL_MEMBERS, DEFAULT_CONFIG, generateInitialDays } from '../data/mockRPData';

const STORAGE_KEYS = {
  MEMBERS: 'absensi_rp_members_v3',
  CONFIG: 'absensi_rp_config_v3',
  DAYS: 'absensi_rp_days_v4',
};

export function loadMembers(): Member[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MEMBERS);
    if (!raw) return INITIAL_MEMBERS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_MEMBERS;
  } catch {
    return INITIAL_MEMBERS;
  }
}

export function saveMembers(members: Member[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
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
  const members = INITIAL_MEMBERS;
  const config = DEFAULT_CONFIG;
  const days = generateInitialDays(members);

  saveMembers(members);
  saveConfig(config);
  saveDays(days);

  return { members, config, days };
}
