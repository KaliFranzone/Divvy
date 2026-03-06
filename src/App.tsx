import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import JoinGroup from './pages/JoinGroup'
import GroupDashboard from './pages/GroupDashboard'
import ErrorBoundary from './components/ErrorBoundary'
import { ToastProvider } from './components/Toast'

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        {/* Animated background orbs */}
        <div className="bg-orbs">
          <div className="bg-orb bg-orb-1" />
          <div className="bg-orb bg-orb-2" />
          <div className="bg-orb bg-orb-3" />
        </div>
        {/* Light sweeps */}
        <div className="light-sweep" />
        {/* Noise texture overlay */}
        <div className="noise-overlay" />

        <BrowserRouter>
          <div className="relative z-10">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/group/:code" element={<JoinGroup />} />
              <Route path="/group/:code/dashboard" element={<GroupDashboard />} />
            </Routes>
          </div>
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  )
}
