import { useState, useEffect } from "react";
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

export default function RefTracker() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [ref, setRef] = useState(getStoredRef);
  const [dismissed, setDismissed] = useState(false);

  // Check URL for ?ref= on every navigation
  useEffect(() => {
    const refParam = searchParams.get("ref");
    if (refParam && refParam.trim()) {
      const handle = refParam.trim().toLowerCase();
      const data = { handle, stored_at: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setRef(data);
      setDismissed(false);
      // Remove ?ref= from URL without reload
      searchParams.delete("ref");
      setSearchParams(searchParams, { replace: true });
      window.dispatchEvent(new Event("yieldo_ref_change"));
    }
  }, [searchParams]);

  // Listen for ref changes from other components
  useEffect(() => {
    const onRefChange = () => setRef(getStoredRef());
    window.addEventListener("yieldo_ref_change", onRefChange);
    return () => window.removeEventListener("yieldo_ref_change", onRefChange);
  }, []);

  if (!ref || dismissed) return null;

  return (
    <div style={{
      position: "fixed", bottom: 68, left: 20, zIndex: 9990,
      display: "flex", alignItems: "center", gap: 8,
      padding: "8px 14px", borderRadius: 10,
      background: "#fff", border: "1px solid rgba(26,157,63,.2)",
      boxShadow: "0 2px 12px rgba(0,0,0,.08)",
      fontFamily: "'Inter',sans-serif", fontSize: 12,
    }}>
      <span style={{ color: "#1a9d3f", fontWeight: 600 }}>Referred by @{ref.handle}</span>
      <button onClick={() => { clearStoredRef(); setRef(null); }} style={{
        background: "none", border: "none", fontSize: 14, cursor: "pointer",
        color: "rgba(0,0,0,.3)", padding: "0 2px", lineHeight: 1,
      }} title="Remove referral">✕</button>
    </div>
  );
}
