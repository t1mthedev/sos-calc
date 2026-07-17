export function toSlug(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '-');
}

export function normalizeSlug(slug: string): string {
  return slug.toLowerCase().replace(/-/g, ' ');
}

const CATEGORY_SLUG_OVERRIDE: Record<string, string> = {
  '__behemoth__': 'behemoth',
};

export function getCategorySlug(categoryId: string): string {
  return CATEGORY_SLUG_OVERRIDE[categoryId] ?? categoryId;
}

export function resolveCategoryId(slug: string): string | undefined {
  const normalized = normalizeSlug(slug).replace(/\s+/g, '-');
  if (normalized === 'behemoth') return '__behemoth__';
  return normalized;
}

export function buildSlugLookup<T extends string>(names: T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const name of names) {
    map.set(toSlug(name), name);
  }
  return map;
}

export function resolveBySlug<T extends string>(slug: string, lookup: Map<string, T>): T | undefined {
  const key = toSlug(slug);
  return lookup.get(key);
}

const MK_SLUG_MAP = new Map([
  ['mk-iii', 'MK III' as const],
  ['mk iii', 'MK III' as const],
  ['mk-iv', 'MK IV' as const],
  ['mk iv', 'MK IV' as const],
]);

export function resolveMk(slug: string): string | undefined {
  return MK_SLUG_MAP.get(toSlug(slug));
}

export function getMkSlug(mk: string): string {
  return toSlug(mk);
}

export function getSectionSlug(section: string): string {
  return section.toLowerCase();
}
