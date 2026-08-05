import { normalizeSlug } from './slugs';

export const SCREEN_BRAND = 'SOS Upgrade Calculator';

const ROUTE_SCREEN_NAMES: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /^\/dashboard/, name: 'Dashboard' },
  { pattern: /^\/backpack/, name: 'Backpack' },
  { pattern: /^\/calculator\/behemoth/, name: 'Behemoth' },
  { pattern: /^\/calculator\/spacecraft/, name: 'Spacecraft' },
  { pattern: /^\/calculator\/aircraft/, name: 'Aircraft' },
  { pattern: /^\/calculator\/vehicles/, name: 'Vehicles' },
  { pattern: /^\/calculator\/$/, name: 'Calculator' },
  { pattern: /^\/calculator$/, name: 'Calculator' },
  { pattern: /^\/calculator\d*$/, name: 'Calculator' },
];

function toTitleCase(text: string): string {
  return text.replace(/\b\w/g, char => char.toUpperCase());
}

export function getScreenName(pathname: string): string {
  const matched = ROUTE_SCREEN_NAMES.find(item => item.pattern.test(pathname));
  if (matched) return matched.name;

  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] !== 'calculator') return 'Calculator';

  if (parts[1] === 'behemoth') return 'Behemoth';
  if (parts[1] === 'spacecraft') return 'Spacecraft';
  if (parts[1] === 'aircraft') return 'Aircraft';
  if (parts[1] === 'vehicles') return 'Vehicles';

  const slug = parts[1];
  if (slug) return toTitleCase(normalizeSlug(slug));

  return 'Calculator';
}

export function buildPageTitle(screenName: string): string {
  return `${screenName} — ${SCREEN_BRAND}`;
}