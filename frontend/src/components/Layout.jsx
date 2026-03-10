import React, { useState, useRef } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import ChatPanel from './ChatPanel'
import ApiStatus from './ApiStatus'
import GradientMesh from './GradientMesh'
import PageTransition from './PageTransition'
import { useParallax } from '../hooks/useParallax'

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const contentRef = useRef(null)
  useParallax(contentRef, { intensity: 0.005 })

  return (
    <div className={"layout" + (collapsed ? ' sidebar-collapsed' : '')}>
      <GradientMesh />
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <main className="content" ref={contentRef}>
        <PageTransition><Outlet /></PageTransition>
      </main>
      <ApiStatus />
      <ChatPanel />
    </div>
  )
}
