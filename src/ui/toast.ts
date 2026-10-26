import { el } from './modal';
import { sfx } from '../audio';

/** Всплывающая ачивка сверху экрана. */
export function showAchievement(text: string, sub = 'Ачивка получена'): void {
  const root = document.getElementById('ui') ?? document.body;
  const t = el('div', 'toast pixel-box');
  t.setAttribute('role', 'status');
  t.appendChild(el('div', 'toast__sub', sub));
  t.appendChild(el('div', 'toast__title', text));
  root.appendChild(t);
  sfx('achievement');
  setTimeout(() => t.classList.add('is-leaving'), 4200);
  setTimeout(() => t.remove(), 4600);
}
