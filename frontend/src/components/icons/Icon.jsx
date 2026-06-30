import { icons as lucideIcons } from 'lucide-react'
import { customIcons } from './custom'

const DENSITY_SIZES = { compact: 16, comfortable: 20, spacious: 24 }
const ICON_ALIASES = {
  'alert-circle': 'circle-alert',
  'check-circle': 'circle-check',
  'plus-circle': 'circle-plus',
}

export default function Icon({ name, size, className, style, density = 'comfortable', ...props }) {
  const resolvedSize = size || DENSITY_SIZES[density] || 20
  const resolvedName = ICON_ALIASES[name] || name

  // Check custom icons first
  const CustomIcon = customIcons[resolvedName]
  if (CustomIcon) {
    return <CustomIcon width={resolvedSize} height={resolvedSize} className={className} style={{ display: 'inline-block', verticalAlign: 'middle', ...style }} {...props} />
  }

  // Convert kebab-case to PascalCase for Lucide lookup
  const pascalName = resolvedName.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')
  const LucideIcon = lucideIcons[pascalName]
  if (LucideIcon) {
    return <LucideIcon size={resolvedSize} className={className} style={{ display: 'inline-block', verticalAlign: 'middle', ...style }} {...props} />
  }

  // Fallback: render nothing (dev warning)
  if (process.env.NODE_ENV === 'development') {
    console.warn(`Icon "${name}" not found in Lucide or custom icons`)
  }
  return null
}
