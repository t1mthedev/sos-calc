import { describe, it, expect } from 'vitest';
import type { UpgradeItem } from '../../../../types';
import { calculate, sumCosts, computeNetGain, getStatsAtLevel } from '../calculator';

const mockItem: UpgradeItem = {
  id: 'test',
  name: 'Test Item',
  maxLevel: 5,
  levels: [
    { level: 1, costs: { 'Tactical Analysis': 0 }, bonuses: [{ type: 'Effect', value: 10, unit: '%' }] },
    { level: 2, costs: { 'Tactical Analysis': 5 }, bonuses: [{ type: 'Effect', value: 15, unit: '%' }] },
    { level: 3, costs: { 'Tactical Analysis': 8 }, bonuses: [{ type: 'Effect', value: 21, unit: '%' }] },
    { level: 4, costs: { 'Tactical Analysis': 12 }, bonuses: [{ type: 'Effect', value: 28, unit: '%' }] },
    { level: 5, costs: { 'Tactical Analysis': 20 }, bonuses: [{ type: 'Effect', value: 36, unit: '%' }] },
  ],
};

describe('sumCosts', () => {
  it('sums costs from current+1 to target', () => {
    expect(sumCosts(mockItem, 1, 3)).toEqual({ 'Tactical Analysis': 5 + 8 });
  });

  it('returns empty when current === target', () => {
    expect(sumCosts(mockItem, 3, 3)).toEqual({});
  });

  it('includes only the target level cost, not current', () => {
    expect(sumCosts(mockItem, 4, 5)).toEqual({ 'Tactical Analysis': 20 });
  });

  it('sums across multiple levels', () => {
    expect(sumCosts(mockItem, 1, 5)).toEqual({ 'Tactical Analysis': 5 + 8 + 12 + 20 });
  });
});

describe('getStatsAtLevel', () => {
  it('returns bonuses at a given level', () => {
    expect(getStatsAtLevel(mockItem, 3)).toEqual([{ type: 'Effect', value: 21, unit: '%' }]);
  });

  it('returns empty array for missing level', () => {
    expect(getStatsAtLevel(mockItem, 99)).toEqual([]);
  });
});

describe('computeNetGain', () => {
  it('computes positive gain', () => {
    const current = [{ type: 'Attack', value: 10, unit: '%' }];
    const target = [{ type: 'Attack', value: 25, unit: '%' }];
    expect(computeNetGain(current, target)).toEqual([{ type: 'Attack', value: 15, unit: '%' }]);
  });

  it('computes gain for new bonus types', () => {
    const current: { type: string; value: number; unit: string }[] = [];
    const target = [{ type: 'Health', value: 50, unit: '%' }];
    expect(computeNetGain(current, target)).toEqual([{ type: 'Health', value: 50, unit: '%' }]);
  });

  it('handles bonus type removed at target', () => {
    const current = [{ type: 'OldBuff', value: 20, unit: '%' }];
    const target: { type: string; value: number; unit: string }[] = [];
    expect(computeNetGain(current, target)).toEqual([{ type: 'OldBuff', value: -20, unit: '%' }]);
  });
});

describe('calculate', () => {
  it('returns full result for upgrade 1→4', () => {
    const result = calculate(mockItem, 1, 4);
    expect(result.totalCosts).toEqual({ 'Tactical Analysis': 25 });
    expect(result.currentBonuses).toEqual([{ type: 'Effect', value: 10, unit: '%' }]);
    expect(result.targetBonuses).toEqual([{ type: 'Effect', value: 28, unit: '%' }]);
    expect(result.netGain).toEqual([{ type: 'Effect', value: 18, unit: '%' }]);
    expect(result.upgradePath).toHaveLength(3);
    expect(result.upgradesCount).toBe(3);
  });

  it('returns empty costs and zero gain for same level', () => {
    const result = calculate(mockItem, 3, 3);
    expect(result.totalCosts).toEqual({});
    expect(result.netGain).toEqual([{ type: 'Effect', value: 0, unit: '%' }]);
    expect(result.upgradePath).toHaveLength(0);
    expect(result.upgradesCount).toBe(0);
  });
});
