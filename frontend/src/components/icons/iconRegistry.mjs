import { icons as lucideIcons } from 'lucide-react';
import { ICON_MAP as MATERIAL_ICON_MAP } from './material-to-lucide.mjs';

export const ICON_ALIASES = {
  'alert-circle': 'circle-alert',
  'alert-triangle': 'triangle-alert',
  'bar-chart': 'chart-column',
  'bar-chart-3': 'chart-column',
  'check-circle': 'circle-check',
  'help-circle': 'circle-question-mark',
  'line-chart': 'chart-line',
  'minus-circle': 'circle-minus',
  'pie-chart': 'chart-pie',
  'plus-circle': 'circle-plus',
  'x-circle': 'circle-x',
  home: 'house',
};

export const CASHEW_ICON_ALIASES = {
  bicycle: 'bike',
  bills: 'receipt-text',
  bottles: 'wine',
  celebration: 'party-popper',
  charts: 'chart-column',
  'clothes-hanger': 'shirt',
  coin: 'coins',
  cutlery: 'utensils',
  'face-mask': 'shield-alert',
  gamepad: 'gamepad-2',
  glass: 'beer',
  groceries: 'shopping-basket',
  'healthcare-and-medical': 'heart-pulse',
  home2: 'house',
  loan: 'hand-coins',
  'paper-bill': 'receipt-text',
  plant: 'leaf',
  shopping: 'shopping-bag',
  tickets: 'ticket',
  tram: 'train-front',
};

function toKebab(value) {
  return String(value || '')
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .replace(/_/g, '-')
    .replace(/\s+/g, '-')
    .toLowerCase();
}

export function toPascalIconName(name) {
  return String(name || '')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

export function resolveIconName(name, fallback = null) {
  if (!name) return fallback;

  const raw = String(name).trim();
  const materialMapped = MATERIAL_ICON_MAP[raw] || MATERIAL_ICON_MAP[raw.toLowerCase()];
  const withoutPath = String(materialMapped || raw).split(/[\\/]/).pop() || '';
  const withoutExtension = withoutPath.replace(/\.(png|svg|jpg|jpeg|webp)$/i, '');
  const normalized = toKebab(withoutExtension);

  return (
    ICON_ALIASES[normalized] ||
    CASHEW_ICON_ALIASES[normalized] ||
    normalized ||
    fallback
  );
}

export function getLucideIconComponent(name) {
  const resolvedName = resolveIconName(name);
  if (!resolvedName) return null;
  return lucideIcons[toPascalIconName(resolvedName)] || null;
}

export function isKnownIconName(name) {
  return Boolean(getLucideIconComponent(name));
}
