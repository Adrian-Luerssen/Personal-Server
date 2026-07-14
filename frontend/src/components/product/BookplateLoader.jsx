import React from 'react'

export default function BookplateLoader({ label = 'Opening your records', screen = false, size = 48 }) {
  return (
    <div
      className={`bookplate-loader${screen ? ' bookplate-loader--screen' : ''}`}
      role="status"
      aria-label={label}
    >
      <svg
        className="bookplate-loader__mark"
        width={size}
        height={size}
        viewBox="0 0 96 96"
        aria-hidden="true"
      >
        <rect className="bookplate-loader__plate" x="16" y="15" width="64" height="66" rx="5" />
        <path
          className="bookplate-loader__monogram"
          d="M32 68V29h18c10 0 16 5 16 12s-6 12-16 12H32m18 0 15 15"
        />
      </svg>
      {screen && <span className="bookplate-loader__label">{label}</span>}
    </div>
  )
}
