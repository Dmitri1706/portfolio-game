import { SETTINGS } from '../content';
import { el } from './modal';

/** Блок контактов из settings.json (Telegram, почта, телефон). Пустые поля не показываются. */
export function contactsBlock(): HTMLElement {
  const c = SETTINGS.contacts;
  const list = el('ul', 'contacts');
  const add = (icon: string, label: string, href: string) => {
    const li = el('li');
    li.appendChild(el('span', 'contacts__icon', icon));
    const a = el('a', '', label);
    a.href = href;
    if (href.startsWith('http')) {
      a.target = '_blank';
      a.rel = 'noopener';
    }
    li.appendChild(a);
    list.appendChild(li);
  };
  const tg = c.telegram.trim().replace(/^@/, '').replace(/^https?:\/\/t\.me\//, '');
  if (tg) add('TG', `@${tg}`, `https://t.me/${tg}`);
  if (c.email.trim()) add('@', c.email.trim(), `mailto:${c.email.trim()}`);
  if (c.phone.trim()) add('☎', c.phone.trim(), `tel:${c.phone.replace(/[^\d+]/g, '')}`);
  return list;
}
