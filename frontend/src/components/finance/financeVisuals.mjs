export function normalizeFinanceColor(value, fallback = '#6b7280') {
  if (value == null) return fallback;
  const raw = String(value).trim();
  if (!raw) return fallback;

  const argb = raw.match(/^0x([0-9a-f]{8})$/i);
  if (argb) return `#${argb[1].slice(2).toLowerCase()}`;

  const rgb = raw.match(/^0x([0-9a-f]{6})$/i);
  if (rgb) return `#${rgb[1].toLowerCase()}`;

  const bareArgb = raw.match(/^([0-9a-f]{8})$/i);
  if (bareArgb) return `#${bareArgb[1].slice(2).toLowerCase()}`;

  const bareRgb = raw.match(/^([0-9a-f]{6})$/i);
  if (bareRgb) return `#${bareRgb[1].toLowerCase()}`;

  if (/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(raw)) return raw.toLowerCase();
  if (/^(rgb|rgba|hsl|hsla|var|color-mix)\(/i.test(raw)) return raw;

  return fallback;
}

function expandShortHex(color) {
  const match = color.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i);
  if (!match) return color;
  return `#${match[1]}${match[1]}${match[2]}${match[2]}${match[3]}${match[3]}`.toLowerCase();
}

export function transparentFinanceColor(value, alpha = '22', fallback = '#6b7280') {
  const color = expandShortHex(normalizeFinanceColor(value, fallback));
  if (/^#[0-9a-f]{6}$/i.test(color)) return `${color}${alpha}`;
  return color;
}
