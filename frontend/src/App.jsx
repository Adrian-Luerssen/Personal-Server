import React, { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Auth/Login'
import Register from './pages/Auth/Register'
import Home from './pages/Home'
// Profile merged into Settings > Account tab
import SpotifyPersonal from './pages/Spotify/SpotifyPersonal'
import SpotifyGlobal from './pages/Spotify/SpotifyGlobal'
import SpotifyRanking from './pages/Spotify/SpotifyRanking'
import withRefreshGuard from './withRefreshGuard'
import Layout from './components/Layout'
import AuthGuard from './components/AuthGuard'
import NativeUpdateGate from './components/NativeUpdateGate'
import Landing from './pages/Landing'
import Workout from './pages/Workout/Workout'
import WorkoutActive from './pages/Workout/WorkoutActive'
import WorkoutHistory from './pages/Workout/WorkoutHistory'
import WorkoutExercises from './pages/Workout/WorkoutExercises'
import WorkoutBodyweight from './pages/Workout/WorkoutBodyweight'
import WorkoutImport from './pages/Workout/WorkoutImport'
import Finance from './pages/Finance/Finance'
import FinanceTransactions from './pages/Finance/FinanceTransactions'
import FinanceImport from './pages/Finance/FinanceImport'
import FinanceSettings from './pages/Finance/FinanceSettings'
import Habits from './pages/Habits/Habits'
import HabitsSettings from './pages/Habits/HabitsSettings'
import Media from './pages/Media/Media'
import MediaImport from './pages/Media/MediaImport'
import MediaSettings from './pages/Media/MediaSettings'
import ChatPage from './pages/Chat/ChatPage'
import Settings from './pages/Settings/Settings'
import MobileMenu from './pages/MobileMenu'
import SpotifyCallback from './pages/Spotify/SpotifyCallback'
import { PreferencesProvider } from './contexts/PreferencesContext'
import { applyChartTheme } from './chartTheme'
import { isMobileBrowser, isNativeMobileApp } from './mobilePlatform'
import { getTokens } from './auth'
import {
  getNotificationPermissionStatus,
  initializeNativeNotifications,
} from './notifications'
import {
  NOTIFICATION_PERMISSION_AUTO_REQUEST_KEY,
  shouldAutoRequestNativeNotificationPermission,
} from './notificationPermission.mjs'

applyChartTheme()

// BUG FIX B1: Move HOC calls to module scope to prevent unmount/remount on every render
const GuardedHome = withRefreshGuard(Home)
// Profile removed - merged into Settings
const GuardedSpotifyPersonal = withRefreshGuard(SpotifyPersonal)
const GuardedSpotifyGlobal = withRefreshGuard(SpotifyGlobal)
const GuardedSpotifyRanking = withRefreshGuard(SpotifyRanking)
const GuardedWorkout = withRefreshGuard(Workout)
const GuardedWorkoutActive = withRefreshGuard(WorkoutActive)
const GuardedWorkoutHistory = withRefreshGuard(WorkoutHistory)
const GuardedWorkoutExercises = withRefreshGuard(WorkoutExercises)
const GuardedWorkoutBodyweight = withRefreshGuard(WorkoutBodyweight)
const GuardedWorkoutImport = withRefreshGuard(WorkoutImport)
const GuardedFinance = withRefreshGuard(Finance)
const GuardedFinanceTransactions = withRefreshGuard(FinanceTransactions)
const GuardedFinanceImport = withRefreshGuard(FinanceImport)
const GuardedFinanceSettings = withRefreshGuard(FinanceSettings)
const GuardedHabits = withRefreshGuard(Habits)
const GuardedHabitsSettings = withRefreshGuard(HabitsSettings)
const GuardedMedia = withRefreshGuard(Media)
const GuardedMediaImport = withRefreshGuard(MediaImport)
const GuardedMediaSettings = withRefreshGuard(MediaSettings)
const GuardedChatPage = withRefreshGuard(ChatPage)
const GuardedSettings = withRefreshGuard(Settings)
const GuardedMobileMenu = withRefreshGuard(MobileMenu)
const GuardedSpotifyCallback = withRefreshGuard(SpotifyCallback)

function NativeEntryRedirect() {
  const { accessToken, refreshToken } = getTokens()
  return <Navigate to={accessToken || refreshToken ? '/home' : '/login'} replace />
}

function NativeNotificationPermissionBoot({ nativeApp }) {
  useEffect(() => {
    if (!nativeApp) return

    let cancelled = false

    async function bootNotifications() {
      const permission = await getNotificationPermissionStatus()
      if (cancelled) return

      const alreadyAsked =
        localStorage.getItem(NOTIFICATION_PERMISSION_AUTO_REQUEST_KEY) === 'true'

      if (
        shouldAutoRequestNativeNotificationPermission({
          nativeApp,
          alreadyAsked,
          permission,
        })
      ) {
        localStorage.setItem(NOTIFICATION_PERMISSION_AUTO_REQUEST_KEY, 'true')
        await initializeNativeNotifications({ requestIfPrompt: true })
        return
      }

      if (permission === 'granted') {
        await initializeNativeNotifications({ requestIfPrompt: false })
      }
    }

    bootNotifications().catch(() => {})

    return () => {
      cancelled = true
    }
  }, [nativeApp])

  return null
}

export default function AppRouter() {
  const nativeApp = isNativeMobileApp()
  const [mobileBlocked, setMobileBlocked] = useState(false)

  useEffect(() => {
    const update = () => setMobileBlocked(isMobileBrowser())
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  useEffect(() => {
    document.body.classList.toggle('native-mobile-app', nativeApp)
    return () => document.body.classList.remove('native-mobile-app')
  }, [nativeApp])

  return (
    <PreferencesProvider>
      <BrowserRouter>
        <div className="app">
          <NativeNotificationPermissionBoot nativeApp={nativeApp} />
          <NativeUpdateGate nativeApp={nativeApp} />
          {mobileBlocked ? (
            <Routes>
              <Route path="/" element={<Landing mobileGate />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          ) : (
          <Routes>
            <Route path="/" element={nativeApp ? <NativeEntryRedirect /> : <Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route element={<AuthGuard><Layout /></AuthGuard>}>
              <Route path="/home" element={<GuardedHome />} />
              <Route path="/menu" element={<GuardedMobileMenu />} />
              <Route path="/profile" element={<Navigate to="/settings" replace />} />
              <Route path="/spotify" element={<GuardedSpotifyPersonal />} />
              <Route path="/spotify/personal" element={<GuardedSpotifyPersonal />} />
              <Route path="/spotify/global" element={<GuardedSpotifyGlobal />} />
              <Route path="/spotify/ranking" element={<GuardedSpotifyRanking />} />
              <Route path="/spotify/callback" element={<GuardedSpotifyCallback />} />
              <Route path="/workout" element={<GuardedWorkout />} />
              <Route path="/workout/active" element={<GuardedWorkoutActive />} />
              <Route path="/workout/history" element={<GuardedWorkoutHistory />} />
              <Route path="/workout/exercises" element={<GuardedWorkoutExercises />} />
              <Route path="/workout/bodyweight" element={<GuardedWorkoutBodyweight />} />
              <Route path="/workout/import" element={<GuardedWorkoutImport />} />
              <Route path="/finance" element={<GuardedFinance />} />
              <Route path="/finance/transactions" element={<GuardedFinanceTransactions />} />
              <Route path="/finance/import" element={<GuardedFinanceImport />} />
              <Route path="/finance/settings" element={<GuardedFinanceSettings />} />
              <Route path="/finance/wallets" element={<Navigate to="/finance/settings?tab=wallets" replace />} />
              <Route path="/finance/categories" element={<Navigate to="/finance/settings?tab=categories" replace />} />
              <Route path="/media" element={<GuardedMedia />} />
              <Route path="/media/import" element={<GuardedMediaImport />} />
              <Route path="/media/settings" element={<GuardedMediaSettings />} />
              <Route path="/chat" element={<GuardedChatPage />} />
              <Route path="/habits" element={<GuardedHabits />} />
              <Route path="/habits/settings" element={<GuardedHabitsSettings />} />
              <Route path="/habits/import" element={<Navigate to="/habits/settings?tab=import" replace />} />
              <Route path="/settings" element={<GuardedSettings />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          )}
        </div>
      </BrowserRouter>
    </PreferencesProvider>
  )
}
