import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import ChatPanel from './ChatPanel'

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <div className={"layout" + (collapsed ? ' sidebar-collapsed' : '')}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <main className="content">
        <Outlet />
      </main>
      <ChatPanel />
    </div>
  )
}
