/** Окна поверх игры (HTML-слой). Пока открыто хотя бы одно окно, персонаж не ходит. */

export interface ModalButton {
  label: string;
  ghost?: boolean;
  onClick?: (close: () => void) => void;
  /** Кнопка-ссылка: открывается в новой вкладке (или скачивается, если download) */
  href?: string;
  download?: boolean;
}

export interface ModalOptions {
  title?: string;
  content: HTMLElement | string;
  /** Доп. класс панели (например, рамка «под предмет») */
  className?: string;
  buttons?: ModalButton[];
  /** Надпись кнопки закрытия. false — без неё (закрыть можно своими кнопками или Esc) */
  backLabel?: string | false;
  onClose?: () => void;
}

export interface ModalHandle {
  el: HTMLElement;
  close: () => void;
}

const stack: ModalHandle[] = [];
/** Другие окна поверх игры (например, диалог), которые тоже останавливают персонажа */
let locks = 0;

export function isUiOpen(): boolean {
  return stack.length > 0 || locks > 0;
}

export function lockUi(): void {
  locks++;
}

export function unlockUi(): void {
  locks = Math.max(0, locks - 1);
}

function root(): HTMLElement {
  return document.getElementById('ui') ?? document.body;
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text != null) e.textContent = text;
  return e;
}

export function makeButton(b: ModalButton, close?: () => void): HTMLElement {
  const cls = b.ghost ? 'btn btn--ghost' : 'btn';
  if (b.href) {
    const a = el('a', cls, b.label);
    a.href = b.href;
    a.target = '_blank';
    a.rel = 'noopener';
    if (b.download) a.setAttribute('download', '');
    if (b.onClick) a.addEventListener('click', () => b.onClick?.(close ?? (() => {})));
    return a;
  }
  const btn = el('button', cls, b.label);
  btn.type = 'button';
  btn.addEventListener('click', () => (b.onClick ? b.onClick(close ?? (() => {})) : close?.()));
  return btn;
}

export function openModal(opts: ModalOptions): ModalHandle {
  const wrap = el('div', 'modal');
  const panel = el('div', `modal__panel pixel-box ${opts.className ?? ''}`.trim());
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  wrap.appendChild(panel);

  if (opts.title) {
    const h = el('h2', 'modal__title', opts.title);
    panel.appendChild(h);
    panel.setAttribute('aria-label', opts.title);
  }
  const body = el('div', 'modal__body');
  if (typeof opts.content === 'string') body.innerHTML = opts.content;
  else body.appendChild(opts.content);
  panel.appendChild(body);

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    const i = stack.indexOf(handle);
    if (i >= 0) stack.splice(i, 1);
    wrap.classList.add('is-closing');
    setTimeout(() => wrap.remove(), 180);
    opts.onClose?.();
  };
  const handle: ModalHandle = { el: panel, close };

  const buttons = el('div', 'modal__buttons');
  if (opts.backLabel !== false) {
    const back = el('button', 'btn btn--ghost', opts.backLabel ?? '← Назад');
    back.type = 'button';
    back.addEventListener('click', close);
    buttons.appendChild(back);
  }
  for (const b of opts.buttons ?? []) {
    buttons.appendChild(makeButton(b, close));
  }
  if (buttons.children.length) panel.appendChild(buttons);

  // клик по затемнению вокруг окна тоже закрывает
  wrap.addEventListener('pointerdown', (e) => {
    if (e.target === wrap) close();
  });

  root().appendChild(wrap);
  stack.push(handle);
  (buttons.lastElementChild as HTMLElement | null)?.focus({ preventScroll: true });
  return handle;
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && stack.length) {
    e.preventDefault();
    stack[stack.length - 1].close();
  }
});
