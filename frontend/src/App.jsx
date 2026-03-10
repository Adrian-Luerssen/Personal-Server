import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Auth/Login'
import Register from './pages/Auth/Register'
import Home from './pages/Home'
// Profile merged into Settings > Account tab
import SpotifyPersonal from './pages/Spotify/SpotifyPersonal'
import SpotifyGlobal from './pages/Spotify/SpotifyGlobal'
import withRefreshGuard from './withRefreshGuard'
import Layout from './components/Layout'
import AuthGuard from './components/AuthGuard'
import Landing from './pages/Landing'
import Workout from './pages/Workout/Workout'
import WorkoutActive from './pages/Workout/WorkoutActive'
import WorkoutHistory from './pages/Workout/WorkoutHistory'
import WorkoutExercises from './pages/Workout/WorkoutExercises'
import WorkoutBodyweight from './pages/Workout/WorkoutBodyweight'
import WorkoutImport from './pages/Workout/WorkoutImport'
import Finance from './pages/Finance/Finance'
import FinanceTransactions from './pages/Finance/FinanceTransactions'
import FinanceWallets from './pages/Finance/FinanceWallets'
import FinanceImport from './pages/Finance/FinanceImport'
import Habits from './pages/Habits/Habits'
import HabitsImport from './pages/Habits/HabitsImport'
import Settings from './pages/Settings/Settings'
import SpotifyCallback from './pages/Spotify/SpotifyCallback'
import { PreferencesProvider } from './contexts/PreferencesContext'
import { applyChartTheme } from './chartTheme'

applyChartTheme()

// BUG FIX B1: Move HOC calls to module scope to prevent unmount/remount on every render
const GuardedHome = withRefreshGuard(Home)
// Profile removed - merged into Settings
const GuardedSpotifyPersonal = withRefreshGuard(SpotifyPersonal)
const GuardedSpotifyGlobal = withRefreshGuard(SpotifyGlobal)
const GuardedWorkout = withRefreshGuard(Workout)
const GuardedWorkoutActive = withRefreshGuard(WorkoutActive)
const GuardedWorkoutHistory = withRefreshGuard(WorkoutHistory)
const GuardedWorkoutExercises = withRefreshGuard(WorkoutExercises)
const GuardedWorkoutBodyweight = withRefreshGuard(WorkoutBodyweight)
const GuardedWorkoutImport = withRefreshGuard(WorkoutImport)
const GuardedFinance = withRefreshGuard(Finance)
const GuardedFinanceTransactions = withRefreshGuard(FinanceTransactions)
const GuardedFinanceWallets = withRefreshGuard(FinanceWallets)
const GuardedFinanceImport = withRefreshGuard(FinanceImport)
const GuardedHabits = withRefreshGuard(Habits)
const GuardedHabitsImport = withRefreshGuard(HabitsImport)
const GuardedSettings = withRefreshGuard(Settings)
const GuardedSpotifyCallback = withRefreshGuard(SpotifyCallback)

export default function AppRouter() {
  return (
    <PreferencesProvider>
      <BrowserRouter>
        <div className="app">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route element={<AuthGuard><Layout /></AuthGuard>}>
              <Route path="/home" element={<GuardedHome />} />
              <Route path="/profile" element={<Navigate to="/settings" replace />} />
              <Route path="/spotify" element={<GuardedSpotifyPersonal />} />
              <Route path="/spotify/personal" element={<GuardedSpotifyPersonal />} />
              <Route path="/spotify/global" element={<GuardedSpotifyGlobal />} />
              <Route path="/spotify/callback" element={<GuardedSpotifyCallback />} />
              <Route path="/workout" element={<GuardedWorkout />} />
              <Route path="/workout/active" element={<GuardedWorkoutActive />} />
              <Route path="/workout/history" element={<GuardedWorkoutHistory />} />
              <Route path="/workout/exercises" element={<GuardedWorkoutExercises />} />
              <Route path="/workout/bodyweight" element={<GuardedWorkoutBodyweight />} />
              <Route path="/workout/import" element={<GuardedWorkoutImport />} />
              <Route path="/finance" element={<GuardedFinance />} />
              <Route path="/finance/transactions" element={<GuardedFinanceTransactions />} />
              <Route path="/finance/wallets" element={<GuardedFinanceWallets />} />
              <Route path="/finance/import" element={<GuardedFinanceImport />} />
              <Route path="/habits" element={<GuardedHabits />} />
              <Route path="/habits/import" element={<GuardedHabitsImport />} />
              <Route path="/settings" element={<GuardedSettings />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </PreferencesProvider>
  )
}
