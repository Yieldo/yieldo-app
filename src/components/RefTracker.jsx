import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

const STORAGE_KEY = "yieldo_referral";

export function getStoredRef() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

export function clearStoredRef() {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event("yieldo_ref_change"));
}

// Headless: captures `?ref=<handle>` from the URL into localStorage so
// downstream consumers (DepositModal, etc.) can attribute the deposit.
// Renders nothing — the bottom-left badge was removed by request.
export default function RefTracker() {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const refParam = searchParams.get("ref");
    if (refParam && refParam.trim()) {
      const handle = refParam.trim().toLowerCase();
      const data = { handle, stored_at: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      // Strip ?ref= from the visible URL without reload.
      searchParams.delete("ref");
      setSearchParams(searchParams, { replace: true });
      window.dispatchEvent(new Event("yieldo_ref_change"));
    }
  }, [searchParams, setSearchParams]);

  return null;
}
