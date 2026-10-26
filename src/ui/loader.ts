/**
 * Экран загрузки «Считаю конверсию вашего визита… N%».
 * N — реальный прогресс загрузки: число плавно догоняет его, но никогда не обгоняет.
 */
const MIN_SHOW_MS = 1400;

let target = 0;
let shown = 0;
const started = performance.now();

const pct = document.getElementById('loader-pct');
const fill = document.getElementById('loader-fill');
const runner = document.getElementById('loader-runner');

if (runner) runner.style.backgroundImage = `url(${import.meta.env.BASE_URL}assets/sprites/player.png)`;

function render(): void {
  if (pct) pct.textContent = String(shown);
  if (fill) fill.style.width = `${shown}%`;
  if (runner) runner.style.left = `${shown}%`;
}

let last = 0;
function tick(now: number): void {
  if (shown < target && now - last > 16) {
    last = now;
    shown = Math.min(target, shown + Math.max(1, Math.ceil((target - shown) * 0.06)));
    render();
  }
  if (shown < 100) requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

export function setLoadProgress(v: number): void {
  target = Math.max(target, Math.min(100, Math.round(v * 100)));
}

/** Ждёт, пока счётчик дойдёт до 100%, и плавно убирает экран загрузки. */
export function finishLoading(): Promise<void> {
  setLoadProgress(1);
  return new Promise((resolve) => {
    const check = () => {
      if (shown >= 100 && performance.now() - started >= MIN_SHOW_MS) {
        setTimeout(() => {
          const loader = document.getElementById('loader');
          loader?.classList.add('is-hidden');
          setTimeout(() => {
            loader?.remove();
            resolve();
          }, 400);
        }, 300);
      } else requestAnimationFrame(check);
    };
    check();
  });
}
