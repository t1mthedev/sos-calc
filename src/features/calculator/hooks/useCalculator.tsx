import { createContext, useContext, useReducer, useMemo, useCallback, useEffect, type ReactNode } from 'react';
import type { Category, UpgradeItem, CalculatorResult, SelectedUpgrade, BehemothMk, BehemothSection } from '../../../types';
import { getCategories, getItemById, getBehemothCategoryId, getBehemothItems, getBehemothItemsForMk, getAllBehemothItems } from '../../../services/dataService';
import { calculate } from '../utils/calculator';

const STORAGE_KEY = 'sos-calc-state';
const BEHEMOTH_ENTRY = '__behemoth__';

interface CategoryState {
  selectedGroupName: string | null;
  selectedUpgrades: SelectedUpgrade[];
}

export interface CalculatorState {
  categories: Category[];
  activeCategoryId: string | null;
  activeGroupName: string | null;
  activeUpgrades: SelectedUpgrade[];
  savedStates: Record<string, CategoryState>;
  behemothMk: string | null;
  behemothSection: string | null;
}

type Action =
  | { type: 'SELECT_CATEGORY'; categoryId: string }
  | { type: 'SELECT_GROUP'; groupName: string }
  | { type: 'ADD_UPGRADE'; itemId: string }
  | { type: 'REMOVE_UPGRADE'; itemId: string }
  | { type: 'SET_UPGRADE_CURRENT'; itemId: string; level: number }
  | { type: 'SET_UPGRADE_TARGET'; itemId: string; level: number }
  | { type: 'HYDRATE'; partial: Partial<CalculatorState> }
  | { type: 'RESET' }
  | { type: 'SELECT_BEHEMOTH_MK'; mk: string }
  | { type: 'SELECT_BEHEMOTH_SECTION'; section: string };

function flattenCatItems(cat: Category): UpgradeItem[] {
  if (cat.items) return cat.items;
  if (cat.groups) return cat.groups.flatMap(g => g.items);
  return [];
}

function allItemsFromCategories(categories: Category[]): UpgradeItem[] {
  return categories.flatMap(c => flattenCatItems(c));
}

function createInitial(): CalculatorState {
  return {
    categories: getCategories(),
    activeCategoryId: null,
    activeGroupName: null,
    activeUpgrades: [],
    savedStates: {},
    behemothMk: null,
    behemothSection: null,
  };
}

function replaceUpgrade(list: SelectedUpgrade[], itemId: string, patch: Partial<SelectedUpgrade>): SelectedUpgrade[] {
  return list.map(u => u.itemId === itemId ? { ...u, ...patch } : u);
}

function saveCurrent(state: CalculatorState): CalculatorState {
  if (!state.activeCategoryId) return state;
  const entry: CategoryState & { behemothMk?: string | null; behemothSection?: string | null } = {
    selectedGroupName: state.activeGroupName,
    selectedUpgrades: state.activeUpgrades,
  };
  if (state.activeCategoryId === BEHEMOTH_ENTRY) {
    entry.behemothMk = state.behemothMk;
    entry.behemothSection = state.behemothSection;
  }
  return {
    ...state,
    savedStates: {
      ...state.savedStates,
      [state.activeCategoryId]: entry,
    },
  };
}

function reducer(state: CalculatorState, action: Action): CalculatorState {
  switch (action.type) {
    case 'SELECT_CATEGORY': {
      if (action.categoryId === state.activeCategoryId) return state;
      const saved = saveCurrent(state);
      if (action.categoryId === BEHEMOTH_ENTRY) {
        const restored = saved.savedStates[BEHEMOTH_ENTRY] as (CategoryState & { behemothMk?: string | null; behemothSection?: string | null }) | undefined;
        return {
          ...saved,
          activeCategoryId: BEHEMOTH_ENTRY,
          activeGroupName: null,
          activeUpgrades: restored?.selectedUpgrades ?? [],
          behemothMk: restored?.behemothMk ?? null,
          behemothSection: restored?.behemothSection ?? null,
        };
      }
      const restored = saved.savedStates[action.categoryId];
      return {
        ...saved,
        activeCategoryId: action.categoryId,
        activeGroupName: restored?.selectedGroupName ?? null,
        activeUpgrades: restored?.selectedUpgrades ?? [],
        behemothMk: null,
        behemothSection: null,
      };
    }
    case 'SELECT_GROUP': {
      const next = { ...state, activeGroupName: action.groupName };
      return saveCurrent(next);
    }
    case 'SELECT_BEHEMOTH_MK': {
      const next = { ...state, behemothMk: action.mk, behemothSection: null };
      return saveCurrent(next);
    }
    case 'SELECT_BEHEMOTH_SECTION': {
      const next = { ...state, behemothSection: action.section };
      return saveCurrent(next);
    }
    case 'ADD_UPGRADE': {
      if (state.activeUpgrades.find(u => u.itemId === action.itemId)) return state;
      const next = {
        ...state,
        activeUpgrades: [...state.activeUpgrades, { itemId: action.itemId, currentLevel: 1, targetLevel: 2 }],
      };
      return saveCurrent(next);
    }
    case 'REMOVE_UPGRADE': {
      const next = { ...state, activeUpgrades: state.activeUpgrades.filter(u => u.itemId !== action.itemId) };
      return saveCurrent(next);
    }
    case 'SET_UPGRADE_CURRENT': {
      const next = { ...state, activeUpgrades: replaceUpgrade(state.activeUpgrades, action.itemId, { currentLevel: action.level }) };
      return saveCurrent(next);
    }
    case 'SET_UPGRADE_TARGET': {
      const next = { ...state, activeUpgrades: replaceUpgrade(state.activeUpgrades, action.itemId, { targetLevel: action.level }) };
      return saveCurrent(next);
    }
    case 'HYDRATE': {
      const validIds = new Set(allItemsFromCategories(state.categories).map(i => i.id));
      const raw = action.partial;
      const rawStates = (raw as any).savedStates as Record<string, CategoryState> | undefined;
      const rawActiveId = (raw as any).activeCategoryId as string | undefined;
      const rawBehemothMk = (raw as any).behemothMk as string | undefined;
      const rawBehemothSection = (raw as any).behemothSection as string | undefined;

      const migratedStates: Record<string, CategoryState> = {};

      if (rawStates && typeof rawStates === 'object') {
        for (const [catId, cs] of Object.entries(rawStates)) {
          const ups = (cs.selectedUpgrades ?? []).filter((u: SelectedUpgrade) => validIds.has(u.itemId));
          const migrated: CategoryState & { behemothMk?: string | null; behemothSection?: string | null } = {
            selectedGroupName: cs.selectedGroupName ?? null,
            selectedUpgrades: ups,
          };
          if (catId === BEHEMOTH_ENTRY) {
            const r = cs as unknown as Record<string, unknown>;
            migrated.behemothMk = (r.behemothMk as string) ?? null;
            migrated.behemothSection = (r.behemothSection as string) ?? null;
          }
          migratedStates[catId] = migrated;
        }
      } else {
        const old = raw as any;
        const oldCatId = old.selectedCategoryId as string | undefined;
        if (oldCatId && typeof oldCatId === 'string') {
          const ups = (old.selectedUpgrades ?? []).filter((u: SelectedUpgrade) => validIds.has(u.itemId));
          migratedStates[oldCatId] = {
            selectedGroupName: old.selectedGroupName ?? null,
            selectedUpgrades: ups,
          };
        }
      }

      const activeId = rawActiveId ?? (raw as any).selectedCategoryId ?? null;
      const isBehemothEntry = activeId === BEHEMOTH_ENTRY;
      const restored = activeId && !isBehemothEntry ? migratedStates[activeId] : undefined;
      return {
        ...state,
        savedStates: migratedStates,
        activeCategoryId: activeId,
        activeGroupName: restored?.selectedGroupName ?? null,
        activeUpgrades: isBehemothEntry
          ? (migratedStates[BEHEMOTH_ENTRY]?.selectedUpgrades ?? [])
          : (restored?.selectedUpgrades ?? []),
        behemothMk: isBehemothEntry ? (rawBehemothMk ?? (migratedStates[BEHEMOTH_ENTRY] as any)?.behemothMk ?? null) : null,
        behemothSection: isBehemothEntry ? (rawBehemothSection ?? (migratedStates[BEHEMOTH_ENTRY] as any)?.behemothSection ?? null) : null,
      };
    }
    case 'RESET': {
      return { ...state, activeCategoryId: null, activeGroupName: null, activeUpgrades: [], savedStates: {}, behemothMk: null, behemothSection: null };
    }
    default:
      return state;
  }
}

const CalculatorContext = createContext<{
  state: CalculatorState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

export function CalculatorProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, null, createInitial);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        dispatch({ type: 'HYDRATE', partial: parsed });
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (!state.activeCategoryId) return;
    try {
      const payload: Record<string, unknown> = {
        activeCategoryId: state.activeCategoryId,
        savedStates: state.savedStates,
      };
      if (state.activeCategoryId === BEHEMOTH_ENTRY) {
        payload.behemothMk = state.behemothMk;
        payload.behemothSection = state.behemothSection;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* quota exceeded, ignore */
    }
  }, [state.activeCategoryId, state.savedStates, state.behemothMk, state.behemothSection]);

  return (
    <CalculatorContext.Provider value={{ state, dispatch }}>
      {children}
    </CalculatorContext.Provider>
  );
}

export function clearSavedData() {
  localStorage.removeItem(STORAGE_KEY);
}

export function useCalculator() {
  const ctx = useContext(CalculatorContext);
  if (!ctx) throw new Error('useCalculator must be used within CalculatorProvider');
  const { state, dispatch } = ctx;

  const isBehemoth = state.activeCategoryId === BEHEMOTH_ENTRY;
  const selectedCategory = state.categories.find(c => c.id === state.activeCategoryId) ?? null;

  const isCombinedBehemoth = isBehemoth && (!state.behemothMk || !state.behemothSection);

  const behemothItems = useMemo(() => {
    if (!isBehemoth) return [];
    if (!state.behemothMk) {
      return getAllBehemothItems().flatMap(s => s.items);
    }
    if (!state.behemothSection) {
      return getBehemothItemsForMk(state.behemothMk as BehemothMk).flatMap(s => s.items);
    }
    const { items } = getBehemothItems(state.behemothMk as BehemothMk, state.behemothSection as BehemothSection);
    return items;
  }, [isBehemoth, state.behemothMk, state.behemothSection]);

  const behemothItemCategoryMap = useMemo(() => {
    if (!isBehemoth) return new Map<string, string>();
    const map = new Map<string, string>();
    const entries = state.behemothMk
      ? getBehemothItemsForMk(state.behemothMk as BehemothMk)
      : getAllBehemothItems();
    for (const { categoryId, items } of entries) {
      for (const item of items) {
        map.set(item.id, categoryId);
      }
    }
    return map;
  }, [isBehemoth, state.behemothMk]);

  const behemothCategoryId = useMemo(() => {
    if (!isBehemoth || !state.behemothMk) return null;
    if (state.behemothSection) return getBehemothCategoryId(state.behemothSection as BehemothSection);
    return 'behemoth-enhancement';
  }, [isBehemoth, state.behemothMk, state.behemothSection]);

  const allItems = isBehemoth ? behemothItems : (selectedCategory ? flattenCatItems(selectedCategory) : []);
  const selectedGroup = selectedCategory?.groups?.find(g => g.name === state.activeGroupName) ?? null;
  const groupItems = selectedGroup?.items ?? [];

  const results = useMemo(() => {
    const map = new Map<string, CalculatorResult>();
    const catId = isBehemoth ? behemothCategoryId : state.activeCategoryId;
    const validIds = isBehemoth ? new Set(behemothItems.map(i => i.id)) : null;
    const lookupCatId = (itemId: string) => {
      if (!isCombinedBehemoth) return catId ?? '';
      return behemothItemCategoryMap.get(itemId) ?? catId ?? '';
    };
    for (const sel of state.activeUpgrades) {
      if (sel.currentLevel < 1 || sel.targetLevel < 1) continue;
      if (validIds && !validIds.has(sel.itemId)) continue;
      const item = getItemById(lookupCatId(sel.itemId), sel.itemId);
      if (!item) continue;
      map.set(sel.itemId, calculate(item, sel.currentLevel, sel.targetLevel));
    }
    return map;
  }, [state.activeUpgrades, state.activeCategoryId, isBehemoth, behemothCategoryId, behemothItems, behemothItemCategoryMap, isCombinedBehemoth]);

  const combinedCosts = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const result of results.values()) {
      for (const [key, val] of Object.entries(result.totalCosts)) {
        totals[key] = (totals[key] || 0) + val;
      }
    }
    return totals;
  }, [results]);

  const hasSavedData = useMemo(() => {
    if (state.activeUpgrades.length > 0) return true;
    return Object.values(state.savedStates).some(s => s.selectedUpgrades.length > 0);
  }, [state.activeUpgrades, state.savedStates]);

  const selectCategory = useCallback((categoryId: string) => dispatch({ type: 'SELECT_CATEGORY', categoryId }), [dispatch]);
  const selectGroup = useCallback((groupName: string) => dispatch({ type: 'SELECT_GROUP', groupName }), [dispatch]);
  const addUpgrade = useCallback((itemId: string) => dispatch({ type: 'ADD_UPGRADE', itemId }), [dispatch]);
  const removeUpgrade = useCallback((itemId: string) => dispatch({ type: 'REMOVE_UPGRADE', itemId }), [dispatch]);
  const setUpgradeCurrent = useCallback((itemId: string, level: number) => dispatch({ type: 'SET_UPGRADE_CURRENT', itemId, level }), [dispatch]);
  const setUpgradeTarget = useCallback((itemId: string, level: number) => dispatch({ type: 'SET_UPGRADE_TARGET', itemId, level }), [dispatch]);
  const reset = useCallback(() => {
    clearSavedData();
    dispatch({ type: 'RESET' });
  }, [dispatch]);
  const selectBehemothMk = useCallback((mk: string) => dispatch({ type: 'SELECT_BEHEMOTH_MK', mk }), [dispatch]);
  const selectBehemothSection = useCallback((section: string) => dispatch({ type: 'SELECT_BEHEMOTH_SECTION', section }), [dispatch]);

  return useMemo(() => ({
    selectedCategoryId: state.activeCategoryId,
    selectedGroupName: state.activeGroupName,
    selectedUpgrades: state.activeUpgrades,
    categories: state.categories,
    selectedCategory,
    allItems,
    selectedGroup,
    groupItems,
    results,
    combinedCosts,
    hasSavedData,
    isBehemoth,
    isCombinedBehemoth,
    behemothMk: state.behemothMk,
    behemothSection: state.behemothSection,
    behemothCategoryId,
    selectCategory,
    selectGroup,
    addUpgrade,
    removeUpgrade,
    setUpgradeCurrent,
    setUpgradeTarget,
    reset,
    selectBehemothMk,
    selectBehemothSection,
  }), [state, selectedCategory, allItems, selectedGroup, groupItems, results, combinedCosts, hasSavedData,
      isBehemoth, isCombinedBehemoth, behemothCategoryId,
      selectCategory, selectGroup, addUpgrade, removeUpgrade, setUpgradeCurrent, setUpgradeTarget, reset,
      selectBehemothMk, selectBehemothSection]);
}
