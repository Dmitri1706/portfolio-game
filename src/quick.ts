/**
 * «Быстрый просмотр» — лёгкая страница без игры для тех, у кого нет времени играть:
 * коротко обо мне, все кейсы со ссылками и текстами, резюме, контакты.
 * Все тексты и ссылки — те же, что в игре (папка content/).
 */
import './ui/fonts.css';
import './ui/ui.css';
import './quick.css';
import './ui/theme.css';
import { ABOUT, CASES, RESUME, SETTINGS, asset, md, mdPages } from './content';
import { el, makeButton, type ModalButton } from './ui/modal';
import { contactsBlock } from './ui/contacts';
import { videoEmbedUrl } from './ui/video';
import { track } from './analytics';

track('quick_view');

const root = document.getElementById('quick')!;
const backToGame: ModalButton = { label: '▶ Вернуться в игру', href: './index.html' };

// ---------- Шапка ----------
const head = el('header', 'q-head');
const face = el('div', 'q-face');
face.style.backgroundImage = `url(${import.meta.env.BASE_URL}assets/sprites3d/player_idle.webp)`;
const titles = el('div');
titles.append(el('h1', 'q-name', 'Дмитрий Мельшин'), el('p', 'q-role', SETTINGS.role));
const headBtns = el('div', 'q-buttons');
headBtns.append(
  linkBtn(backToGame),
  linkBtn({ label: 'Резюме (PDF) ⬇', href: asset(SETTINGS.resume.pdf), download: true, ghost: true }),
  linkBtn({ label: 'Контакты ↓', href: '#contacts', ghost: true }),
);
head.append(face, titles, headBtns);
root.appendChild(head);

// ---------- Обо мне ----------
section('Обо мне', html(md(ABOUT)));

// ---------- Кейсы ----------
const cases = el('div', 'q-cases');
const webinar = videoEmbedUrl(SETTINGS.webinar.url);
const items: { tag: string; text: string; links: ModalButton[] }[] = [
  {
    tag: 'В ХОД',
    text: CASES.site,
    links: SETTINGS.site.url ? [{ label: 'Открыть сайт ↗', href: SETTINGS.site.url }] : [],
  },
  { tag: 'В ХОД', text: CASES.presentation, links: [{ label: 'Презентация (PDF) ↗', href: asset(SETTINGS.presentation.pdf) }] },
  { tag: 'В ХОД', text: CASES.mediakit, links: [{ label: 'МедиаКит (PDF) ↗', href: asset(SETTINGS.mediakit.pdf) }] },
  {
    tag: 'В ХОД',
    text: CASES.webinar,
    links: webinar ? [{ label: 'Смотреть вебинар ↗', href: SETTINGS.webinar.url }] : [],
  },
  { tag: 'В ХОД', text: CASES.event, links: [] },
  { tag: 'Спортмастер', text: CASES.sportmaster, links: [] },
];
for (const it of items) {
  const card = el('article', 'q-card pixel-box');
  card.appendChild(el('span', 'q-tag', it.tag));
  card.appendChild(html(md(it.text)));
  if (it.links.length) {
    const links = el('div', 'q-links');
    it.links.forEach((l) => links.appendChild(linkBtn({ ...l, ghost: true })));
    card.appendChild(links);
  }
  cases.appendChild(card);
}
section('Кейсы', cases);

// ---------- Резюме ----------
const resume = el('div', 'q-resume pixel-box');
resume.appendChild(html(mdPages(RESUME).join('<hr>')));
resume.appendChild(linkBtn({ label: 'Скачать резюме (PDF) ⬇', href: asset(SETTINGS.resume.pdf), download: true }));
section('Резюме', resume);

// ---------- Контакты ----------
const contacts = el('div', 'q-contacts pixel-box');
contacts.appendChild(contactsBlock());
section('Контакты', contacts).id = 'contacts';

const foot = el('footer', 'q-foot');
foot.appendChild(linkBtn(backToGame));
root.appendChild(foot);

// ---------- помощники ----------
function section(title: string, content: HTMLElement): HTMLElement {
  const s = el('section', 'q-section');
  s.appendChild(el('h2', 'q-h2', title));
  s.appendChild(content);
  root.appendChild(s);
  return s;
}

function html(h: string): HTMLElement {
  const d = el('div', 'q-text');
  d.innerHTML = h;
  return d;
}

function linkBtn(b: ModalButton): HTMLElement {
  const a = makeButton(b);
  // «Вернуться в игру» и якоря открываются в этой же вкладке
  if (b.href && (b.href.startsWith('#') || b.href.endsWith('index.html'))) a.removeAttribute('target');
  return a;
}
