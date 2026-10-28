import { el, openModal } from './modal';
import { load, save } from '../storage';
import { SETTINGS } from '../content';
import { track } from '../analytics';

/**
 * Окно-вступление: первым после загрузки (запоминается в localStorage),
 * повторно — кнопкой «О портфолио» в углу. Тексты — здесь.
 */
export function showIntro(onStart?: () => void): void {
  const box = el('div', 'intro');
  box.innerHTML = `
    <p class="intro__lead"><b>Дмитрий Мельшин — Product Manager</b></p>
    <p>Это интерактивное портфолио. Вместо списка проектов — комнаты компаний, где я работал. Каждый предмет в комнате — реальный кейс: что за задача стояла, в каких ограничениях, что я сделал и к какому результату это привело. Рядом — сами материалы: сайт, презентация, медиакит, запись вебинара.</p>
    <p><b>Что внутри:</b> 7 кейсов из маркетинга, продукта и продаж — сайт с нуля, рост доходимости вебинаров с ~50% до ~80%, медиакит, выступления, работа продавцом-консультантом.</p>
    <p><b>Сколько времени:</b> 5–7 минут на всё или 2 минуты в быстром просмотре.</p>
    <details class="intro__why">
      <summary>Почему такой формат</summary>
      <p>Портфолио — тоже продукт, и у него есть пользователь: вы. Поэтому я сделал его как продукт и проверяю на нём гипотезы:</p>
      <ol>
        <li>Кейсы с материалами и цифрами помогают быстрее оценить компетенции кандидата, чем резюме из списка обязанностей.</li>
        <li>Интерактивный формат удерживает внимание дольше: больше кейсов открывают и дочитывают.</li>
        <li>Такой отклик выделяется среди сотен похожих и чаще приводит к разговору.</li>
      </ol>
      <p>Чтобы не тратить ваше время, есть быстрый просмотр — все кейсы на одной странице.${
        SETTINGS.analyticsEnabled
          ? ' А ключевые действия в портфолио учитываются в аналитике: так я пойму, какие кейсы вам полезнее всего.'
          : ''
      }</p>
    </details>`;
  box.querySelector('details')?.addEventListener('toggle', (e) => {
    if ((e.target as HTMLDetailsElement).open) track('intro_why_open');
  });
  openModal({
    className: 'modal__panel--intro',
    content: box,
    backLabel: false,
    buttons: [
      {
        label: 'Быстрый просмотр за 2 минуты',
        ghost: true,
        onClick: () => {
          track('quick_view_open', { from: 'intro' });
          save('introSeen', true);
          window.location.href = './quick.html';
        },
      },
      { label: 'Начать осмотр' },
    ],
    onClose: () => {
      save('introSeen', true);
      onStart?.();
    },
  });
}

export function introSeen(): boolean {
  return load('introSeen', false);
}
