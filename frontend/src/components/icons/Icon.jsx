import { icons as lucideIcons } from 'lucide-react'
import { customIcons } from './custom'
import { resolveIconName, toPascalIconName } from './iconRegistry.mjs'

const DENSITY_SIZES = { compact: 16, comfortable: 20, spacious: 24 }

export default function Icon({ name, size, className, style, density = 'comfortable', ...props }) {
  const resolvedSize = size || DENSITY_SIZES[density] || 20
  const resolvedName = resolveIconName(name)

  // Check custom icons first
  const CustomIcon = customIcons[resolvedName]
  if (CustomIcon) {
    return <CustomIcon width={resolvedSize} height={resolvedSize} className={className} style={{ display: 'inline-block', verticalAlign: 'middle', ...style }} {...props} />
  }

  // Convert kebab-case to PascalCase for Lucide lookup
  const pascalName = toPascalIconName(resolvedName)
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
