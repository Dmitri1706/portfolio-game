import { DIALOG, type DialogOption } from '../content';
import { el, lockUi, unlockUi } from './modal';
import { sfx } from '../audio';

export interface DialogResult {
  /** Продажа закрыта (диалог дошёл до конца) */
  closed: boolean;
  /** Плашка допродажи, если была */
  bonus?: string;
  scenario: 'A' | 'B';
}

type Speaker = 'seller' | 'customer';

const CHAR_MS = 26;
const BASE = import.meta.env.BASE_URL;

/**
 * Диалог продажи в классическом игровом стиле: окно снизу, портрет, текст печатается по буквам,
 * варианты ответа на выбор. Сценарий покупателя (A или B) выбирается случайно.
 * Неудачный ответ не ломает игру: покупатель сомневается, и можно выбрать снова.
 */
export function runSaleDialog(onEnd: (r: DialogResult) => void): void {
  const scenario: 'A' | 'B' = Math.random() < 0.5 ? 'A' : 'B';
  const root = document.getElementById('ui') ?? document.body;

  const box = el('div', 'dialog pixel-box');
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-label', 'Диалог с покупателем');
  const portrait = el('div', 'dialog__portrait');
  const face = el('div', 'dialog__face');
  const name = el('div', 'dialog__name');
  portrait.append(face, name);
  const body = el('div', 'dialog__body');
  const stepTitle = el('div', 'dialog__step');
  const text = el('div', 'dialog__text');
  const doubt = el('div', 'dialog__doubt', DIALOG.doubt);
  doubt.hidden = true;
  const choices = el('ol', 'dialog__choices');
  const next = el('div', 'dialog__next', '▼');
  next.hidden = true;
  body.append(stepTitle, text, doubt, choices, next);
  const closeBtn = el('button', 'dialog__close', '✕');
  closeBtn.type = 'button';
  closeBtn.setAttribute('aria-label', 'Закрыть диалог');
  box.append(portrait, body, closeBtn);
  root.appendChild(box);
  lockUi();

  let finished = false;
  let skipTyping: (() => void) | null = null;
  let waitClick: (() => void) | null = null;
  let pick: ((i: number) => void) | null = null;

  const end = (r: DialogResult) => {
    if (finished) return;
    finished = true;
    window.removeEventListener('keydown', onKey);
    box.classList.add('is-closing');
    setTimeout(() => box.remove(), 180);
    unlockUi();
    onEnd(r);
  };
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    end({ closed: false, scenario });
  });
  // клик по окну: допечатать текст сразу / продолжить
  box.addEventListener('click', () => {
    if (skipTyping) skipTyping();
    else if (waitClick) waitClick();
  });
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') return end({ closed: false, scenario });
    if (pick && /^[1-9]$/.test(e.key)) return pick(Number(e.key) - 1);
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (skipTyping) skipTyping();
      else if (waitClick) waitClick();
    }
  };
  window.addEventListener('keydown', onKey);

  const setSpeaker = (who: Speaker) => {
    box.dataset.speaker = who;
    name.textContent = DIALOG.names[who];
    face.style.backgroundImage = `url(${BASE}assets/sprites3d/${who === 'seller' ? 'player' : 'customer'}_idle.webp)`;
  };

  /** Напечатать реплику по буквам. */
  const type = (who: Speaker, line: string) =>
    new Promise<void>((resolve) => {
      setSpeaker(who);
      text.classList.remove('is-hint');
      text.textContent = '';
      const chars = [...line];
      let i = 0;
      const done = () => {
        clearInterval(timer);
        text.textContent = line;
        skipTyping = null;
        resolve();
      };
      const timer = setInterval(() => {
        if (finished) return clearInterval(timer);
        text.textContent += chars[i];
        if (i % 2 === 0 && chars[i] !== ' ') sfx('type');
        i++;
        if (i >= chars.length) done();
      }, CHAR_MS);
      skipTyping = done;
    });

  /** Дождаться клика (или паузы), чтобы перейти дальше. */
  const waitNext = (autoMs?: number) =>
    new Promise<void>((resolve) => {
      next.hidden = false;
      let t = 0;
      const go = () => {
        clearTimeout(t);
        next.hidden = true;
        waitClick = null;
        resolve();
      };
      waitClick = go;
      if (autoMs) t = window.setTimeout(go, autoMs);
    });

  /** Показать варианты ответа и дождаться выбора. */
  const choose = (opts: DialogOption[], tried: Set<DialogOption>) =>
    new Promise<DialogOption>((resolve) => {
      choices.replaceChildren();
      opts.forEach((o, i) => {
        const li = el('li');
        const b = el('button', 'dialog__choice', o.text);
        b.type = 'button';
        b.disabled = tried.has(o);
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          pick?.(i);
        });
        li.appendChild(b);
        choices.appendChild(li);
      });
      pick = (i) => {
        const o = opts[i];
        if (!o || tried.has(o)) return;
        pick = null;
        choices.replaceChildren();
        resolve(o);
      };
    });

  const replyText = (o: DialogOption) => (typeof o.reply === 'string' ? o.reply : o.reply?.[scenario]);

  /** Плашка «Продажа закрыта!» (+ бонус за допродажу). */
  const showClosed = (bonus?: string) => {
    sfx('achievement');
    box.classList.add('is-result');
    portrait.hidden = true;
    const result = el('div', 'dialog__result');
    result.appendChild(el('div', 'dialog__closed', DIALOG.closed));
    result.appendChild(el('div', bonus ? 'dialog__bonus' : 'dialog__nobonus', bonus ?? DIALOG.noBonus));
    const ok = el('button', 'btn', 'Отлично!');
    ok.type = 'button';
    ok.addEventListener('click', (e) => {
      e.stopPropagation();
      end({ closed: true, bonus, scenario });
    });
    result.appendChild(ok);
    body.replaceChildren(result);
    ok.focus();
  };

  setSpeaker('seller');
  text.textContent = 'Выберите, что сказать покупателю:';
  text.classList.add('is-hint');

  (async () => {
    let bonus: string | undefined;
    const last = DIALOG.steps[DIALOG.steps.length - 1];
    for (const step of DIALOG.steps) {
      stepTitle.textContent = step.title;
      const opts = shuffle(step.options.filter((o) => !o.scenario || o.scenario === scenario));
      const tried = new Set<DialogOption>();
      for (;;) {
        const o = await choose(opts, tried);
        if (finished) return;
        doubt.hidden = true;
        await type('seller', o.text);
        await waitNext(1200);
        if (finished) return;
        const reply = replyText(o);
        if (reply) await type('customer', reply);
        if (finished) return;
        if (o.correct) {
          if (o.bonus) bonus = o.bonus;
          // перед финальной репликой — дать дочитать ответ
          if (reply && step === last) await waitNext(1600);
          break;
        }
        tried.add(o);
        doubt.hidden = false;
      }
    }
    stepTitle.textContent = 'Закрытие';
    await type('customer', DIALOG.final);
    await waitNext();
    if (finished) return;
    showClosed(bonus);
  })();

}

function shuffle<T>(a: T[]): T[] {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}
