export function toSlug(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '-');
}

export function normalizeSlug(slug: string): string {
  return slug.toLowerCase().replace(/-/g, ' ');
}

export function getCategorySlug(categoryId: string): string {
  return categoryId;
}

export function resolveCategoryId(slug: string): string | undefined {
  return normalizeSlug(slug).replace(/\s+/g, '-');
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
  ['mk-0', 'MK 0' as const],
  ['mk 0', 'MK 0' as const],
  ['mk-i', 'MK I' as const],
  ['mk i', 'MK I' as const],
  ['mk-ii', 'MK II' as const],
  ['mk ii', 'MK II' as const],
  ['mk-iii', 'MK III' as const],
  ['mk iii', 'MK III' as const],
  ['mk-iv', 'MK IV' as const],
  ['mk iv', 'MK IV' as const],
  ['mk-v', 'MK V' as const],
  ['mk v', 'MK V' as const],
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
