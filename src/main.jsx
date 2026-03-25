import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider } from '@rainbow-me/rainbowkit'
import '@rainbow-me/rainbowkit/styles.css'
import { config } from './walletConfig.jsx'
import VaultPage from './pages/VaultPage.jsx'
import VaultDetailPage from './pages/VaultDetailPage.jsx'
import KolPage from './pages/KolPage.jsx'
import WalletPage from './pages/WalletPage.jsx'
import WalletsPage from './pages/WalletsPage.jsx'
import VaultProviderPage from './pages/VaultProviderPage.jsx'
import CuratorPage from './pages/CuratorPage.jsx'
import ApplyPage from './pages/ApplyPage.jsx'
import VaultScoringPage from './pages/VaultScoringPage.jsx'
import ProtectedRoute from './ProtectedRoute.jsx'
import './index.css'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<VaultPage />} />
              <Route path="/vault" element={<VaultPage />} />
              <Route path="/vault/:vaultId" element={<VaultDetailPage />} />
              <Route path="/apply" element={<ApplyPage />} />
              <Route path="/wallets" element={<WalletsPage />} />
              <Route path="/vault-provider" element={<VaultProviderPage />} />
              <Route
                path="/vaultscoring"
                element={(
                  <ProtectedRoute type="vaultscoring">
                    <VaultScoringPage />
                  </ProtectedRoute>
                )}
              />
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
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
)
