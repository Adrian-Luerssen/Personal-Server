import React, { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom'
import Login from './pages/Auth/Login'
import Register from './pages/Auth/Register'
import Home from './pages/Home'
import Profile from './pages/Profile'
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
export default function AppRouter() {
  const [dark, setDark] = useState(true)

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  }, [dark])

  const GuardedHome = withRefreshGuard(Home)
  const GuardedProfile = withRefreshGuard(Profile)
  const GuardedSpotifyPersonal = withRefreshGuard(SpotifyPersonal)
  const GuardedSpotifyGlobal = withRefreshGuard(SpotifyGlobal)
  const GuardedWorkout = withRefreshGuard(Workout)
  const GuardedWorkoutActive = withRefreshGuard(WorkoutActive)
  const GuardedWorkoutHistory = withRefreshGuard(WorkoutHistory)
  const GuardedWorkoutExercises = withRefreshGuard(WorkoutExercises)
  const GuardedWorkoutBodyweight = withRefreshGuard(WorkoutBodyweight)
  const GuardedWorkoutImport = withRefreshGuard(WorkoutImport)

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
            
            {/* Workout routes */}
            <Route path="/workout" element={<GuardedWorkout />} />
            <Route path="/workout/active" element={<GuardedWorkoutActive />} />
            <Route path="/workout/history" element={<GuardedWorkoutHistory />} />
            <Route path="/workout/exercises" element={<GuardedWorkoutExercises />} />
            <Route path="/workout/bodyweight" element={<GuardedWorkoutBodyweight />} />
            <Route path="/workout/import" element={<GuardedWorkoutImport />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
