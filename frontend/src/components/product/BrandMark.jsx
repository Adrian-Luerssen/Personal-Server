import React, { useId } from 'react'

import { PRODUCT } from '../../product/brand.mjs'

export default function BrandMark({ labelled = false, size = 32, className = '' }) {
  const titleId = useId()

  return (
    <svg
      className={`brand-mark brand-mark__spine ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role={labelled ? 'img' : undefined}
      aria-hidden={labelled ? undefined : 'true'}
      aria-labelledby={labelled ? titleId : undefined}
      focusable="false"
    >
      {labelled ? <title id={titleId}>{PRODUCT.displayName}</title> : null}
      <path className="brand-mark__rail brand-mark__rail--back" d="M10 6v28" />
      <path className="brand-mark__rail brand-mark__rail--front" d="M16 6v28" />
      <path className="brand-mark__tick" d="M16 9h12.5c3.1 0 5.5 2.4 5.5 5.4s-2.4 5.4-5.5 5.4H16" />
      <path className="brand-mark__tick" d="m25.5 20 8 14" />
      <path className="brand-mark__index" d="M6 13h4M6 20h4M6 27h4" />
      <path className="brand-mark__active" d="M16 20h3" />
    </svg>
  )
}
