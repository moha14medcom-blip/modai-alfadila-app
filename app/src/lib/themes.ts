import type { ThemeId } from './types';

export interface ThemeMeta {
  id: ThemeId;
  name: string;
  hint: string;
  swatch: [string, string, string];
}

export const THEMES: ThemeMeta[] = [
  {
    id: 'virtue',
    name: 'مدّعي الفضيلة',
    hint: 'الوضع الأساسي — بنفسجي وذهبي',
    swatch: ['#8b5cf6', '#f5be4a', '#12101b'],
  },
  {
    id: 'deep',
    name: 'الوضع الليلي العميق',
    hint: 'أزرق داكن مريح للعين',
    swatch: ['#3884ff', '#ecba5c', '#090c14'],
  },
  {
    id: 'light',
    name: 'الوضع الفاتح',
    hint: 'خلفية بيضاء ونهار مريح',
    swatch: ['#6d4ce0', '#cb9116', '#f4f5f9'],
  },
  {
    id: 'stem',
    name: 'ستيم أخضر',
    hint: 'أخضر هادئ للإنتاجية',
    swatch: ['#10b981', '#f0b446', '#071614'],
  },
  {
    id: 'midnight',
    name: 'منتصف الليل',
    hint: 'نيلي عميق مع لمسة بنفسجية',
    swatch: ['#6366f1', '#e8b458', '#0b0c18'],
  },
  {
    id: 'cyber',
    name: 'سايبر نيون',
    hint: 'سماوي نيون للمود التقني',
    swatch: ['#22d3ee', '#facc15', '#060e16'],
  },
];

export const THEME_IDS: ThemeId[] = THEMES.map((t) => t.id);

export function applyTheme(id: ThemeId) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', id);
  const meta = THEMES.find((t) => t.id === id);
  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor && meta) themeColor.setAttribute('content', meta.swatch[2]);
}

export function isThemeId(v: unknown): v is ThemeId {
  return typeof v === 'string' && (THEME_IDS as string[]).includes(v);
}
