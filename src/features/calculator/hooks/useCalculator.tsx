import { createContext, useContext, useReducer, useMemo, useCallback, useEffect, useState, type ReactNode } from 'react';
import type { Category, UpgradeItem, CalculatorResult, SelectedUpgrade, BehemothMk, BehemothSection, MechSection } from '../../../types';
import { getCategories, getItemById, getBehemothCategoryId, getBehemothItems, getBehemothItemsForMk, getAllBehemothItems, getBehemothItemMkMap, getMechCategoryId, getMechItems, getAllMechItems } from '../../../services/dataService';
import { calculate } from '../utils/calculator';

const STORAGE_KEY = 'sos-calc-state';
const BEHEMOTH_CATEGORY_IDS = ['behemoth-enhancement', 'behemoth-levels', 'behemoth-skills'];
const MECH_CATEGORY_IDS = ['mech-enhancement', 'mech-skills'];
const GROUP_SCOPED_CATEGORIES = new Set(['aircraft', 'spacecraft', 'vehicles']);

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
  mechSection: string | null;
}

type Action =
  | { type: 'SELECT_CATEGORY'; categoryId: string }
  | { type: 'SELECT_GROUP'; groupName: string }
  | { type: 'ADD_UPGRADE'; itemId: string }
  | { type: 'REMOVE_UPGRADE'; itemId: string }
  | { type: 'SET_UPGRADE_CURRENT'; itemId: string; level: number }
  | { type: 'SET_UPGRADE_TARGET'; itemId: string; level: number }
  | { type: 'HYDRATE'; partial: Partial<CalculatorState> }
  | { type: 'SYNC_STORAGE'; partial: Partial<CalculatorState> }
  | { type: 'RESET' }
  | { type: 'CLEAR_CATEGORY' }
  | { type: 'SYNC_BEHEMOTH'; mk: string | null; section: string | null }
  | { type: 'SYNC_MECH'; section: string | null }
  | { type: 'HYDRATE_FROM_URL'; categoryId: string | null; groupName?: string };

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
    mechSection: null,
  };
}

function replaceUpgrade(list: SelectedUpgrade[], itemId: string, patch: Partial<SelectedUpgrade>): SelectedUpgrade[] {
  return list.map(u => u.itemId === itemId ? { ...u, ...patch } : u);
}

function saveCurrent(state: CalculatorState): CalculatorState {
  if (!state.activeCategoryId) return state;
  const entry: CategoryState = {
    selectedGroupName: state.activeGroupName,
    selectedUpgrades: state.activeUpgrades,
  };
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
      const restored = saved.savedStates[action.categoryId];
      return {
        ...saved,
        activeCategoryId: action.categoryId,
        activeGroupName: restored?.selectedGroupName ?? null,
        activeUpgrades: restored?.selectedUpgrades ?? [],
        behemothMk: null,
        behemothSection: null,
        mechSection: null,
      };
    }
    case 'SELECT_GROUP': {
      const next = { ...state, activeGroupName: action.groupName };
      return saveCurrent(next);
    }
    case 'SYNC_BEHEMOTH': {
      if (action.mk && action.section) {
        const categoryId = getBehemothCategoryId(action.section as BehemothSection);
        const saved = state.savedStates[categoryId] ?? { selectedGroupName: null, selectedUpgrades: [] };
        return {
          ...state,
          activeCategoryId: categoryId,
          activeGroupName: null,
          activeUpgrades: saved.selectedUpgrades ?? [],
          behemothMk: action.mk,
          behemothSection: action.section,
        };
      }
      return {
        ...state,
        activeCategoryId: null,
        activeGroupName: null,
        activeUpgrades: [],
        behemothMk: action.mk,
        behemothSection: action.section,
      };
    }
    case 'SYNC_MECH': {
      if (action.section) {
        const categoryId = getMechCategoryId(action.section as MechSection);
        const saved = state.savedStates[categoryId] ?? { selectedGroupName: null, selectedUpgrades: [] };
        return {
          ...state,
          activeCategoryId: categoryId,
          activeGroupName: null,
          activeUpgrades: saved.selectedUpgrades ?? [],
          behemothMk: null,
          behemothSection: null,
          mechSection: action.section,
        };
      }
      return {
        ...state,
        activeCategoryId: null,
        activeGroupName: null,
        activeUpgrades: [],
        behemothMk: null,
        behemothSection: null,
        mechSection: null,
      };
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

      const itemCategoryMap = new Map<string, string>();
      for (const { categoryId, items } of getAllBehemothItems()) {
        for (const item of items) itemCategoryMap.set(item.id, categoryId);
      }

      const migratedStates: Record<string, CategoryState> = {};

      const mergeBehemothUpgrades = (ups: SelectedUpgrade[]) => {
        for (const u of ups) {
          const targetCat = itemCategoryMap.get(u.itemId);
          if (!targetCat) continue;
          const existing = [...(migratedStates[targetCat]?.selectedUpgrades ?? [])];
          const idx = existing.findIndex(e => e.itemId === u.itemId);
          if (idx >= 0) existing[idx] = u;
          else existing.push(u);
          migratedStates[targetCat] = {
            selectedGroupName: migratedStates[targetCat]?.selectedGroupName ?? null,
            selectedUpgrades: existing,
          };
        }
      };

      if (rawStates && typeof rawStates === 'object') {
        const legacyBehemothUpgrades: SelectedUpgrade[] = [];
        for (const [catId, cs] of Object.entries(rawStates)) {
          const ups = (cs.selectedUpgrades ?? []).filter((u: SelectedUpgrade) => validIds.has(u.itemId));
          if (catId === '__behemoth__') {
            legacyBehemothUpgrades.push(...ups);
            continue;
          }
          migratedStates[catId] = {
            selectedGroupName: cs.selectedGroupName ?? null,
            selectedUpgrades: ups,
          };
        }
        mergeBehemothUpgrades(legacyBehemothUpgrades);
      } else {
        const old = raw as any;
        const oldCatId = old.selectedCategoryId as string | undefined;
        if (oldCatId && typeof oldCatId === 'string') {
          const ups = (old.selectedUpgrades ?? []).filter((u: SelectedUpgrade) => validIds.has(u.itemId));
          if (oldCatId === '__behemoth__') {
            mergeBehemothUpgrades(ups);
          } else {
            migratedStates[oldCatId] = {
              selectedGroupName: old.selectedGroupName ?? null,
              selectedUpgrades: ups,
            };
          }
        }
      }

      const activeId = rawActiveId === '__behemoth__' ? null : (rawActiveId ?? (raw as any).selectedCategoryId ?? null);
      const restored = activeId ? migratedStates[activeId] : undefined;
      return {
        ...state,
        savedStates: migratedStates,
        activeCategoryId: activeId,
        activeGroupName: restored?.selectedGroupName ?? null,
        activeUpgrades: restored?.selectedUpgrades ?? [],
        behemothMk: state.behemothMk,
        behemothSection: state.behemothSection,
        mechSection: state.mechSection,
      };
    }
    case 'SYNC_STORAGE': {
      const validIds = new Set(allItemsFromCategories(state.categories).map(i => i.id));
      const rawStates = (action.partial as any)?.savedStates as Record<string, CategoryState> | undefined;
      if (!rawStates || typeof rawStates !== 'object') return state;
      const newStates: Record<string, CategoryState> = {};
      for (const [catId, cs] of Object.entries(rawStates)) {
        const ups = (cs.selectedUpgrades ?? []).filter((u: SelectedUpgrade) => validIds.has(u.itemId));
        newStates[catId] = {
          selectedGroupName: cs.selectedGroupName ?? null,
          selectedUpgrades: ups,
        };
      }
      return {
        ...state,
        savedStates: newStates,
      };
    }
    case 'RESET': {
      return { ...state, activeCategoryId: null, activeGroupName: null, activeUpgrades: [], savedStates: {}, behemothMk: null, behemothSection: null, mechSection: null };
    }
    case 'CLEAR_CATEGORY': {
      if (!state.activeCategoryId) return state;
      return {
        ...state,
        activeUpgrades: [],
        savedStates: { ...state.savedStates, [state.activeCategoryId]: { selectedGroupName: null, selectedUpgrades: [] } },
      };
    }
    case 'HYDRATE_FROM_URL': {
      const restored = action.categoryId ? state.savedStates[action.categoryId] : undefined;
      return {
        ...state,
        activeCategoryId: action.categoryId,
        activeGroupName: action.groupName ?? restored?.selectedGroupName ?? null,
        activeUpgrades: restored?.selectedUpgrades ?? [],
        behemothMk: null,
        behemothSection: null,
        mechSection: null,
      };
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
  const [hydrated, setHydrated] = useState(false);

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
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      const payload: Record<string, unknown> = {
        activeCategoryId: state.activeCategoryId,
        savedStates: state.savedStates,
      };
      const serialized = JSON.stringify(payload);
      if (localStorage.getItem(STORAGE_KEY) === serialized) return;
      localStorage.setItem(STORAGE_KEY, serialized);
    } catch {
      /* quota exceeded, ignore */
    }
  }, [hydrated, state.activeCategoryId, state.savedStates]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      if (event.newValue === null) {
        dispatch({ type: 'RESET' });
        return;
      }
      try {
        const parsed = JSON.parse(event.newValue);
        dispatch({ type: 'SYNC_STORAGE', partial: parsed });
      } catch {
        /* ignore malformed data from other tabs */
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [dispatch]);

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

  const isBehemoth = BEHEMOTH_CATEGORY_IDS.includes(state.activeCategoryId ?? '');
  const isMech = MECH_CATEGORY_IDS.includes(state.activeCategoryId ?? '');
  const selectedCategory = state.categories.find(c => c.id === state.activeCategoryId) ?? null;

  const isCombinedBehemoth = isBehemoth && (!state.behemothMk || !state.behemothSection);

  const behemothItemMkMap = useMemo(() => getBehemothItemMkMap(), []);

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

  const mechCategoryId = useMemo(() => {
    if (!isMech || !state.mechSection) return null;
    return getMechCategoryId(state.mechSection as MechSection);
  }, [isMech, state.mechSection]);

  const mechItems = useMemo(() => {
    if (!isMech || !state.mechSection) return [];
    const { items } = getMechItems(state.mechSection as MechSection);
    return items;
  }, [isMech, state.mechSection]);

  const mechItemCategoryMap = useMemo(() => {
    if (!isMech) return new Map<string, string>();
    const map = new Map<string, string>();
    for (const { categoryId, items } of getAllMechItems()) {
      for (const item of items) map.set(item.id, categoryId);
    }
    return map;
  }, [isMech]);

  const isCombinedMech = isMech && !state.mechSection;

  const allItems = useMemo(() => {
    if (isBehemoth) return behemothItems;
    if (isMech) {
      if (!state.mechSection) return getAllMechItems().flatMap(s => s.items);
      return mechItems;
    }
    return selectedCategory ? flattenCatItems(selectedCategory) : [];
  }, [isBehemoth, isMech, behemothItems, mechItems, state.mechSection, selectedCategory]);
  const selectedGroup = selectedCategory?.groups?.find(g => g.name === state.activeGroupName) ?? null;
  const groupItems = selectedGroup?.items ?? [];

  const visibleUpgrades = useMemo(() => {
    if (isBehemoth) {
      if (!state.behemothMk) return [];
      return state.activeUpgrades.filter(u => (behemothItemMkMap.get(u.itemId) ?? null) === state.behemothMk);
    }
    if (isMech) {
      if (!state.mechSection) return [];
      return state.activeUpgrades;
    }
    if (!GROUP_SCOPED_CATEGORIES.has(state.activeCategoryId ?? '')) return state.activeUpgrades;
    if (!selectedGroup) return state.activeUpgrades;
    const ids = new Set(selectedGroup.items.map(i => i.id));
    return state.activeUpgrades.filter(u => ids.has(u.itemId));
  }, [isBehemoth, isMech, state.activeCategoryId, state.activeUpgrades, selectedGroup, state.behemothMk, behemothItemMkMap, state.mechSection]);

  const results = useMemo(() => {
    const map = new Map<string, CalculatorResult>();
    const catId = isBehemoth ? behemothCategoryId : isMech ? mechCategoryId : state.activeCategoryId;
    const validIds = isBehemoth ? new Set(behemothItems.map(i => i.id)) : isMech ? new Set(mechItems.map(i => i.id)) : null;
    const lookupCatId = (itemId: string) => {
      if (isCombinedBehemoth) return behemothItemCategoryMap.get(itemId) ?? catId ?? '';
      if (isCombinedMech) return mechItemCategoryMap.get(itemId) ?? catId ?? '';
      return catId ?? '';
    };
    for (const sel of visibleUpgrades) {
      if (sel.currentLevel < 1 || sel.targetLevel < 1) continue;
      if (validIds && !validIds.has(sel.itemId)) continue;
      const item = getItemById(lookupCatId(sel.itemId), sel.itemId);
      if (!item) continue;
      map.set(sel.itemId, calculate(item, sel.currentLevel, sel.targetLevel));
    }
    return map;
  }, [visibleUpgrades, state.activeCategoryId, isBehemoth, isMech, behemothCategoryId, mechCategoryId, behemothItems, mechItems, behemothItemCategoryMap, mechItemCategoryMap, isCombinedBehemoth, isCombinedMech]);

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

  const hasCurrentData = state.activeUpgrades.length > 0;

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
  const clearCategory = useCallback(() => dispatch({ type: 'CLEAR_CATEGORY' }), [dispatch]);
  const dispatchAction = dispatch;

  return useMemo(() => ({
    dispatch: dispatchAction,
    selectedCategoryId: state.activeCategoryId,
    selectedGroupName: state.activeGroupName,
    selectedUpgrades: visibleUpgrades,
    categories: state.categories,
    selectedCategory,
    allItems,
    selectedGroup,
    groupItems,
    results,
    combinedCosts,
    hasSavedData,
    hasCurrentData,
    isBehemoth,
    isCombinedBehemoth,
    behemothMk: state.behemothMk,
    behemothSection: state.behemothSection,
    behemothCategoryId,
    isMech,
    isCombinedMech,
    mechSection: state.mechSection,
    mechCategoryId,
    selectCategory,
    selectGroup,
    addUpgrade,
    removeUpgrade,
    setUpgradeCurrent,
    setUpgradeTarget,
    reset,
    clearCategory,
  }  ), [state, selectedCategory, allItems, selectedGroup, groupItems, results, combinedCosts, hasSavedData,
      hasCurrentData, isBehemoth, isCombinedBehemoth, behemothCategoryId,
      isMech, isCombinedMech, mechCategoryId,
      selectCategory, selectGroup, addUpgrade, removeUpgrade, setUpgradeCurrent, setUpgradeTarget, reset,
      clearCategory, dispatchAction, visibleUpgrades]);
}
