import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getApiBase } from '../config'
import { useOutletContext } from 'react-router-dom'

export default function Home() {
  const { sidebarCollapsed } = useOutletContext() || {}
  const nav = useNavigate()
  const [status, setStatus] = useState('Checking session...')

  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken')
    const refreshToken = localStorage.getItem('refreshToken')

    async function check() {
      try {
        if (accessToken && refreshToken) {
          const res = await fetch(getApiBase() + '/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
          })
          if (!res.ok) throw new Error('refresh failed')
          const data = await res.json()
          if (data?.accessToken) localStorage.setItem('accessToken', data.accessToken)
          if (data?.refreshToken) localStorage.setItem('refreshToken', data.refreshToken)
          setStatus('Authenticated. Welcome!')
        } else {
          nav('/login', { replace: true })
        }
      } catch (e) {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        nav('/login', { replace: true })
      }
    }

    check()
  }, [nav])

  return (
    <div className="content" style={{ marginLeft: sidebarCollapsed ? 80 : 260 }}>
      <h2>Home</h2>
      <p>{status}</p>
    </div>
  )
}
