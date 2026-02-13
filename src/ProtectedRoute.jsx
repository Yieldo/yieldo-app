import { useEffect, useState } from "react"

const PASSWORDS = {
  vault: "Yieldo@vault",
  kol: "Yieldo@kol",
  wallet: "Yieldo@wallet",
  curator: "Yieldo@curator",
}

function ProtectedRoute({ type, children }) {
  const [unlocked, setUnlocked] = useState(false)
  const [value, setValue] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    const key = `yieldo_auth_${type}`
    if (sessionStorage.getItem(key) === "1") setUnlocked(true)
  }, [type])

  if (unlocked) return children

  const submit = (e) => {
    e.preventDefault()
    const expected = PASSWORDS[type]
    if (value === expected) {
      const key = `yieldo_auth_${type}`
      sessionStorage.setItem(key, "1")
      setUnlocked(true)
      setError("")
    } else {
      setError("Incorrect password")
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#020617",
        fontFamily: "'Inter',sans-serif",
        color: "#e5e7eb",
      }}
    >
      <div
        style={{
          width: 360,
          padding: 24,
          borderRadius: 16,
          background: "#0b1120",
          border: "1px solid rgba(148,163,184,0.35)",
          boxShadow: "0 24px 60px rgba(15,23,42,0.9)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 999,
              background: "linear-gradient(135deg,#22c55e,#22d3ee)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 700,
              color: "#020617",
            }}
          >
            Y
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase" }}>Yieldo</div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Enter access password</div>
          <div style={{ fontSize: 13, color: "#9ca3af" }}>This {type} console is protected. Only users with the correct password can open it.</div>
        </div>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 12, color: "#9ca3af", fontWeight: 500 }}>Password</label>
            <input
              type="password"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid rgba(148,163,184,0.6)",
                background: "#020617",
                color: "#e5e7eb",
                fontSize: 13,
                outline: "none",
              }}
            />
          </div>
          {error && (
            <div style={{ fontSize: 12, color: "#f87171" }}>
              {error}
            </div>
          )}
          <button
            type="submit"
            style={{
              marginTop: 4,
              padding: "8px 10px",
              borderRadius: 999,
              border: "none",
              background: "linear-gradient(90deg,#22c55e,#22d3ee)",
              color: "#020617",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Unlock
          </button>
        </form>
      </div>
    </div>
  )
}

export default ProtectedRoute


