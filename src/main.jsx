import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider } from '@rainbow-me/rainbowkit'
import '@rainbow-me/rainbowkit/styles.css'
import { config } from './walletConfig.jsx'
import VaultPage from './pages/VaultPage.jsx'
import VaultDetailPage from './pages/VaultDetailPage.jsx'
import KolPage from './pages/KolPage.jsx'
import KolLandingPage from './pages/KolLandingPage.jsx'
import WalletsPage from './pages/WalletsPage.jsx'
import VaultProviderPage from './pages/VaultProviderPage.jsx'
import CuratorPage from './pages/CuratorPage.jsx'
import ApplyPage from './pages/ApplyPage.jsx'
import VaultScoringPage from './pages/VaultScoringPage.jsx'
import ProtectedRoute from './ProtectedRoute.jsx'
import TxTracker from './components/TxTracker.jsx'
import RefTracker from './components/RefTracker.jsx'
import './index.css'

const queryClient = new QueryClient()

function KolRedirect() {
  const { handle } = useParams()
  return <Navigate to={`/u/${handle}${window.location.search}`} replace />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <BrowserRouter>
            <TxTracker />
            <RefTracker />
            <Routes>
              <Route path="/" element={<Navigate to="/vault" replace />} />
              <Route path="/vault" element={<VaultPage />} />
              <Route path="/dashboard" element={<VaultPage />} />
              <Route path="/vault/:vaultId" element={<VaultDetailPage />} />
              <Route path="/apply" element={<ApplyPage />} />
              <Route path="/wallets" element={<WalletsPage />} />
              <Route path="/u/:handle" element={<KolLandingPage />} />
              <Route path="/kol/:handle" element={<KolRedirect />} />
              <Route path="/vault-provider" element={<VaultProviderPage />} />
              <Route
                path="/vaultscoring"
                element={(
                  <ProtectedRoute type="vaultscoring">
                    <VaultScoringPage />
                  </ProtectedRoute>
                )}
              />
              <Route path="/kol" element={<KolPage />} />
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
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
)
