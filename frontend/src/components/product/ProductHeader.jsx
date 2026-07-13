import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import BrandMark from './BrandMark'
import Icon from '../icons/Icon'
import { getProductBackTarget, getProductHeader } from './ProductShellState.mjs'

export default function ProductHeader({ native = false, onCapture }) {
  const location = useLocation()
  const navigate = useNavigate()
  const header = getProductHeader(location.pathname)
  const backTarget = getProductBackTarget(location.pathname)

  if (native) {
    return (
      <header className={`product-header product-header--native product-header--${header.domain}`}>
        {backTarget ? (
          <button type="button" className="product-header__icon" onClick={() => navigate(backTarget)} aria-label={`Back to ${header.eyebrow}`}>
            <Icon name="arrow-left" size={20} />
          </button>
        ) : (
          <BrandMark className="product-header__mark" size={30} />
        )}
        <div className="product-header__copy">
          <span>{header.eyebrow}</span>
          <strong>{header.title}</strong>
        </div>
        <button type="button" className="product-header__capture" onClick={onCapture} aria-label="Capture a new record">
          <Icon name="plus" size={20} />
        </button>
      </header>
    )
  }

  return (
    <header className={`product-header product-header--desktop product-header--${header.domain}`}>
      <div className="product-header__copy">
        <span>{header.eyebrow}</span>
        <strong>{header.title}</strong>
      </div>
      <button type="button" className="product-header__search" onClick={() => navigate('/chat')}>
        <Icon name="search" size={16} />
        <span>Search records or ask a question</span>
        <kbd>Ctrl K</kbd>
      </button>
      <div className="product-header__status" role="status"><span aria-hidden="true" />Ready</div>
      <button type="button" className="product-header__new" onClick={onCapture}>
        <Icon name="plus" size={17} />New record
      </button>
    </header>
  )
}
