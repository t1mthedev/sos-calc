export interface Bonus {
  type: string;
  value: number;
  unit: string;
}

export interface UpgradeLevel {
  level: number;
  name?: string;
  costs: Record<string, number>;
  bonuses: Bonus[];
  benefit?: string;
  skillsUnlocked?: string[];
}

export interface UpgradeItem {
  id: string;
  name: string;
  maxLevel: number;
  levels: UpgradeLevel[];
}

export interface Group {
  name: string;
  mk?: string;
  items: UpgradeItem[];
}

export interface Category {
  id: string;
  name: string;
  groups?: Group[];
  items?: UpgradeItem[];
}

export interface GameData {
  version: string;
  lastUpdated: string;
  categories: Category[];
}

export interface CalculatorResult {
  totalCosts: Record<string, number>;
  currentBonuses: Bonus[];
  targetBonuses: Bonus[];
  netGain: Bonus[];
  upgradePath: { from: UpgradeLevel; to: UpgradeLevel; costs: Record<string, number> }[];
  upgradesCount: number;
}

export interface CrateOption {
  materialKey: string;
  materialName: string;
  amount: number;
}

export interface Crate {
  id: string;
  name: string;
  categoryIds: string[];
  options: CrateOption[];
}

export interface BundleContent {
  crateId?: string;
  materialKey?: string;
  count: number;
}

export interface Bundle {
  id: string;
  name: string;
  priceDiamonds: number;
  categoryId?: string;
  contents: BundleContent[];
}

export interface SelectedUpgrade {
  itemId: string;
  currentLevel: number;
  targetLevel: number;
}

export type BehemothMk = 'MK III' | 'MK IV';

export type BehemothSection = 'enhancement' | 'levels' | 'skills';

export interface BackpackData {
  materials: Record<string, number>;
  crates: Record<string, number>;
}
