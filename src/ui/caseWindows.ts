import { CASES, RESUME, SETTINGS, asset, md, mdPages } from '../content';
import { el, makeButton, openModal, type ModalButton } from './modal';
import { PdfViewer, onSwipe } from './pdfViewer';
import { videoEmbedUrl } from './video';
import { contactsBlock } from './contacts';

/**
 * Общий шаблон окна взаимодействия:
 * слева — контент в рамке «под предмет», справа — текст кейса (Задача → Что я сделал → Результат → Инструменты).
 * На телефоне панель с текстом уходит под контент.
 */
interface CaseWindowOptions {
  frame: 'monitor' | 'stage' | 'newspaper' | 'phone' | 'folder' | 'board' | 'event';
  title: string;
  /** Содержимое рамки */
  content: HTMLElement;
  /** Правая панель: HTML текста кейса или готовый элемент */
  side: string | HTMLElement;
  /** Кнопки под контентом (ссылки, скачать…) */
  tools?: (ModalButton | HTMLElement)[];
  onClose: () => void;
  /** Стрелки ← → на клавиатуре */
  onArrow?: (dir: -1 | 1) => void;
}

function openCaseWindow(o: CaseWindowOptions): void {
  const grid = el('div', 'case');
  const left = el('div', 'case__main');
  const frame = el('div', `frame frame--${o.frame}`);
  frame.appendChild(o.content);
  left.appendChild(frame);
  // «Назад» — в одном ряду с остальными кнопками, чтобы окно было ниже
  const tools = el('div', 'case__tools');
  tools.appendChild(makeButton({ label: '← Назад', ghost: true, onClick: () => handle.close() }));
  o.tools?.forEach((b) => tools.appendChild(b instanceof HTMLElement ? b : makeButton(b)));
  left.appendChild(tools);
  const side = el('div', 'case__side');
  if (typeof o.side === 'string') side.innerHTML = o.side;
  else side.appendChild(o.side);
  grid.append(left, side);

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') o.onArrow?.(1);
    if (e.key === 'ArrowLeft') o.onArrow?.(-1);
  };
  if (o.onArrow) window.addEventListener('keydown', onKey);

  const handle = openModal({
    className: 'modal__panel--case',
    title: o.title,
    content: grid,
    backLabel: false,
    onClose: () => {
      window.removeEventListener('keydown', onKey);
      o.onClose();
    },
  });
}

/** Навигация «◀ 2 / 6 ▶» */
function pager(prev: () => void, next: () => void): { el: HTMLElement; set: (p: number, t: number) => void } {
  const nav = el('div', 'pager');
  const b1 = el('button', 'btn pager__btn', '◀');
  const b2 = el('button', 'btn pager__btn', '▶');
  b1.type = b2.type = 'button';
  b1.setAttribute('aria-label', 'Назад');
  b2.setAttribute('aria-label', 'Вперёд');
  const label = el('span', 'pager__label', '…');
  b1.addEventListener('click', prev);
  b2.addEventListener('click', next);
  nav.append(b1, label, b2);
  return {
    el: nav,
    set: (p, t) => {
      label.textContent = t ? `${p} / ${t}` : '…';
      b1.disabled = p <= 1;
      b2.disabled = p >= t;
    },
  };
}

// ================= 1. Компьютер: сайт =================

export function openSiteWindow(onClose: () => void): void {
  const s = SETTINGS.site;
  const screen = el('div', 'frame__screen');
  const showSite = () => {
    const f = el('iframe', 'site-frame');
    f.src = s.url;
    f.title = 'Сайт';
    f.loading = 'lazy';
    f.referrerPolicy = 'no-referrer-when-downgrade';
    f.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-forms');
    screen.replaceChildren(f);
  };
  const showShot = () => {
    const wrap = el('div', 'site-shot');
    const img = el('img');
    img.src = asset(s.screenshot);
    img.alt = 'Скриншот сайта';
    wrap.appendChild(img);
    screen.replaceChildren(wrap);
  };
  // Если сайт запрещает встраивание — выставьте "embed": false, и сразу покажется скриншот
  let usingShot = !s.embed || !s.url;
  (usingShot ? showShot : showSite)();
  const label = () => (usingShot ? 'Показать живой сайт' : 'Не грузится? Скриншот');

  const tools: (ModalButton | HTMLElement)[] = [];
  if (s.url) tools.push({ label: 'Открыть сайт в новой вкладке ↗', href: s.url });
  if (s.url && s.screenshot) {
    const toggle = makeButton({
      label: label(),
      ghost: true,
      onClick: () => {
        usingShot = !usingShot;
        (usingShot ? showShot : showSite)();
        toggle.textContent = label();
      },
    });
    tools.push(toggle);
  }

  openCaseWindow({ frame: 'monitor', title: 'Сайт', content: screen, side: md(CASES.site), tools, onClose });
}

// ================= 2. Сцена: презентация =================

export function openPresentationWindow(onClose: () => void, onLastSlide: () => void): void {
  const wrap = el('div', 'stage-view');
  const screen = el('div', 'frame__screen stage-view__screen');
  const audience = el('div', 'audience');
  audience.style.setProperty('--sheet', `url(${import.meta.env.BASE_URL}assets/sprites/spectators.png)`);
  for (let i = 0; i < 7; i++) {
    const a = el('div', 'audience__seat');
    a.style.setProperty('--row', String(i % 3));
    a.style.animationDelay = `${(i * 70) % 300}ms`;
    audience.appendChild(a);
  }
  let shownPage = 0;
  const viewer = new PdfViewer(screen, asset(SETTINGS.presentation.pdf), (p, t) => {
    nav.set(p, t);
    if (p === shownPage) return; // та же страница (перерисовка при изменении размера)
    shownPage = p;
    const last = t > 0 && p === t;
    audience.classList.toggle('is-clapping', last);
    if (last) onLastSlide();
  });
  const nav = pager(
    () => viewer.prev(),
    () => viewer.next(),
  );
  onSwipe(screen, () => viewer.next(), () => viewer.prev());
  wrap.append(screen, nav.el, audience);
  openCaseWindow({
    frame: 'stage',
    title: 'Презентация',
    content: wrap,
    side: md(CASES.presentation),
    onClose: () => {
      viewer.destroy();
      onClose();
    },
    onArrow: (d) => (d > 0 ? viewer.next() : viewer.prev()),
  });
  viewer.open();
}

// ================= 3. Газета: медиакит =================

export function openMediakitWindow(onClose: () => void): void {
  const wrap = el('div', 'paper-view');
  wrap.appendChild(el('div', 'newspaper__head', 'МЕДИАКИТ'));
  const screen = el('div', 'frame__screen paper-view__screen');
  const viewer = new PdfViewer(screen, asset(SETTINGS.mediakit.pdf), (p, t) => nav.set(p, t));
  const nav = pager(
    () => viewer.prev(),
    () => viewer.next(),
  );
  onSwipe(screen, () => viewer.next(), () => viewer.prev());
  wrap.append(screen, nav.el);
  openCaseWindow({
    frame: 'newspaper',
    title: 'МедиаКит',
    content: wrap,
    side: md(CASES.mediakit),
    tools: [{ label: 'Скачать PDF ⬇', href: asset(SETTINGS.mediakit.pdf), download: true }],
    onClose: () => {
      viewer.destroy();
      onClose();
    },
    onArrow: (d) => (d > 0 ? viewer.next() : viewer.prev()),
  });
  viewer.open();
}

// ================= 4. Телефон: вебинар =================

export function openWebinarWindow(onClose: () => void): void {
  const stage = el('div', 'phone-stage');
  const phone = el('div', 'phone');
  const screen = el('div', 'phone__screen');
  phone.appendChild(screen);
  stage.appendChild(phone);
  // "embed" — готовый адрес для встраивания (нужен для приватных видео с ключом доступа)
  const w = SETTINGS.webinar as { url: string; embed?: string };
  const url = w.embed?.trim() || videoEmbedUrl(w.url);
  // видео вставляется, когда телефон повернулся горизонтально
  phone.addEventListener(
    'animationend',
    () => {
      if (url) {
        const f = el('iframe');
        f.src = url;
        f.title = 'Вебинар';
        f.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture; screen-wake-lock';
        f.allowFullscreen = true;
        f.referrerPolicy = 'strict-origin-when-cross-origin';
        screen.replaceChildren(f);
      } else {
        screen.innerHTML =
          '<div class="phone__empty">▶<br>Здесь будет запись вебинара.<br><small>Ссылка — в content/settings.json → webinar → url</small></div>';
      }
    },
    { once: true },
  );
  const tools: ModalButton[] = [];
  if (w.url) tools.push({ label: /rutube\.ru/.test(w.url) ? 'Смотреть на Rutube ↗' : 'Открыть видео ↗', href: w.url });
  openCaseWindow({ frame: 'phone', title: 'Вебинар', content: stage, side: md(CASES.webinar), tools, onClose });
}

// ================= 6. Трибуна: мероприятие по HR-автоматизации =================

export function openEventWindow(onClose: () => void): void {
  const photo = SETTINGS.event.photo;
  const view = el('div', 'event-photo');
  if (photo) {
    const img = el('img');
    img.src = asset(photo);
    img.alt = 'Фото с мероприятия';
    view.appendChild(img);
  } else {
    view.innerHTML =
      '<div class="event-photo__empty"><span class="event-photo__icon">📷</span><br>Здесь будет фото с мероприятия<br><small>Путь к фото — в content/settings.json → event → photo</small></div>';
  }
  openCaseWindow({ frame: 'event', title: 'Мероприятие', content: view, side: md(CASES.event), onClose });
}

// ================= Спортмастер: доска «Лучший продавец» =================

export function openBestSellerWindow(onClose: () => void): void {
  const cert = el('div', 'cert');
  cert.appendChild(el('div', 'cert__title', 'Лучший продавец'));
  const face = el('div', 'cert__face');
  face.style.backgroundImage = `url(${import.meta.env.BASE_URL}assets/sprites3d/player_idle.webp)`;
  cert.appendChild(face);
  cert.appendChild(el('div', 'cert__stars', '★★★★★'));
  cert.appendChild(el('div', 'cert__name', 'Дмитрий Мельшин'));
  cert.appendChild(el('div', 'cert__place', 'Спортмастер'));
  openCaseWindow({ frame: 'board', title: 'Лучший продавец', content: cert, side: md(CASES.sportmaster), onClose });
}

// ================= 5. Папка: резюме =================

export function openResumeWindow(onClose: () => void): void {
  const pages = mdPages(RESUME);
  const book = el('div', 'folder');
  const page = el('div', 'folder__page');
  book.appendChild(page);
  let n = 0;
  let busy = false;
  const render = () => {
    page.innerHTML = pages[n] ?? '';
    page.scrollTop = 0;
    nav.set(n + 1, pages.length);
  };
  const go = (d: -1 | 1) => {
    const to = n + d;
    if (busy || to < 0 || to >= pages.length) return;
    busy = true;
    page.classList.add(d > 0 ? 'turn-out' : 'turn-out-back');
    setTimeout(() => {
      n = to;
      render();
      page.classList.remove('turn-out', 'turn-out-back');
      page.classList.add(d > 0 ? 'turn-in' : 'turn-in-back');
      setTimeout(() => {
        page.classList.remove('turn-in', 'turn-in-back');
        busy = false;
      }, 260);
    }, 220);
  };
  const nav = pager(
    () => go(-1),
    () => go(1),
  );
  onSwipe(page, () => go(1), () => go(-1));
  const wrap = el('div', 'folder-view');
  wrap.append(book, nav.el);
  render();

  const side = el('div');
  side.appendChild(el('h2', '', 'Контакты'));
  side.appendChild(contactsBlock());
  const dl = makeButton({ label: 'Скачать резюме (PDF) ⬇', href: asset(SETTINGS.resume.pdf), download: true });
  dl.classList.add('btn--wide');
  side.appendChild(dl);

  openCaseWindow({ frame: 'folder', title: 'Резюме', content: wrap, side, onClose, onArrow: go });
}
