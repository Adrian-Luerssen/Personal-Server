import React, { useId } from 'react'

import { PRODUCT } from '../../product/brand.mjs'

export default function BrandMark({ labelled = false, size = 32, className = '' }) {
  const titleId = useId()

  return (
    <svg
      className={`brand-mark brand-mark__constellation ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role={labelled ? 'img' : undefined}
      aria-hidden={labelled ? undefined : 'true'}
      aria-labelledby={labelled ? titleId : undefined}
      focusable="false"
    >
      {labelled ? <title id={titleId}>{PRODUCT.displayName}</title> : null}
      <path
        className="brand-mark__links"
        d="M9.2 12.2 20 6.1l10.8 6.1v12.4L20 33.9 9.2 27.8Zm0 0L20 18.5m10.8-6.3L20 18.5m0 15.4V18.5M9.2 27.8 20 18.5m10.8 6.1L20 18.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="20" cy="6.1" r="2.15" fill="var(--domain-today)" />
      <circle cx="30.8" cy="12.2" r="2.15" fill="var(--domain-cash)" />
      <circle cx="30.8" cy="24.6" r="2.15" fill="var(--domain-music)" />
      <circle cx="20" cy="33.9" r="2.15" fill="var(--domain-series)" />
      <circle cx="9.2" cy="27.8" r="2.15" fill="var(--domain-gym)" />
      <circle cx="9.2" cy="12.2" r="2.15" fill="var(--domain-habits)" />
      <circle cx="20" cy="18.5" r="3" fill="var(--domain-assistant)" stroke="var(--surface-canvas)" strokeWidth="1.4" />
    </svg>
  )
}
