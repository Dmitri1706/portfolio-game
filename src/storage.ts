/**
 * Сохранение в localStorage. Все чтения и записи обёрнуты в try/catch:
 * если браузер запрещает хранилище (приватный режим и т.п.), данные живут в памяти до перезагрузки.
 */
const PREFIX = 'melshin-portfolio:';
const memory = new Map<string, string>();

export function load<T>(key: string, fallback: T): T {
  let raw: string | null | undefined;
  try {
    raw = localStorage.getItem(PREFIX + key);
  } catch {
    raw = undefined;
  }
  if (raw == null) raw = memory.get(key);
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown): void {
  const raw = JSON.stringify(value);
  memory.set(key, raw);
  try {
    localStorage.setItem(PREFIX + key, raw);
  } catch {
    // хранилище недоступно — остаётся копия в памяти
  }
}
