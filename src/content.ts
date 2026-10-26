import { marked } from 'marked';
import settings from '../content/settings.json';
import siteMd from '../content/cases/site.md?raw';
import presentationMd from '../content/cases/presentation.md?raw';
import mediakitMd from '../content/cases/mediakit.md?raw';
import webinarMd from '../content/cases/webinar.md?raw';
import resumeMd from '../content/resume.md?raw';

/** Все ссылки, пути и контакты — из content/settings.json */
export const SETTINGS = settings;

/** Тексты кейсов — из content/cases/*.md */
export const CASES = {
  site: siteMd,
  presentation: presentationMd,
  mediakit: mediakitMd,
  webinar: webinarMd,
};

export const RESUME = resumeMd;

/** Путь из settings.json → адрес файла на сайте (учитывает подпапку на GitHub Pages). */
export function asset(p: string): string {
  if (!p) return '';
  if (/^(https?:)?\/\//.test(p) || p.startsWith('data:')) return p;
  return import.meta.env.BASE_URL + p.replace(/^\.?\/+/, '').replace(/^public\//, '');
}

/** Markdown → HTML. Комментарии-подсказки <!-- … --> убираются. Ссылки открываются в новой вкладке. */
export function md(text: string): string {
  const clean = text.replace(/<!--[\s\S]*?-->/g, '').trim();
  const html = marked.parse(clean, { async: false }) as string;
  return html.replace(/<a href=/g, '<a target="_blank" rel="noopener" href=');
}

/** Делит Markdown на страницы по строкам «---». */
export function mdPages(text: string): string[] {
  return text
    .replace(/<!--[\s\S]*?-->/g, '')
    .split(/^\s*---\s*$/m)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => md(s));
}
