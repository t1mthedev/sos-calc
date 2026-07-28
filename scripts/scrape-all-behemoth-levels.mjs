import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));

const MK_CONFIGS = [
  { mk: 'MK 0', page: 'Companion: Behemoth Zero', section: 'COMPANION ZERO LEVELS' },
  { mk: 'MK I', page: 'Behemoth MK I', section: 'Behemoth Mk I Levels' },
  { mk: 'MK II', page: 'Behemoth MK II', section: 'BEHEMOTH MK II LEVELS' },
  { mk: 'MK III', page: 'Companion: Behemoth_MK_III', section: 'BEHEMOTH MK III LEVELS' },
  { mk: 'MK IV', page: 'Companion: Behemoth_Mk_IV', section: 'BEHEMOTH MK IV LEVELS' },
];

async function fetchPageHTML(pageName) {
  const url = `https://state-of-survival.fandom.com/api.php?action=parse&page=${encodeURIComponent(pageName)}&prop=text&format=json`;
  const res = await fetch(url, { headers: { 'User-Agent': 'sos-calc/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${pageName}`);
  const data = await res.json();
  if (!data?.parse?.text?.['*']) throw new Error(`No parse data for ${pageName}`);
  return data.parse.text['*'];
}

function findLevelSection(html, headingText) {
  const idx = html.indexOf(headingText);
  if (idx === -1) return '';
  const nextH2 = html.indexOf('<h2>', idx + headingText.length);
  const nextSeeAlso = html.indexOf('SEE ALSO', idx);
  const end = nextH2 !== -1 ? (nextSeeAlso !== -1 ? Math.min(nextH2, nextSeeAlso) : nextH2) : (nextSeeAlso !== -1 ? nextSeeAlso : html.length);
  return html.substring(idx, end);
}

function extractTabberTables(html) {
  const tables = [];
  const tabberRe = /<div class="tabber wds-tabber">([\s\S]*?)<\/div>\s*<\/div>\s*<\/center>/g;
  let m;
  while ((m = tabberRe.exec(html)) !== null) {
    const tabContent = m[1];
    const tableRe = /<table[^>]*class="table mw-collapsible[^>]*>([\s\S]*?)<\/table>/g;
    let t;
    while ((t = tableRe.exec(tabContent)) !== null) {
      tables.push(t[1]);
    }
  }
  return tables;
}

function parseKValue(s) {
  if (!s || s === '-' || s === '') return 0;
  s = String(s).replace(/,/g, '').trim();
  const m = s.match(/^([\d.]+)K$/i);
  if (m) return Math.round(parseFloat(m[1]) * 1000);
  return parseInt(s, 10) || 0;
}

function parsePowerSerumCost(s) {
  if (!s || s === '-' || s === '') return 0;
  return parseInt(String(s).replace(/,/g, '').trim(), 10) || 0;
}

function parsePct(s) {
  if (!s || s === '-') return 0;
  return parseFloat(String(s).replace('%', '').trim()) || 0;
}

function extractLevelData(tableBody, mkLabel) {
  const rows = [];
  const rowRe = /<tr>([\s\S]*?)<\/tr>/g;
  let m;
  while ((m = rowRe.exec(tableBody)) !== null) {
    const cells = [];
    const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/g;
    let c;
    while ((c = cellRe.exec(m[1])) !== null) {
      cells.push(c[1].trim());
    }
    if (cells.length < 5) continue;

    const levelStr = cells[0].replace(/<[^>]+>/g, '').trim();
    const level = parseInt(levelStr, 10);
    if (isNaN(level) || level < 1 || level > 200) continue;

    const pointsRaw = cells[1].replace(/<[^>]+>/g, '').trim();
    let benefitRaw = cells[2].replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').trim();
    benefitRaw = benefitRaw.replace(/<br\s*\/?>/gi, ', ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    const pctRaw = cells[3].replace(/<[^>]+>/g, '').trim();
    const costRaw = cells[4].replace(/<[^>]+>/g, '').trim();

    const benefit = benefitRaw;
    const cost = parsePowerSerumCost(costRaw);
    const pct = parsePct(pctRaw);
    const points = parseKValue(pointsRaw);

    if (points === 0 && cost === 0 && level !== 1) continue;

    rows.push({
      Level: level,
      Mk: mkLabel,
      PowerSerum: cost,
      Benefit: benefit,
      BenefitPct: pct,
      PointsToUpgrade: points,
    });
  }
  return rows;
}

async function main() {
  const dir = join(__dirname, '..', 'src', 'data', 'excel');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const wb = XLSX.utils.book_new();

  for (const cfg of MK_CONFIGS) {
    console.log(`Fetching ${cfg.page}...`);
    const html = await fetchPageHTML(cfg.page);
    const section = findLevelSection(html, cfg.section);
    if (!section) {
      console.warn(`  No levels section found for ${cfg.mk}, skipping`);
      continue;
    }
    const tables = extractTabberTables(section);
    console.log(`  ${tables.length} level tables found`);
    const rows = [];
    for (const table of tables) {
      const data = extractLevelData(table, cfg.mk);
      rows.push(...data);
    }
    console.log(`  ${rows.length} rows`);
    if (rows.length) {
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, cfg.mk);
    }
  }

  const out = join(dir, 'behemoth_levels.xlsx');
  XLSX.writeFile(wb, out);
  console.log(`\nWritten to ${out}`);
}

main().catch(e => { console.error(e); process.exit(1); });
