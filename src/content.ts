import { marked } from 'marked';
import settings from '../content/settings.json';
import siteMd from '../content/cases/site.md?raw';
import presentationMd from '../content/cases/presentation.md?raw';
import mediakitMd from '../content/cases/mediakit.md?raw';
import webinarMd from '../content/cases/webinar.md?raw';
import resumeMd from '../content/resume.md?raw';
import sportmasterMd from '../content/cases/sportmaster.md?raw';
import eventMd from '../content/cases/event.md?raw';
import aboutMd from '../content/about.md?raw';

/** Короткое «обо мне» для страницы «Быстрый просмотр» — из content/about.md */
export const ABOUT = aboutMd;
import dialog from '../content/dialog.json';

/** Сценарий диалога продажи — из content/dialog.json */
export const DIALOG = dialog as SaleDialog;

export interface DialogOption {
  text: string;
  correct?: boolean;
  /** Только для сценария A или B */
  scenario?: 'A' | 'B';
  /** Ответ покупателя: строка или разные ответы для сценариев A и B */
  reply?: string | { A: string; B: string };
  /** Плашка бонуса за допродажу */
  bonus?: string;
}

export interface SaleDialog {
  names: { seller: string; customer: string };
  doubt: string;
  steps: { title: string; options: DialogOption[] }[];
  final: string;
  closed: string;
  noBonus: string;
}

/** Все ссылки, пути и контакты — из content/settings.json */
export const SETTINGS = settings;

/** Тексты кейсов — из content/cases/*.md */
export const CASES = {
  site: siteMd,
  presentation: presentationMd,
  mediakit: mediakitMd,
  webinar: webinarMd,
  event: eventMd,
  sportmaster: sportmasterMd,
};

export const RESUME = resumeMd;

/**
 * Материал проекта: PDF (листается), картинка или несколько картинок (галерея; по клику — на весь экран).
 * phone: true — скриншоты телефона, показываются в рамке телефона. Пустой путь — заглушка.
 */
export interface ProjectMaterial {
  label: string;
  pdf?: string;
  image?: string;
  images?: string[];
  caption?: string;
  phone?: boolean;
}

/** Проект в подвале «Проекты»: текст — content/projects/<id>.md, материалы — settings.json → projects */
export interface Project {
  id: string;
  title: string;
  /** Подпись над стрелкой у шторки */
  label: string;
  /** Маленький ярлык над заголовком */
  tag: string;
  materials: ProjectMaterial[];
  links: { label: string; url: string }[];
  text: string;
  /** Ссылка на бота: кнопка показывается, только если tgbotLinkEnabled = true */
  botUrl?: string;
  tgbotLinkEnabled?: boolean;
}

const PROJECT_TEXTS = import.meta.glob('../content/projects/*.md', { query: '?raw', import: 'default', eager: true }) as Record<
  string,
  string
>;

export const PROJECTS: Project[] = (settings.projects as Omit<Project, 'text'>[]).map((p) => ({
  ...p,
  materials: p.materials ?? [],
  links: [
    ...(p.links ?? []).filter((x) => x.url),
    ...(p.botUrl && p.tgbotLinkEnabled ? [{ label: 'Открыть бота в Telegram ↗', url: p.botUrl }] : []),
  ],
  text: PROJECT_TEXTS[`../content/projects/${p.id}.md`] ?? `# ${p.title}\n\nОписание скоро появится.`,
}));

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
