import React, { useId } from 'react'

import { PRODUCT } from '../../product/brand.mjs'

export default function BrandMark({ labelled = false, size = 32, className = '' }) {
  const titleId = useId()

  return (
    <svg
      className={`brand-mark brand-mark__bookplate ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role={labelled ? 'img' : undefined}
      aria-hidden={labelled ? undefined : 'true'}
      aria-labelledby={labelled ? titleId : undefined}
      focusable="false"
    >
      {labelled ? <title id={titleId}>{PRODUCT.displayName}</title> : null}
      <rect className="brand-mark__plate" x="6" y="5" width="28" height="30" rx="2.5" />
      <path className="brand-mark__monogram" d="M13 29V11h8c4.5 0 7 2.2 7 5.5S25.5 22 21 22h-8m8 0 7 7" />
    </svg>
  )
}
