import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import Landing from './screens/Landing'
import Matches from './screens/Matches'
import MatchScreen from './screens/MatchScreen'
import MeScreen from './screens/MeScreen'
import Mission from './screens/Mission'
import Onboarding from './screens/Onboarding'
import Swipe from './screens/Swipe'
import { useApp } from './store'

const NAV_ROUTES = ['/swipe', '/matches', '/me']

export default function App() {
  const { profile, booted } = useApp()
  const { pathname } = useLocation()
  const showNav = NAV_ROUTES.some((r) => pathname.startsWith(r))

  return (
    <div className="flex min-h-screen items-center justify-center p-0 sm:p-6">
      <div className="flex h-screen w-full max-w-[420px] flex-col overflow-hidden bg-page sm:h-[min(860px,calc(100vh-3rem))] sm:rounded-[40px] sm:border sm:border-black/10 sm:shadow-[0_24px_70px_rgba(0,0,0,0.12)]">
        <div className="no-scrollbar flex-1 overflow-y-auto">
          {!booted ? null : (
            <Routes>
              <Route path="/" element={profile ? <Navigate to="/swipe" replace /> : <Landing />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/swipe" element={profile ? <Swipe /> : <Navigate to="/" replace />} />
              <Route path="/match/:id" element={<MatchScreen />} />
              <Route path="/mission/:id" element={<Mission />} />
              <Route path="/matches" element={profile ? <Matches /> : <Navigate to="/" replace />} />
              <Route path="/me" element={profile ? <MeScreen /> : <Navigate to="/" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          )}
        </div>
        {showNav && profile && <BottomNav />}
      </div>
    </div>
  )
}
