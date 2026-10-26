import { el } from './modal';
import { showRules } from './rules';

/** Кнопки в углах экрана. (Звук, «Связаться», «Быстрый просмотр» и счётчик — на Этапе 5.) */
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
}
