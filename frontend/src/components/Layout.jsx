import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import ChatPanel from './ChatPanel'
import ApiStatus from './ApiStatus'
import GradientMesh from './GradientMesh'
import PageTransition from './PageTransition'

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className={"layout" + (collapsed ? ' sidebar-collapsed' : '')}>
      <GradientMesh />
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <main className="content">
        <PageTransition><Outlet /></PageTransition>
      </main>
      <ApiStatus />
      <ChatPanel />
    </div>
  )
}
