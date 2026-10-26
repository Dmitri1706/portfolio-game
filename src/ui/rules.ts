import { el, openModal } from './modal';
import { load, save } from '../storage';

const RULES: { icon: string; text: string }[] = [
  { icon: '▶', text: 'Клик или тап по полу — персонаж идёт туда.' },
  { icon: '★', text: 'Клик или тап по предмету — персонаж подойдёт к нему и что-нибудь сделает.' },
  {
    icon: '✦',
    text: 'Интерактивные предметы подсвечиваются при наведении мышки, а на телефоне — мерцают искорками.',
  },
  { icon: '←', text: 'Закрыть окно — кнопка «Назад» (на компьютере ещё и Esc).' },
  { icon: '?', text: 'Эти правила всегда можно открыть снова кнопкой «?» в углу.' },
];

export function showRules(onClose?: () => void): void {
  const list = el('ul', 'rules');
  for (const r of RULES) {
    const li = el('li');
    li.appendChild(el('span', 'rules__icon', r.icon));
    li.appendChild(el('span', '', r.text));
    list.appendChild(li);
  }
  openModal({
    title: 'Как играть',
    content: list,
    backLabel: false,
    buttons: [{ label: 'Понятно!' }],
    onClose: () => {
      save('rulesSeen', true);
      onClose?.();
    },
  });
}

export function rulesSeen(): boolean {
  return load('rulesSeen', false);
}
