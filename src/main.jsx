import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import VaultPage from './pages/VaultPage.jsx'
import VaultDetailPage from './pages/VaultDetailPage.jsx'
import KolPage from './pages/KolPage.jsx'
import WalletPage from './pages/WalletPage.jsx'
import CuratorPage from './pages/CuratorPage.jsx'
import ProtectedRoute from './ProtectedRoute.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/vault" replace />} />
        <Route path="/vault" element={<VaultPage />} />
        <Route path="/vault/:vaultId" element={<VaultDetailPage />} />
        <Route
          path="/kol"
          element={(
            <ProtectedRoute type="kol">
              <KolPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/wallet"
          element={(
            <ProtectedRoute type="wallet">
              <WalletPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/curator"
          element={(
            <ProtectedRoute type="curator">
              <CuratorPage />
            </ProtectedRoute>
          )}
        />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
