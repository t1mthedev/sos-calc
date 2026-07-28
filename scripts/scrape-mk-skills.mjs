import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXCEL_DIR = join(__dirname, '..', 'src', 'data', 'excel');

async function fetchHTML(page) {
  const url = `https://state-of-survival.fandom.com/api.php?action=parse&page=${encodeURIComponent(page)}&prop=text&format=json`;
  const res = await fetch(url, { headers: { 'User-Agent': 'sos-calc/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data?.parse?.text?.['*']) throw new Error('No parse data');
  return data.parse.text['*'];
}

{ // strip html tags but keep &
  const strip = (s) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
  const cost = (s) => parseInt(s.replace(/,/g, '')) || 0;

  const mk = process.argv[2] || 'MK I';
  const page = mk === 'MK I' ? 'Behemoth_MK_I' : 'Behemoth_MK_II';
  const heading = mk === 'MK I' ? 'Behemoth Mk I Skills' : 'BEHEMOTH MK II SKILLS';
  const sheetName = mk === 'MK I' ? 'MK I Skills' : 'MK II Skills';
  console.log(`Scraping ${mk} skills from ${page}...`);
  const html = await fetchHTML(page);
  const headingId = mk === 'MK I' ? 'Behemoth_Mk_I_Skills' : 'BEHEMOTH_MK_II_SKILLS';
  const searchStr = `<span class="mw-headline" id="${headingId}"`;
  const sIdx = html.indexOf(searchStr);
  if (sIdx === -1) { console.error(`Section "${heading}" not found`); process.exit(1); }
  const nextHl = html.indexOf('<span class="mw-headline"', sIdx + searchStr.length);
  const nextH2 = html.indexOf('<h2>', sIdx + searchStr.length);
  let eIdx = html.length;
  if (nextHl !== -1 && nextH2 !== -1) eIdx = Math.min(nextHl, nextH2);
  else if (nextHl !== -1) eIdx = nextHl;
  else if (nextH2 !== -1) eIdx = nextH2;
  const sec = html.substring(sIdx, eIdx);

  const tables = [];
  const tableRe = /<table[^>]*>([\s\S]*?)<\/table>/g;
  let m;
  while ((m = tableRe.exec(sec))) tables.push(m[1]);

  // Skip last (summary) table
  const dataTables = tables.slice(0, -1);
  const allRows = [];
  const seenNames = new Map();

  for (const tb of dataTables) {
    const trs = tb.match(/<tr>([\s\S]*?)<\/tr>/g) || [];
    if (trs.length < 3) continue;

    // Get skill name from first th
    const nameMatch = tb.match(/<th[^>]*>[\s\S]*?<big>([\s\S]*?)<\/big>/);
    const rawName = nameMatch ? strip(nameMatch[1]) : 'Unknown';

    // Handle duplicate names
    let skillName = rawName;
    const count = (seenNames.get(rawName) || 0) + 1;
    seenNames.set(rawName, count);
    if (count > 1) skillName = rawName + ' ' + count;

    // Parse data rows (skip title row, description row, header row)
    const dataRows = trs.filter(r => /<td[^>]*>/.test(r) && !/Total/i.test(r));

    // Determine column structure from header row
    const headerRow = trs.find(r => {
      const t = strip(r);
      return t === 'Level' || t.startsWith('Level');
    }) || '';
    const headerCells = [];
    const hcRe = /<th[^>]*>([\s\S]*?)<\/th>/g;
    let h;
    while ((h = hcRe.exec(headerRow))) headerCells.push(strip(h[1]));
    const numCols = headerCells.length;

    for (const r of dataRows) {
      const cells = [];
      const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/g;
      let d;
      while ((d = tdRe.exec(r))) cells.push(strip(d[1]));
      if (cells.length < 2) continue;

      const level = parseInt(cells[0], 10);
      if (isNaN(level) || level < 1) continue;

      const costVal = cost(cells[1]);

      // Combine remaining cells as benefit
      const benefitCells = cells.slice(2).filter(c => c && c !== '-');
      const benefit = benefitCells.join(', ');

      allRows.push({
        Tree: skillName,
        Skill: skillName,
        Level: level,
        Benefit: benefit || rawName,
        Biobattery: costVal,
      });
    }
  }

  console.log(`Total skill rows: ${allRows.length}`);

  if (!existsSync(EXCEL_DIR)) mkdirSync(EXCEL_DIR, { recursive: true });

  const skillsPath = join(EXCEL_DIR, 'behemoth_skills.xlsx');
  let wb;
  if (existsSync(skillsPath)) {
    wb = XLSX.readFile(skillsPath, { cellDates: true });
  } else {
    wb = XLSX.utils.book_new();
  }

  // Remove existing sheets for this MK only
  for (const name of [mk, sheetName]) {
    if (wb.SheetNames.includes(name)) {
      const idx = wb.SheetNames.indexOf(name);
      wb.SheetNames.splice(idx, 1);
      delete wb.Sheets[name];
    }
  }

  if (allRows.length) {
    const ws = XLSX.utils.json_to_sheet(allRows);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  XLSX.writeFile(wb, skillsPath);
  console.log(`Updated ${skillsPath}`);
}