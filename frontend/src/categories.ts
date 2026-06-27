import AsyncStorage from '@react-native-async-storage/async-storage';

export type MacroCategory = 'Vino' | 'Birra' | 'Cocktail' | 'Bibite';

export const CATEGORIES: Record<MacroCategory, { emoji: string; subcategories: string[] }> = {
  Vino: {
    emoji: '🍷',
    subcategories: ['Rossi', 'Bianchi', 'Rosati', 'Bollicine', 'Dolci', 'Liquorosi', 'Macerati', 'Arancioni', 'Asiatici', 'Dealcolati'],
  },
  Birra: {
    emoji: '🍺',
    subcategories: ['Lager', 'Ale', 'Wheat', 'Dark / Roasted', 'IPA / Hoppy', 'Sour / Wild', 'Belghe / Trappiste', 'Analcoliche'],
  },
  Cocktail: {
    emoji: '🍸',
    subcategories: ['Spritz-style', 'Long drink', 'Short drink', 'Sour / Citrus', 'Tiki / Punch', 'Digestivi / Amari', 'Mocktail', 'Signature'],
  },
  Bibite: {
    emoji: '🥤',
    subcategories: ['Gassate', 'Tè freddi', 'Succhi & estratti', 'Fermentati', 'Energy drink', 'Infusi / Tisane', 'Asiatiche', 'Acque'],
  },
};

export const MACRO_CATEGORIES = Object.keys(CATEGORIES) as MacroCategory[];

export const categoryColors: Record<MacroCategory, string> = {
  Vino: '#8B2635',
  Birra: '#C9941A',
  Cocktail: '#B83A6B',
  Bibite: '#3A7CA5',
};

export function getCategoryColor(macro?: string | null): string {
  return categoryColors[(macro as MacroCategory)] || '#A09E98';
}

export function getCategoryEmoji(macro?: string | null): string {
  return CATEGORIES[(macro as MacroCategory)]?.emoji || '🍷';
}

const CUSTOM_KEY = 'custom_subcategories';

async function readCustomMap(): Promise<Record<string, string[]>> {
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function writeCustomMap(map: Record<string, string[]>) {
  await AsyncStorage.setItem(CUSTOM_KEY, JSON.stringify(map));
}

export async function getCustomSubcategories(macro: MacroCategory): Promise<string[]> {
  const map = await readCustomMap();
  return map[macro] || [];
}

export async function addCustomSubcategory(macro: MacroCategory, name: string): Promise<void> {
  const map = await readCustomMap();
  const existing = map[macro] || [];
  if (!existing.includes(name)) {
    map[macro] = [...existing, name];
    await writeCustomMap(map);
  }
}

export async function getAllSubcategories(macro: MacroCategory): Promise<string[]> {
  const builtIn = CATEGORIES[macro]?.subcategories || [];
  const custom = await getCustomSubcategories(macro);
  return [...builtIn, ...custom];
}

export async function getCustomSubcategoriesMap(): Promise<Record<string, string[]>> {
  return readCustomMap();
}

export async function setCustomSubcategoriesMap(map: Record<string, string[]>): Promise<void> {
  await writeCustomMap(map);
}
