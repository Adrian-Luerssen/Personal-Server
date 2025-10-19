import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <div className={"layout" + (collapsed ? ' sidebar-collapsed' : '')}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <div className="content" style={{ marginLeft: 80 }}>
        <Outlet context={{ sidebarCollapsed: collapsed }} />
      </div>
    </div>
  )
}
