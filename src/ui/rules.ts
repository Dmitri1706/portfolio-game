import { el, openModal } from './modal';
import { load, save } from '../storage';

/** Окно «Как пользоваться». Тексты — здесь. */
const RULES: { icon: string; title: string; text: string }[] = [
  { icon: '▶', title: 'Перемещение', text: 'кликните или коснитесь пола, и персонаж пойдёт туда.' },
  {
    icon: '✦',
    title: 'Кейсы',
    text: 'светящиеся предметы. Кликните на предмет: персонаж подойдёт к нему и откроется окно с кейсом и материалами. Закрыть окно — кнопка «Назад» или Esc.',
  },
  { icon: '⌂', title: 'Комнаты', text: 'двери с названиями компаний. Заколоченные двери пока закрыты.' },
];

const CORNER: string[] = [
  '«Быстрый просмотр» — все кейсы на одной странице',
  '«Связаться» — мои контакты',
  '🔊 — звук (по умолчанию выключен)',
  '? — эта подсказка',
];

export function showRules(onClose?: () => void): void {
  const box = el('div');
  const list = el('ul', 'rules');
  for (const r of RULES) {
    const li = el('li');
    li.appendChild(el('span', 'rules__icon', r.icon));
    const t = el('span');
    t.append(el('b', '', r.title), ` — ${r.text}`);
    li.appendChild(t);
    list.appendChild(li);
  }
  box.appendChild(list);
  box.appendChild(el('p', 'rules__corner-title', 'В углу экрана:'));
  const corner = el('ul', 'rules__corner');
  CORNER.forEach((c) => corner.appendChild(el('li', '', c)));
  box.appendChild(corner);
  openModal({
    title: 'Как пользоваться',
    content: box,
    backLabel: false,
    buttons: [{ label: 'Понятно' }],
    onClose: () => {
      save('rulesSeen', true);
      onClose?.();
    },
  });
}

export function rulesSeen(): boolean {
  return load('rulesSeen', false);
}
