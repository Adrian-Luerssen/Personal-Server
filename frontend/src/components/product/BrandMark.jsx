import React, { useId } from 'react'

import { PRODUCT } from '../../product/brand.mjs'

export default function BrandMark({ labelled = false, size = 32, className = '' }) {
  const titleId = useId()

  return (
    <svg
      className={`brand-mark ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role={labelled ? 'img' : undefined}
      aria-hidden={labelled ? undefined : 'true'}
      aria-labelledby={labelled ? titleId : undefined}
      focusable="false"
    >
      {labelled ? <title id={titleId}>{PRODUCT.displayName}</title> : null}
      <rect x="4.5" y="4.5" width="31" height="31" rx="2.5" fill="none" stroke="currentColor" />
      <path d="M11 13.5h18M11 20h12.5M11 26.5h18" fill="none" stroke="currentColor" strokeLinecap="square" />
      <circle cx="28.5" cy="20" r="2.75" fill="var(--brand-accent, currentColor)" stroke="none" />
    </svg>
  )
}
