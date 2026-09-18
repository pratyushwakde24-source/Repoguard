import { Routes as RouterRoutes, Route as RouterRoute, Navigate as RouterNavigate } from 'react-router-dom'
import AppShell from './layouts/AppShell'
import Dashboard from './pages/Dashboard'
import Incidents from './pages/Incidents'
import MissionControl from './pages/MissionControl'
import Topology from './pages/Topology'
import SecurityCenter from './pages/SecurityCenter'
import PullRequests from './pages/PullRequests'
import Repositories from './pages/Repositories'
import RepositoryDetail from './pages/RepositoryDetail'
import AgentRuns from './pages/AgentRuns'
import Activity from './pages/Activity'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'
import { RepositoryProvider } from './context/RepositoryContext'

export default function App() {
  return (
    <RepositoryProvider>
      <RouterRoutes>
        <RouterRoute element={<AppShell />}>
          <RouterRoute path="/" element={<RouterNavigate to="/dashboard" replace />} />
          <RouterRoute path="/dashboard" element={<Dashboard />} />
          <RouterRoute path="/repositories" element={<Repositories />} />
          <RouterRoute path="/repositories/:id" element={<RepositoryDetail />} />
          <RouterRoute path="/topology" element={<Topology />} />
          <RouterRoute path="/incidents" element={<Incidents />} />
          <RouterRoute path="/incidents/:id" element={<MissionControl />} />
          <RouterRoute path="/agent-runs" element={<AgentRuns />} />
          <RouterRoute path="/agent-runs/:id" element={<AgentRuns />} />
          <RouterRoute path="/pull-requests" element={<PullRequests />} />
          <RouterRoute path="/security" element={<SecurityCenter />} />
          <RouterRoute path="/vulnerabilities" element={<SecurityCenter />} />
          <RouterRoute path="/activity" element={<Activity />} />
          <RouterRoute path="/analytics" element={<Analytics />} />
          <RouterRoute path="/settings" element={<Settings />} />
          <RouterRoute path="*" element={<RouterNavigate to="/dashboard" replace />} />
        </RouterRoute>
      </RouterRoutes>
    </RepositoryProvider>
  )
}
