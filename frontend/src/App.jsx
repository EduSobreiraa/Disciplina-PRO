import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './app/layouts/AppLayout'
import { DashboardPage } from './modules/dashboard/DashboardPage'
import { DisciplineTrackerPage } from './modules/discipline-tracker/pages/DisciplineTrackerPage'
import { DailyRitualPage } from './modules/daily-ritual/pages/DailyRitualPage'
import { GamificationPage } from './modules/gamification/pages/GamificationPage'
import { LoginPage } from './modules/auth/LoginPage'
import { ProfilePage } from './modules/profile/ProfilePage'
import { ProgramsPage } from './modules/programs/ProgramsPage'
import { Projeto66Layout } from './modules/projeto66/Projeto66Layout'
import { Projeto66JourneyPage } from './modules/projeto66/pages/Projeto66JourneyPage'
import { Projeto66OverviewPage } from './modules/projeto66/pages/Projeto66OverviewPage'
import { Projeto66ProgressPage } from './modules/projeto66/pages/Projeto66ProgressPage'
import { Projeto66RecordPage } from './modules/projeto66/pages/Projeto66RecordPage'
import { Projeto66MeditationPage } from './modules/projeto66/pages/Projeto66MeditationPage'
import { Projeto66NewSelfPage } from './modules/projeto66/pages/Projeto66NewSelfPage'
import { Projeto66TodayPage } from './modules/projeto66/pages/Projeto66TodayPage'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/app" element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="programas" element={<ProgramsPage />} />
        <Route path="programas/projeto66" element={<Projeto66Layout />}>
          <Route index element={<Projeto66OverviewPage />} />
          <Route path="hoje" element={<Projeto66TodayPage />} />
          <Route path="registrar" element={<Projeto66RecordPage />} />
          <Route path="meditar" element={<Projeto66MeditationPage />} />
          <Route path="novo-eu" element={<Projeto66NewSelfPage />} />
          <Route path="jornada" element={<Projeto66JourneyPage />} />
          <Route path="progresso" element={<Projeto66ProgressPage />} />
        </Route>
        <Route path="minha-evolucao" element={<DisciplineTrackerPage />} />
        <Route path="ritual" element={<DailyRitualPage />} />
        <Route path="conquistas" element={<GamificationPage />} />
        <Route path="perfil" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  )
}

export default App
