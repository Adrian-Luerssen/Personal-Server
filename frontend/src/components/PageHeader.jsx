import React from 'react'
import PageHeading from './record/PageHeading'

export default function PageHeader({
  title,
  subtitle,
  eyebrow,
  meta,
}) {
  return (
    <PageHeading
      className="legacy-page-heading"
      eyebrow={eyebrow || 'RECORD'}
      title={title}
      description={subtitle}
      meta={meta}
    />
  )
}
