import type { UpgradeItem, UpgradeLevel, Bonus, CalculatorResult } from '../../../types';

export function getLevelData(item: UpgradeItem, level: number): UpgradeLevel | undefined {
  return item.levels.find(l => l.level === level);
}

export function getStatsAtLevel(item: UpgradeItem, level: number): Bonus[] {
  const data = getLevelData(item, level);
  return data ? [...data.bonuses] : [];
}

export function sumCosts(item: UpgradeItem, currentLevel: number, targetLevel: number): Record<string, number> {
  const totals: Record<string, number> = {};
  for (let lvl = currentLevel + 1; lvl <= targetLevel; lvl++) {
    const data = getLevelData(item, lvl);
    if (!data) continue;
    for (const [key, val] of Object.entries(data.costs)) {
      totals[key] = (totals[key] || 0) + val;
    }
  }
  return totals;
}

export function computeNetGain(currentBonuses: Bonus[], targetBonuses: Bonus[]): Bonus[] {
  const netGain: Bonus[] = [];
  for (const target of targetBonuses) {
    const current = currentBonuses.find(b => b.type === target.type);
    const currentVal = current ? current.value : 0;
    netGain.push({
      type: target.type,
      value: Math.round((target.value - currentVal) * 100) / 100,
      unit: target.unit,
    });
  }
  for (const current of currentBonuses) {
    if (!targetBonuses.find(b => b.type === current.type)) {
      netGain.push({
        type: current.type,
        value: -current.value,
        unit: current.unit,
      });
    }
  }
  return netGain;
}

export function buildUpgradePath(
  item: UpgradeItem,
  currentLevel: number,
  targetLevel: number
): { from: UpgradeLevel; to: UpgradeLevel; costs: Record<string, number> }[] {
  const path: { from: UpgradeLevel; to: UpgradeLevel; costs: Record<string, number> }[] = [];
  for (let lvl = currentLevel + 1; lvl <= targetLevel; lvl++) {
    const from = getLevelData(item, lvl - 1);
    const to = getLevelData(item, lvl);
    if (!from || !to) continue;
    path.push({ from, to, costs: { ...to.costs } });
  }
  return path;
}

export function calculate(
  item: UpgradeItem,
  currentLevel: number,
  targetLevel: number
): CalculatorResult {
  const totalCosts = sumCosts(item, currentLevel, targetLevel);
  const currentBonuses = getStatsAtLevel(item, currentLevel);
  const targetBonuses = getStatsAtLevel(item, targetLevel);
  const netGain = computeNetGain(currentBonuses, targetBonuses);
  const upgradePath = buildUpgradePath(item, currentLevel, targetLevel);
  const upgradesCount = targetLevel - currentLevel;

  return {
    totalCosts,
    currentBonuses,
    targetBonuses,
    netGain,
    upgradePath,
    upgradesCount,
  };
}
