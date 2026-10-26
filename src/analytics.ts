/**
 * Аналитика на будущее. Сейчас ничего не отправляет.
 * Позже сюда подключится Яндекс Метрика (ym(…, 'reachGoal', event, params)).
 */
export function track(event: string, params?: Record<string, unknown>): void {
  if (import.meta.env.DEV) console.debug('[track]', event, params ?? '');
}
