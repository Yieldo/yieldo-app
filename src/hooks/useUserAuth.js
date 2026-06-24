import { useState, useEffect, useCallback, useRef } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { getStoredClickId } from "./useTrackingParams.js";

const API = import.meta.env.VITE_PARTNER_API || "https://api.yieldo.xyz";
const STORAGE_KEY = "yieldo_user_session";

function getStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (new Date(data.expires_at) <= new Date()) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return data;
  } catch { return null; }
}

export function useUserAuth() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [session, setSession] = useState(getStored);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const autoLoginAttempted = useRef(false);

  // Clear session if wallet disconnects or address changes
  useEffect(() => {
    if (!isConnected || !address) {
      setSession(null);
      autoLoginAttempted.current = false;
      return;
    }
    const stored = getStored();
    if (stored && stored.address?.toLowerCase() !== address.toLowerCase()) {
      localStorage.removeItem(STORAGE_KEY);
      setSession(null);
      autoLoginAttempted.current = false;
    }
  }, [address, isConnected]);

  // Restore existing session when wallet connects (no auto-sign here — the
  // proactive-SIWE effect below handles the missing-session case).
  useEffect(() => {
    if (!isConnected || !address) return;
    const stored = getStored();
    if (stored && stored.address?.toLowerCase() === address.toLowerCase()) {
      setSession(stored);
    }
  }, [isConnected, address]);

  // Validate session on mount. If the server says the token is no longer
  // valid (revoked / pruned / clock-skew) we clear it locally so the next
  // effect can prompt for a fresh signature.
  useEffect(() => {
    const stored = getStored();
    if (!stored) { setSession(null); return; }
    fetch(`${API}/v1/users/me`, {
      headers: { Authorization: `Bearer ${stored.token}` },
    }).then(res => {
      // Only a DEFINITIVE 401 (invalid/expired/revoked token) should log the
      // user out. A transient 5xx, a 403, or a CORS/network hiccup must NOT
      // wipe a valid 48h+ session — that was forcing a re-sign every few
      // minutes whenever /me blipped. Network errors hit .catch() (no-op).
      if (res.status === 401) {
        localStorage.removeItem(STORAGE_KEY);
        setSession(null);
      }
    }).catch(() => {});
  }, []);

  const doLogin = async () => {
    if (!address) return false;
    setLoading(true);
    setError("");
    try {
      const nonceRes = await fetch(`${API}/v1/users/nonce`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      if (!nonceRes.ok) throw new Error("Failed to get nonce");
      const { message } = await nonceRes.json();

      const signature = await signMessageAsync({ message });

      const loginRes = await fetch(`${API}/v1/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, signature }),
      });
      if (!loginRes.ok) {
        const err = await loginRes.json().catch(() => ({}));
        throw new Error(err.detail || "Login failed");
      }
      const data = await loginRes.json();

      const sessionData = {
        token: data.session_token,
        expires_at: data.expires_at,
        address: address.toLowerCase(),
        user: data.user,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
      setSession(sessionData);

      // Attribution: if the visitor came from a tracked share link, post
      // the click_id alongside the wallet so the backend can link them.
      // Best-effort — never blocks the login on success. The server also
      // reads the click cookie if our localStorage value is missing.
      try {
        const clickId = getStoredClickId();
        fetch(`${API}/v1/track/attribute`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet: address, click_id: clickId || null }),
        }).catch(() => {});
      } catch {}

      setLoading(false);
      return true;
    } catch (e) {
      setError(e.message || "Login failed");
      setLoading(false);
      return false;
    }
  };

  const login = useCallback(doLogin, [address, signMessageAsync]);

  // Proactive SIWE: as soon as the wallet is connected AND we don't have a
  // valid stored session, fire the sign-in flow. Before this, the SIWE
  // popup was deferred until the user clicked Deposit — so someone opening
  // the app the next day with their wallet still connected could browse
  // for minutes, then be surprised by a sign prompt at the worst possible
  // moment (mid-deposit). Now the prompt arrives at the same moment the
  // wallet reports connected, which matches every user's mental model of
  // "I'm logged in if my wallet is connected and my session is fresh."
  //
  // `autoLoginAttempted` is reset on disconnect/address-change above, so a
  // single user-reject doesn't loop. If the user rejects, they can still
  // trigger the sign manually via any auth-gated action.
  useEffect(() => {
    if (!isConnected || !address) return;
    if (autoLoginAttempted.current) return;
    const stored = getStored();
    if (stored && stored.address?.toLowerCase() === address.toLowerCase()) {
      // Already have a fresh session — nothing to do.
      return;
    }
    autoLoginAttempted.current = true;
    // Tiny delay so wagmi's connection state has fully settled before we
    // hit the wallet provider with a sign request — otherwise some
    // providers (notably MetaMask mobile) drop the request as "no active
    // session yet" on cold-page-load races.
    const t = setTimeout(() => { doLogin(); }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address]);

  const logout = useCallback(() => {
    const stored = getStored();
    if (stored?.token) {
      fetch(`${API}/v1/users/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${stored.token}` },
      }).catch(() => {});
    }
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
  }, []);

  return {
    isAuthenticated: !!session,
    session,
    user: session?.user || null,
    token: session?.token || null,
    login,
    logout,
    loading,
    error,
  };
}
