import AsyncStorage from '@react-native-async-storage/async-storage';

const UNLOCKED_BADGES_KEY = 'unlocked_badges';

export const LEVEL_THRESHOLDS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100] as const;
export const MAX_LEVEL = LEVEL_THRESHOLDS.length;

export type LevelTier = { fill: string; stroke: string; text: string };

const BRONZE: LevelTier = { fill: '#a86a3d', stroke: '#7d4e2b', text: '#fff' };
const SILVER_LV3: LevelTier = { fill: '#9a8b6a', stroke: '#6f6448', text: '#fff' };
const SILVER: LevelTier = { fill: '#b8bcc4', stroke: '#868b94', text: '#3a3f47' };
const GOLD: LevelTier = { fill: '#e0a92b', stroke: '#b08420', text: '#6b4e0f' };
const PLATINUM_LV9: LevelTier = { fill: '#3f7d78', stroke: '#2f5350', text: '#fff' };
const PLATINUM_LV10: LevelTier = { fill: '#2f5350', stroke: '#1f3a38', text: '#fff' };

// Color of the trophy glyph on the level-10 badge (gold, distinct from the dark platinum shield).
export const LV10_TROPHY_COLOR = '#e0a92b';

export function getTierForLevel(level: number): LevelTier {
  if (level <= 2) return BRONZE;
  if (level === 3) return SILVER_LV3;
  if (level <= 5) return SILVER;
  if (level <= 8) return GOLD;
  if (level === 9) return PLATINUM_LV9;
  return PLATINUM_LV10;
}

export function getThresholdForLevel(level: number): number {
  return LEVEL_THRESHOLDS[level - 1];
}

// Number of thresholds reached so far (0 if the user hasn't hit the first one yet).
export function getLevelForCount(count: number): number {
  let level = 0;
  for (const threshold of LEVEL_THRESHOLDS) {
    if (count >= threshold) level += 1;
    else break;
  }
  return level;
}

export function getProgressToNext(count: number): { level: number; current: number; next: number | null } {
  const level = getLevelForCount(count);
  if (level >= MAX_LEVEL) return { level, current: count, next: null };
  return { level, current: count, next: LEVEL_THRESHOLDS[level] };
}

export async function getUnlockedLevels(): Promise<number[]> {
  try {
    const raw = await AsyncStorage.getItem(UNLOCKED_BADGES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function setUnlockedLevels(levels: number[]): Promise<void> {
  await AsyncStorage.setItem(UNLOCKED_BADGES_KEY, JSON.stringify(levels));
}

// Compares the current tasting count against the badges already recorded as unlocked,
// persists any newly-crossed thresholds, and returns the levels that just got unlocked
// (usually one, but can be more if the count jumped, e.g. after a backup restore).
export async function checkForNewUnlocks(currentCount: number): Promise<number[]> {
  const unlocked = await getUnlockedLevels();
  const newly: number[] = [];
  LEVEL_THRESHOLDS.forEach((threshold, idx) => {
    const level = idx + 1;
    if (currentCount >= threshold && !unlocked.includes(level)) newly.push(level);
  });
  if (newly.length) {
    await setUnlockedLevels([...unlocked, ...newly].sort((a, b) => a - b));
  }
  return newly;
}
