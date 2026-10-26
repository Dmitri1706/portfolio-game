import { el } from './modal';

/**
 * Ненавязчивая подсказка «Поверните телефон» в вертикальной ориентации.
 * Игра остаётся играбельной; подсказку можно закрыть крестиком.
 */
export function orientationHint(): void {
  const root = document.getElementById('ui');
  if (!root) return;
  const mq = window.matchMedia('(hover: none) and (orientation: portrait)');
  const hint = el('div', 'rotate-hint pixel-box');
  hint.appendChild(el('span', 'rotate-hint__icon', '↻'));
  hint.appendChild(el('span', '', 'Поверните телефон — так удобнее играть'));
  const close = el('button', 'rotate-hint__close', '✕');
  close.type = 'button';
  close.setAttribute('aria-label', 'Скрыть подсказку');
  hint.appendChild(close);
  let dismissed = false;
  close.addEventListener('click', () => {
    dismissed = true;
    hint.hidden = true;
  });
  const update = () => (hint.hidden = dismissed || !mq.matches);
  mq.addEventListener('change', update);
  update();
  root.appendChild(hint);
}
