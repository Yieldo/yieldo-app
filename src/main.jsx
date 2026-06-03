import { StrictMode, Suspense, lazy, useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate, useLocation } from 'react-router-dom'
import { WagmiProvider } from 'wagmi'
import { useAccount } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider } from '@rainbow-me/rainbowkit'
import '@rainbow-me/rainbowkit/styles.css'
import { Analytics } from '@vercel/analytics/react'
import { config } from './walletConfig.jsx'
// Route pages are lazy-loaded so the landing route (/vault) doesn't ship every
// page's code in the entry bundle. Each page becomes its own chunk, fetched on
// navigation — this is the main lever on first-paint time.
const VaultPage = lazy(() => import('./pages/VaultPage.jsx'))
const VaultDetailPage = lazy(() => import('./pages/VaultDetailPage.jsx'))
const KolPage = lazy(() => import('./pages/KolPage.jsx'))
const KolLandingPage = lazy(() => import('./pages/KolLandingPage.jsx'))
const WalletsPage = lazy(() => import('./pages/WalletsPage.jsx'))
const VaultProviderPage = lazy(() => import('./pages/VaultProviderPage.jsx'))
const CuratorPage = lazy(() => import('./pages/CuratorPage.jsx'))
const ApplyPage = lazy(() => import('./pages/ApplyPage.jsx'))
const VaultScoringPage = lazy(() => import('./pages/VaultScoringPage.jsx'))
const PortfolioPage = lazy(() => import('./pages/PortfolioPage.jsx'))
const ReferralsPage = lazy(() => import('./pages/ReferralsPage.jsx'))
const HistoryPage = lazy(() => import('./pages/HistoryPage.jsx'))
const EmbedBadgePage = lazy(() => import('./pages/EmbedBadgePage.jsx'))
const IntelPage = lazy(() => import('./pages/IntelPage.jsx'))
const AdminPage = lazy(() => import('./pages/AdminPage.jsx'))
const AdminVaultDetailPage = lazy(() => import('./pages/AdminVaultDetailPage.jsx'))
import ProtectedRoute from './ProtectedRoute.jsx'
import TxTracker from './components/TxTracker.jsx'
import RefTracker from './components/RefTracker.jsx'
import ClickTracker from './components/ClickTracker.jsx'
import './index.css'

const queryClient = new QueryClient()

// Lightweight full-screen fallback while a route chunk loads.
function RouteFallback() {
  return (
    <div style={{ fontFamily: "'Inter',sans-serif", background: "#f8f7fc", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, backgroundImage: "linear-gradient(100deg,#4B0CA6 0%,#7A1CCB 58%,#9E3BFF 114%)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 18 }}>Y</div>
    </div>
  )
}

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

  // Auto-route on first connect was hijacking the default landing for users
  // with multiple roles (e.g. an investor who's also a wallet partner). The
  // RoleSwitcher in the navbar lets them pick — keep the default page as the
  // public investor view. Disabled intentionally; restore only if there's a
  // strong reason to bias one role's dashboard.
  // Original behaviour:
  //   if connected wallet has role=wallet → /wallets, role=creator/kol → /creator

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
            <Analytics />
            <TxTracker />
            <RefTracker />
            <ClickTracker />
            <RoleRedirect />
            <Suspense fallback={<RouteFallback />}>
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
              <Route path="/embed" element={<EmbedBadgePage />} />
              <Route path="/intel" element={<IntelPage />} />
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
              <Route path="/curator" element={<CuratorPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/admin/vault/:vaultId" element={<AdminVaultDetailPage />} />
            </Routes>
            </Suspense>
          </BrowserRouter>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
)
