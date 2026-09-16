import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { SessionProvider } from './access/SessionContext.jsx'
import RequireAuth from './access/RequireAuth.jsx'
import Login from './pages/Login/index.jsx'
import Logout from './pages/Logout/index.jsx'
import Beranda from './pages/Beranda/index.jsx'
import DashboardAdmin from './pages/DashboardAdmin/index.jsx'
import DaftarSantri from './pages/DaftarSantri/index.jsx'
import TahunAjaran from './pages/TahunAjaran/index.jsx'
import EditHalaqoh from './pages/EditHalaqoh/index.jsx'
import EditKelas from './pages/EditKelas/index.jsx'
import EditRegu from './pages/EditRegu/index.jsx'
import EditAkun from './pages/EditAkun/index.jsx'
import PengaturanTampilan from './pages/PengaturanTampilan/index.jsx'

// basename '/v2' HARUS sama dengan base di vite.config.js dan prefix proxy di backend/server.js.
export default function App() {
  return (
    <BrowserRouter basename="/v2">
      <SessionProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/logout" element={<Logout />} />

          <Route element={<RequireAuth />}>
            <Route path="/" element={<Navigate to="/beranda" replace />} />
            <Route path="/beranda" element={<Beranda />} />
            <Route path="/dashboardAdmin" element={<DashboardAdmin />} />
            <Route path="/daftarSantri" element={<DaftarSantri />} />
            <Route path="/tahunAjaran" element={<TahunAjaran />} />
            <Route path="/editHalaqoh" element={<EditHalaqoh />} />
            <Route path="/editKelas" element={<EditKelas />} />
            <Route path="/editRegu" element={<EditRegu />} />
            <Route path="/editAkun" element={<EditAkun />} />
            <Route path="/pengaturanTampilan" element={<PengaturanTampilan />} />
          </Route>
        </Routes>
      </SessionProvider>
    </BrowserRouter>
  )
}
