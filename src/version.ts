import changelogText from '../CHANGELOG.md?raw';

export interface ChangelogEntry {
  version: string;
  body: string;
}

export function parseLatestEntry(md: string): ChangelogEntry | null {
  const lines = md.split('\n');
  let version = '';
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^## \[(.+?)\]/);
    if (m) {
      version = m[1];
      start = i + 1;
      break;
    }
  }
  if (!version || start < 0) return null;
  let end = lines.length;
  for (let i = start; i < lines.length; i++) {
    if (lines[i].startsWith('## ')) { end = i; break; }
  }
  return { version, body: lines.slice(start, end).join('\n').trim() };
}

export const LATEST_ENTRY = parseLatestEntry(changelogText);
export const APP_VERSION = LATEST_ENTRY?.version ?? '0.0.0';
