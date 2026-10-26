/**
 * Просмотр PDF через pdf.js (встроенный просмотрщик PDF на телефонах не работает).
 * Библиотека загружается только при первом открытии; страницы рисуются по мере листания.
 */
type PdfJs = typeof import('pdfjs-dist/legacy/build/pdf.mjs');
type PdfDoc = Awaited<ReturnType<PdfJs['getDocument']>['promise']>;

let lib: Promise<PdfJs> | null = null;
function pdfjs(): Promise<PdfJs> {
  lib ??= (async () => {
    const [mod, worker] = await Promise.all([
      import('pdfjs-dist/legacy/build/pdf.mjs'),
      import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'),
    ]);
    mod.GlobalWorkerOptions.workerSrc = worker.default;
    return mod;
  })();
  return lib;
}

export class PdfViewer {
  page = 1;
  total = 0;
  private doc?: PdfDoc;
  private task?: ReturnType<PdfJs['getDocument']>;
  private renderId = 0;
  private resize?: ResizeObserver;
  private destroyed = false;

  constructor(
    private host: HTMLElement,
    private url: string,
    private onChange: (page: number, total: number) => void,
  ) {
    host.classList.add('pdf');
    host.innerHTML = '<div class="pdf__status">Загружаю…</div>';
  }

  async open(): Promise<void> {
    try {
      const lib = await pdfjs();
      this.task = lib.getDocument({ url: this.url });
      this.doc = await this.task.promise;
      if (this.destroyed) return;
      this.total = this.doc.numPages;
      await this.show(1);
      let t = 0;
      this.resize = new ResizeObserver(() => {
        clearTimeout(t);
        t = window.setTimeout(() => this.show(this.page), 150);
      });
      this.resize.observe(this.host);
    } catch (e) {
      console.warn('PDF не открылся', e);
      this.host.innerHTML = `<div class="pdf__status">Не удалось открыть PDF.<br><small>${this.url}</small></div>`;
    }
  }

  next(): void {
    if (this.page < this.total) this.show(this.page + 1);
  }

  prev(): void {
    if (this.page > 1) this.show(this.page - 1);
  }

  private async show(n: number): Promise<void> {
    if (!this.doc || this.destroyed) return;
    const id = ++this.renderId;
    this.page = n;
    this.onChange(n, this.total);
    const page = await this.doc.getPage(n);
    const base = page.getViewport({ scale: 1 });
    const w = Math.max(50, this.host.clientWidth);
    const h = Math.max(50, this.host.clientHeight);
    const fit = Math.min(w / base.width, h / base.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const viewport = page.getViewport({ scale: fit * dpr });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
    canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;
    await page.render({ canvas, viewport }).promise;
    if (id !== this.renderId || this.destroyed) return;
    this.host.replaceChildren(canvas);
  }

  destroy(): void {
    this.destroyed = true;
    this.resize?.disconnect();
    this.task?.destroy();
  }
}

/** Листание свайпом (палец или мышь): влево — дальше, вправо — назад. */
export function onSwipe(el: HTMLElement, next: () => void, prev: () => void): void {
  let x0: number | null = null;
  el.addEventListener('pointerdown', (e) => (x0 = e.clientX));
  el.addEventListener('pointerup', (e) => {
    if (x0 == null) return;
    const dx = e.clientX - x0;
    x0 = null;
    if (Math.abs(dx) > 40) (dx < 0 ? next : prev)();
  });
  el.addEventListener('pointercancel', () => (x0 = null));
}
