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
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/group/:code" element={<JoinGroup />} />
            <Route path="/group/:code/dashboard" element={<GroupDashboard />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  )
}
