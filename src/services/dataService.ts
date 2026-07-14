import { z } from 'zod';
import type { GameData, Category, Group, UpgradeItem, UpgradeLevel, Crate, Bundle, BehemothMk, BehemothSection } from '../types';
import gameDataRaw from '../data/json/game-data.json';
import cratesData from '../data/json/crates.json';
import bundlesData from '../data/json/bundles.json';

const BonusSchema = z.object({
  type: z.string(),
  value: z.number(),
  unit: z.string(),
});

const UpgradeLevelSchema: z.ZodType<UpgradeLevel> = z.object({
  level: z.number(),
  name: z.string().optional(),
  costs: z.record(z.string(), z.number()),
  bonuses: z.array(BonusSchema),
  benefit: z.string().optional(),
  skillsUnlocked: z.array(z.string()).optional(),
});

const UpgradeItemSchema: z.ZodType<UpgradeItem> = z.object({
  id: z.string(),
  name: z.string(),
  maxLevel: z.number(),
  levels: z.array(UpgradeLevelSchema),
});

const GroupSchema: z.ZodType<Group> = z.object({
  name: z.string(),
  mk: z.string().optional(),
  items: z.array(UpgradeItemSchema),
});

const CategorySchema: z.ZodType<Category> = z.object({
  id: z.string(),
  name: z.string(),
  groups: z.array(GroupSchema).optional(),
  items: z.array(UpgradeItemSchema).optional(),
});

const GameDataSchema: z.ZodType<GameData> = z.object({
  version: z.string(),
  lastUpdated: z.string(),
  categories: z.array(CategorySchema),
});

let cached: GameData | null = null;
let loadError: string | null = null;

export function loadGameData(): GameData {
  if (cached) return cached;
  if (loadError) throw new Error(loadError);

  if (!gameDataRaw || typeof gameDataRaw !== 'object') {
    loadError = 'Game data file is empty or invalid';
    throw new Error(loadError);
  }

  const result = GameDataSchema.safeParse(gameDataRaw);
  if (!result.success) {
    const issues = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
    loadError = `Invalid game data structure: ${issues}`;
    console.error('Game data validation failed:', result.error);
    throw new Error(loadError);
  }

  cached = result.data;
  return cached;
}

export function getCategories(): Category[] {
  return loadGameData().categories;
}

export function getCategoryById(id: string): Category | undefined {
  return getCategories().find(c => c.id === id);
}

function flattenItems(category: Category): UpgradeItem[] {
  if (category.items) return category.items;
  if (category.groups) return category.groups.flatMap(g => g.items);
  return [];
}

export function getItemById(categoryId: string, itemId: string): UpgradeItem | undefined {
  const cat = getCategoryById(categoryId);
  if (!cat) return undefined;
  return flattenItems(cat).find(i => i.id === itemId);
}

export function getLevelData(item: UpgradeItem, level: number): UpgradeLevel | undefined {
  return item.levels.find(l => l.level === level);
}

export function loadCrates(): Crate[] {
  if (!cratesData || !Array.isArray((cratesData as Record<string, unknown>).crates)) {
    console.warn('Crate data is empty or invalid');
    return [];
  }
  return (cratesData as Record<string, unknown>).crates as Crate[];
}

export function getCrates(): Crate[] {
  return loadCrates();
}

export function getCratesByCategory(categoryId: string): Crate[] {
  if (categoryId === '__behemoth__') {
    return loadCrates().filter(c =>
      c.categoryIds.includes('behemoth-enhancement') ||
      c.categoryIds.includes('behemoth-levels') ||
      c.categoryIds.includes('behemoth-skills')
    );
  }
  return loadCrates().filter(c => c.categoryIds.includes(categoryId));
}

export function getCrateById(id: string): Crate | undefined {
  return loadCrates().find(c => c.id === id);
}

export function loadBundles(): Bundle[] {
  if (!bundlesData || !Array.isArray((bundlesData as Record<string, unknown>).bundles)) {
    return [];
  }
  return (bundlesData as Record<string, unknown>).bundles as Bundle[];
}

export function getBundles(): Bundle[] {
  return loadBundles();
}

export function getBundlesByCrateId(crateId: string): Bundle[] {
  return loadBundles().filter(b => b.contents.some(c => c.crateId === crateId));
}

export function getBundlesByCategory(categoryId: string): Bundle[] {
  const behemothIds = categoryId === '__behemoth__'
    ? ['behemoth-enhancement', 'behemoth-levels', 'behemoth-skills']
    : [categoryId];
  const crates = loadCrates().filter(c => c.categoryIds.some(id => behemothIds.includes(id)));
  const crateIds = new Set(crates.map(c => c.id));
  return loadBundles().filter(b =>
    behemothIds.includes(b.categoryId ?? '') || b.contents.some(c => c.crateId && crateIds.has(c.crateId))
  );
}

export function getAllMaterialKeys(): string[] {
  const keys = new Set<string>();

  for (const cat of getCategories()) {
    const items = cat.items ?? cat.groups?.flatMap(g => g.items) ?? [];
    for (const item of items) {
      for (const level of item.levels) {
        for (const key of Object.keys(level.costs)) {
          keys.add(key);
        }
      }
    }
  }

  for (const crate of loadCrates()) {
    for (const opt of crate.options) {
      keys.add(opt.materialKey);
    }
  }

  return [...keys].sort();
}

const BEHEMOTH_CATEGORY_IDS: Record<BehemothSection, string> = {
  enhancement: 'behemoth-enhancement',
  levels: 'behemoth-levels',
  skills: 'behemoth-skills',
};

export function getBehemothCategoryId(section: BehemothSection): string {
  return BEHEMOTH_CATEGORY_IDS[section];
}

export function getBehemothItems(mk: BehemothMk, section: BehemothSection): { categoryId: string; items: UpgradeItem[] } {
  const categoryId = BEHEMOTH_CATEGORY_IDS[section];
  const cat = getCategoryById(categoryId);
  if (!cat) return { categoryId, items: [] };

  if (section === 'skills') {
    const groups = cat.groups?.filter(g => g.mk === mk) ?? [];
    return { categoryId, items: groups.flatMap(g => g.items) };
  }

  const all = cat.items ?? [];
  const suffix = mk === 'MK III' ? 'mk-iii' : 'mk-iv';
  const items = all.filter(item => item.id.endsWith(suffix));
  return { categoryId, items };
}

const BEHEMOTH_SECTIONS: BehemothSection[] = ['enhancement', 'levels', 'skills'];

export function getBehemothItemsForMk(mk: BehemothMk): { categoryId: string; items: UpgradeItem[] }[] {
  return BEHEMOTH_SECTIONS.map(section => getBehemothItems(mk, section));
}

export function getAllBehemothItems(): { categoryId: string; items: UpgradeItem[] }[] {
  return BEHEMOTH_SECTIONS.map(section => {
    const categoryId = BEHEMOTH_CATEGORY_IDS[section];
    const cat = getCategoryById(categoryId);
    if (!cat) return { categoryId, items: [] };
    if (section === 'skills') {
      return { categoryId, items: (cat.groups ?? []).flatMap(g => g.items) };
    }
    return { categoryId, items: cat.items ?? [] };
  });
}
