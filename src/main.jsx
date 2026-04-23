import { StrictMode, useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate, useLocation } from 'react-router-dom'
import { WagmiProvider } from 'wagmi'
import { useAccount } from 'wagmi'
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
import PortfolioPage from './pages/PortfolioPage.jsx'
import ReferralsPage from './pages/ReferralsPage.jsx'
import HistoryPage from './pages/HistoryPage.jsx'
import ProtectedRoute from './ProtectedRoute.jsx'
import TxTracker from './components/TxTracker.jsx'
import RefTracker from './components/RefTracker.jsx'
import './index.css'

const queryClient = new QueryClient()

function KolRedirect() {
  const { handle } = useParams()
  return <Navigate to={`/u/${handle}${window.location.search}`} replace />
}

function CreatorDashboardRedirect() {
  return <Navigate to="/creator" replace />
}

const DEPOSIT_API = import.meta.env.VITE_PARTNER_API || "https://api.yieldo.xyz";

function RoleRedirect() {
  const { address, isConnected } = useAccount();
  const navigate = useNavigate();
  const location = useLocation();
  const checked = useRef(false);

  useEffect(() => {
    if (!isConnected || !address || checked.current) return;
    const onDefault = location.pathname === "/" || location.pathname === "/vault" || location.pathname === "/dashboard";
    if (!onDefault) return;

    checked.current = true;
    fetch(`${DEPOSIT_API}/v1/users/role/${address}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        if (data.role === "creator" || data.role === "kol") navigate("/creator", { replace: true });
        else if (data.role === "wallet") navigate("/wallets", { replace: true });
      })
      .catch(() => {});
  }, [isConnected, address, location.pathname, navigate]);

  useEffect(() => {
    if (!isConnected) checked.current = false;
  }, [isConnected]);

  return null;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <BrowserRouter>
            <TxTracker />
            <RefTracker />
            <RoleRedirect />
            <Routes>
              <Route path="/" element={<Navigate to="/vault" replace />} />
              <Route path="/vault" element={<VaultPage />} />
              <Route path="/dashboard" element={<Navigate to="/portfolio" replace />} />
              <Route path="/vault/:vaultId" element={<VaultDetailPage />} />
              <Route path="/portfolio" element={<PortfolioPage />} />
              <Route path="/referrals" element={<ReferralsPage />} />
              <Route path="/history" element={<HistoryPage />} />
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
              <Route path="/creator" element={<KolPage />} />
              <Route path="/kol" element={<CreatorDashboardRedirect />} />
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
