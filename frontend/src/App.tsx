import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import RightRail from './components/RightRail'
import Sidebar from './components/Sidebar'
import Discover from './screens/Discover'
import Home from './screens/Home'
import Landing from './screens/Landing'
import MatchScreen from './screens/MatchScreen'
import Messages from './screens/Messages'
import Mission from './screens/Mission'
import Onboarding from './screens/Onboarding'
import People from './screens/People'
import Project from './screens/Project'
import Swipe from './screens/Swipe'
import Thread from './screens/Thread'
import { useApp } from './store'

const BARE_ROUTES = ['/', '/onboarding']

/**
 * Desktop: sidebar + a 600px column + a light right rail. Mobile: one column
 * with a bottom nav. The column is the scroll container, so thread views can
 * pin their input to the bottom with plain h-full.
 */
export default function App() {
  const { profile, booted } = useApp()
  const { pathname } = useLocation()
  const chrome = Boolean(profile) && !BARE_ROUTES.includes(pathname)

  const guard = (el: JSX.Element) => (profile ? el : <Navigate to="/" replace />)

  return (
    <div className="flex h-screen flex-col bg-page lg:flex-row lg:justify-center">
      {chrome && <Sidebar />}
      <main className="no-scrollbar min-h-0 flex-1 overflow-y-auto bg-page lg:w-[600px] lg:flex-none lg:border-x lg:border-line">
        {!booted ? null : (
          <Routes>
            <Route path="/" element={profile ? <Navigate to="/home" replace /> : <Landing />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/home" element={guard(<Home />)} />
            <Route path="/discover" element={guard(<Discover />)} />
            <Route path="/swipe" element={guard(<Swipe />)} />
            <Route path="/messages" element={guard(<Messages />)} />
            <Route path="/thread/:id" element={guard(<Thread />)} />
            <Route path="/mission/:id" element={guard(<Mission />)} />
            <Route path="/match/:id" element={guard(<MatchScreen />)} />
            <Route path="/people/:id" element={guard(<People />)} />
            <Route path="/profile" element={guard(<People />)} />
            <Route path="/projects/:id" element={guard(<Project />)} />
            <Route path="/me" element={<Navigate to="/profile" replace />} />
            <Route path="/matches" element={<Navigate to="/messages" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </main>
      {chrome && <RightRail />}
      {chrome && <BottomNav />}
    </div>
  )
}
