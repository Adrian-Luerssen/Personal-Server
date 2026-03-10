import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

export default function PageTransition({ children }) {
  const location = useLocation()
  const [animClass, setAnimClass] = useState('page-enter')

  useEffect(() => {
    setAnimClass('')
    requestAnimationFrame(() => setAnimClass('page-enter'))
  }, [location.pathname])

  return <div className={`page-transition ${animClass}`}>{children}</div>
}
