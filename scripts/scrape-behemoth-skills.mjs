import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function fetchPageHTML(pageName) {
  const url = `https://state-of-survival.fandom.com/api.php?action=parse&page=${encodeURIComponent(pageName)}&prop=text&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${pageName}`);
  const data = await res.json();
  if (!data?.parse?.text?.['*']) throw new Error(`No parse data for ${pageName}`);
  return data.parse.text['*'];
}

function extractTabNames(tabberHtml) {
  const names = [];
  const m = tabberHtml.match(/<ul class="wds-tabs">([\s\S]*?)<\/ul>/);
  if (!m) return names;
  const liRe = /<li[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/li>/g;
  let r;
  while ((r = liRe.exec(m[1])) !== null) {
    names.push(r[1].replace(/<[^>]+>/g, '').trim());
  }
  return names;
}

function extractTabContents(tabberHtml) {
  const contents = [];
  const tabsStart = tabberHtml.indexOf('<div class="wds-tab__content');
  if (tabsStart === -1) return contents;
  let remaining = tabberHtml.substring(tabsStart);
  while (remaining.startsWith('<div class="wds-tab__content')) {
    const tagEnd = remaining.indexOf('>');
    if (tagEnd === -1) break;
    const after = remaining.substring(tagEnd + 1);
    let depth = 1, p = 0;
    while (depth > 0 && p < after.length) {
      const o = after.indexOf('<div', p);
      const c = after.indexOf('</div>', p);
      if (c === -1) break;
      if (o !== -1 && o < c) { depth++; p = o + 4; }
      else { depth--; p = c + 6; }
    }
    contents.push(after.substring(0, p));
    remaining = after.substring(p);
  }
  return contents;
}

function extractSkillName(tableHtml) {
  const m = tableHtml.match(/<big>([\s\S]*?)<\/big>/);
  return m ? m[1].trim() : 'Unknown';
}

function extractLevelData(tableHtml) {
  const data = [];
  const headerMatch = tableHtml.match(/<td[^>]*>[\s\S]*?Level[\s\S]*?<\/td>\s*<td[^>]*>[\s\S]*?Benefit[\s\S]*?<\/td>/);
  if (!headerMatch) return data;
  const after = tableHtml.substring(headerMatch.index + headerMatch[0].length);
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  let r;
  while ((r = rowRe.exec(after)) !== null) {
    const cells = [];
    const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/g;
    let c;
    while ((c = cellRe.exec(r[1])) !== null) cells.push(c[1].trim());
    if (cells.length < 3) continue;
    if (/total/i.test(cells[0])) continue;
    const level = parseInt(cells[0], 10);
    if (isNaN(level)) continue;
    data.push({
      level,
      benefit: cells[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#160;/g, ' ').trim(),
      cost: parseInt(cells[2].replace(/<[^>]+>/g, '').replace(/[^0-9]/g, ''), 10) || 0,
    });
  }
  return data;
}

function findTabbersInSection(html) {
  const tabbers = [];
  let pos = 0;
  while ((pos = html.indexOf('<div class="tabber wds-tabber">', pos)) !== -1) {
    const start = pos;
    const openTagEnd = html.indexOf('>', pos);
    let depth = 1, p = openTagEnd + 1;
    while (depth > 0 && p < html.length) {
      const o = html.indexOf('<div', p);
      const c = html.indexOf('</div>', p);
      if (c === -1) break;
      if (o !== -1 && o < c) { depth++; p = o + 4; }
      else { depth--; p = c + 6; }
    }
    tabbers.push(html.substring(start, p));
    pos = p;
  }
  return tabbers;
}

function parseSkillsPage(html, heading) {
  const rows = [];
  const sectionStart = html.indexOf(heading);
  const sectionEnd = html.indexOf('SEE ALSO', sectionStart);
  const section = sectionStart !== -1 && sectionEnd !== -1
    ? html.substring(sectionStart, sectionEnd)
    : html;

  const tabbers = findTabbersInSection(section);

  for (const tabberHtml of tabbers) {
    const tabNames = extractTabNames(tabberHtml);
    if (!tabNames.length) continue;
    if (/total cost/i.test(tabNames[0])) continue;

    const tree = tabNames[0];
    const contents = extractTabContents(tabberHtml);

    for (let i = 0; i < tabNames.length && i < contents.length; i++) {
      const content = contents[i];
      const tableRe = /<table[^>]*class="table mw-collapsible[^>]*>([\s\S]*?)<\/table>/g;
      let t;
      let found = false;
      while ((t = tableRe.exec(content)) !== null) {
        const skillName = extractSkillName(t[1]);
        const levels = extractLevelData(t[1]);
        if (!levels.length && !found) {
          found = true;
          continue;
        }
        for (const l of levels) {
          rows.push({ Tree: tree, Skill: skillName, Level: l.level, Benefit: l.benefit, 'Neuronal Medium': l.cost });
        }
      }
    }
  }

  return rows;
}

async function main() {
  console.log('Fetching MK III wiki page...');
  const m3 = await fetchPageHTML('Companion:_Behemoth_MK_III');
  console.log('Fetching MK IV wiki page...');
  const m4 = await fetchPageHTML('Companion:_Behemoth_Mk_IV');
  console.log('Parsing MK III skills...');
  const r3 = parseSkillsPage(m3, 'BEHEMOTH MK III SKILLS');
  console.log(`  ${r3.length} rows`);
  console.log('Parsing MK IV skills...');
  const r4 = parseSkillsPage(m4, 'BEHEMOTH MK IV SKILLS');
  console.log(`  ${r4.length} rows`);
  const wb = XLSX.utils.book_new();
  if (r3.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(r3), 'MK III Skills');
  if (r4.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(r4), 'MK IV Skills');
  const dir = join(__dirname, '..', 'src', 'data', 'excel');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const out = join(dir, 'behemoth_skills.xlsx');
  XLSX.writeFile(wb, out);
  console.log(`Written to ${out}`);
}

main().catch(e => { console.error(e); process.exit(1); });
