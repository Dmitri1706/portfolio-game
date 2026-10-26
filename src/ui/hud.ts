import { el } from './modal';
import { showRules } from './rules';

let progressEl: HTMLElement | null = null;

/** Кнопки в углах экрана. (Звук, «Связаться», «Быстрый просмотр» — на Этапе 5.) */
export function createHud(): void {
  const root = document.getElementById('ui');
  if (!root || root.querySelector('.hud')) return;
  const right = el('div', 'hud hud--top-right');
  const help = el('button', 'btn', '?');
  help.type = 'button';
  help.title = 'Правила';
  help.setAttribute('aria-label', 'Правила');
  help.addEventListener('click', () => showRules());
  right.appendChild(help);
  root.appendChild(right);

  const left = el('div', 'hud hud--top-left');
  progressEl = el('div', 'hud-label pixel-box');
  progressEl.hidden = true;
  left.appendChild(progressEl);
  root.appendChild(left);
}

/** Счётчик прогресса текущей комнаты, например «Изучено: 2/5». null — скрыть. */
export function setProgressLabel(text: string | null): void {
  if (!progressEl) return;
  progressEl.hidden = text == null;
  if (text != null && progressEl.textContent !== text) {
    progressEl.textContent = text;
    progressEl.classList.remove('is-bump');
    void progressEl.offsetWidth;
    progressEl.classList.add('is-bump');
  }
}
