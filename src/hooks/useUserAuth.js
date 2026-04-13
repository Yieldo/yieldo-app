import { useState, useEffect, useCallback, useRef } from "react";
import { useAccount, useSignMessage } from "wagmi";

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

  // Restore session when wallet connects (no auto-sign — only sign on deposit)
  useEffect(() => {
    if (!isConnected || !address) return;
    const stored = getStored();
    if (stored && stored.address?.toLowerCase() === address.toLowerCase()) {
      setSession(stored);
    }
  }, [isConnected, address]);

  // Validate session on mount
  useEffect(() => {
    const stored = getStored();
    if (!stored) { setSession(null); return; }
    fetch(`${API}/v1/users/me`, {
      headers: { Authorization: `Bearer ${stored.token}` },
    }).then(res => {
      if (!res.ok) {
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
      setLoading(false);
      return true;
    } catch (e) {
      setError(e.message || "Login failed");
      setLoading(false);
      return false;
    }
  };

  const login = useCallback(doLogin, [address, signMessageAsync]);

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
