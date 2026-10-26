import { load, save } from './storage';
import { track } from './analytics';

/** Прогресс игрока: что изучено в комнатах и какие ачивки получены. Хранится в localStorage. */
interface Progress {
  explored: Record<string, string[]>;
  achievements: string[];
  counters: Record<string, number>;
}

const KEY = 'progress';
const state: Progress = load<Progress>(KEY, { explored: {}, achievements: [], counters: {} });
state.explored ??= {};
state.achievements ??= [];
state.counters ??= {};

const persist = () => save(KEY, state);

/** Отметить предмет комнаты как изученный. Возвращает новое число изученных. */
export function explore(room: string, id: string): number {
  const list = (state.explored[room] ??= []);
  if (!list.includes(id)) {
    list.push(id);
    persist();
  }
  return list.length;
}

export function exploredCount(room: string): number {
  return state.explored[room]?.length ?? 0;
}

export function isExplored(room: string, id: string): boolean {
  return state.explored[room]?.includes(id) ?? false;
}

export function counter(id: string): number {
  return state.counters[id] ?? 0;
}

/** Увеличить счётчик (например, расставленные пары). Возвращает новое значение. */
export function addCounter(id: string, by = 1): number {
  state.counters[id] = counter(id) + by;
  persist();
  return state.counters[id];
}

export function hasAchievement(id: string): boolean {
  return state.achievements.includes(id);
}

/** Выдать ачивку. true — если получена впервые. */
export function achieve(id: string): boolean {
  if (hasAchievement(id)) return false;
  state.achievements.push(id);
  persist();
  track('achievement', { id });
  return true;
}
