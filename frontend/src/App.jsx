import React, { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Home from './pages/Home'
import Profile from './pages/Profile'
import Spotify from './pages/Spotify'
import SpotifyPersonal from './pages/SpotifyPersonal'
import SpotifyGlobal from './pages/SpotifyGlobal'
import withRefreshGuard from './withRefreshGuard'
import Layout from './components/Layout'
import AuthGuard from './components/AuthGuard'
import Landing from './pages/Landing'
export default function AppRouter() {
  const [dark, setDark] = useState(true)

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  }, [dark])

  const GuardedHome = withRefreshGuard(Home)
  const GuardedProfile = withRefreshGuard(Profile)
  const GuardedSpotify = withRefreshGuard(Spotify)
  const GuardedSpotifyPersonal = withRefreshGuard(SpotifyPersonal)
  const GuardedSpotifyGlobal = withRefreshGuard(SpotifyGlobal)

  return (
    <BrowserRouter>
      <div className="app">
        <Routes>
          {/* Public landing shows login with a link to register */}
          <Route path="/" element={<Landing dark={dark} setDark={setDark} />} />

          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected app with refresh guard on every page */}
          <Route element={<AuthGuard><Layout /></AuthGuard>}>
            <Route path="/home" element={<GuardedHome />} />
            <Route path="/profile" element={<GuardedProfile />} />
            {/* Back-compat: /spotify can point to personal for now */}
            <Route path="/spotify" element={<GuardedSpotifyPersonal />} />
            <Route path="/spotify/personal" element={<GuardedSpotifyPersonal />} />
            <Route path="/spotify/global" element={<GuardedSpotifyGlobal />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
