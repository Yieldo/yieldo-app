// Compact bubble-flow diagram used on HistoryPage and elsewhere to visualise
// a deposit's path. Adapts to:
//   - direct same-chain:   [Wallet · USDC] -> [Vault]
//   - same-chain swap:     [Wallet · USDC] -> [DEX] -> [EURC] -> [Vault]
//   - cross-chain composer:[Wallet · src] -> [Bridge] -> [Dest token] -> [Vault]
//   - two-step (grouped):  Step 1 row + Step 2 row, both shown inline
//
// Status of each leg drives bubble color (green = done, amber = pending,
// red = failed/partial). Designed to be small enough to live inside a card.

import { CHAIN_NAMES } from "../chains.js";

const C = {
  text: "#121212", text2: "rgba(0,0,0,0.65)", text3: "rgba(0,0,0,0.4)", text4: "rgba(0,0,0,0.22)",
  border: "rgba(0,0,0,0.06)", border2: "rgba(0,0,0,0.1)",
  green: "#1a9d3f", greenDim: "rgba(26,157,63,0.10)",
  amber: "#d97706", amberDim: "rgba(217,119,6,0.10)",
  red: "#d93636", redDim: "rgba(217,54,54,0.10)",
  purple: "#7A1CCB", purpleDim: "rgba(122,28,203,0.08)",
  teal: "#2E9AB8", tealDim: "rgba(46,154,184,0.10)",
  white: "#fff", surfaceAlt: "#faf9fe",
};

const CHAIN_EMOJI = {
  1: "Ξ", 8453: "🔵", 42161: "🔷", 10: "🔴", 43114: "🔺",
  56: "🟡", 143: "🟣", 999: "💎", 747474: "⚔️",
};

function statusColors(status) {
  switch (status) {
    case "completed": return { fg: C.green, bg: C.greenDim };
    case "submitted":
    case "pending":   return { fg: C.amber, bg: C.amberDim };
    case "partial":   return { fg: C.amber, bg: C.amberDim };
    case "failed":    return { fg: C.red,   bg: C.redDim };
    case "abandoned": return { fg: C.text4, bg: "rgba(0,0,0,0.04)" };
    default:          return { fg: C.text3, bg: "rgba(0,0,0,0.04)" };
  }
}

function Bubble({ icon, label, sub, status, accent }) {
  const sc = status ? statusColors(status) : null;
  const fg = accent || (sc ? sc.fg : C.text2);
  const bg = sc ? sc.bg : C.surfaceAlt;
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "5px 10px", borderRadius: 999,
      background: bg, border: `1px solid ${fg}25`,
      fontSize: 11, fontWeight: 600, color: fg,
      whiteSpace: "nowrap", flexShrink: 0,
      fontFamily: "'Inter',sans-serif",
    }}>
      {icon && <span style={{ fontSize: 12, lineHeight: 1 }}>{icon}</span>}
      <span>{label}</span>
      {sub && <span style={{ fontSize: 10, fontWeight: 500, color: C.text3 }}>{sub}</span>}
    </div>
  );
}

function Arrow() {
  return (
    <svg width="14" height="8" viewBox="0 0 14 8" style={{ flexShrink: 0, opacity: 0.4 }}>
      <path d="M0 4 L11 4 M8 1 L11 4 L8 7" stroke="#666" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FlowRow({ children, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", rowGap: 6 }}>
      {label && (
        <span style={{ fontSize: 10, fontWeight: 700, color: C.text3, textTransform: "uppercase", letterSpacing: ".05em",
                       padding: "3px 8px", borderRadius: 4, background: C.surfaceAlt, border: `1px solid ${C.border}`,
                       flexShrink: 0 }}>
          {label}
        </span>
      )}
      {children}
    </div>
  );
}

/**
 * legs is an array of records that together form a single user action.
 * Each leg = one row in this diagram. Examples:
 *   - direct: legs = [recordA]
 *   - composer cross-chain: legs = [recordA] (single row, multiple bubbles)
 *   - two-step: legs = [bridgeRecord, depositRecord]  (two rows)
 */
export default function TxFlowDiagram({ legs, vault }) {
  if (!legs || !legs.length) return null;

  const rows = legs.map((leg, idx) => {
    const fromChain = leg.from_chain_id;
    const toChain = leg.to_chain_id || fromChain;
    const crossChain = toChain && fromChain !== toChain;
    const fromChainName = leg.from_chain_name || CHAIN_NAMES[fromChain] || `chain ${fromChain}`;
    const toChainName = CHAIN_NAMES[toChain] || `chain ${toChain}`;
    const fromIcon = CHAIN_EMOJI[fromChain] || "•";
    const toIcon = CHAIN_EMOJI[toChain] || "•";
    const status = leg.status;

    // Recover the from-token symbol for display (best-effort label only).
    const fromTokenLabel = leg.from_token_symbol || guessTokenSymbol(fromChain, leg.from_token) || "token";

    const isLastLeg = idx === legs.length - 1;
    const targetIsVault = isLastLeg; // last leg lands in the vault

    const bubbles = [];

    bubbles.push(<Bubble key="src" icon={fromIcon} label={fromTokenLabel} sub={`on ${fromChainName}`} status={status} />);

    if (crossChain) {
      bubbles.push(<Arrow key="a1" />);
      bubbles.push(<Bubble key="bridge" icon="↔" label={leg.bridge || "Bridge"} sub="cross-chain" status={status} accent={C.purple} />);
      bubbles.push(<Arrow key="a2" />);
      bubbles.push(<Bubble key="dst" icon={toIcon} label={`Arrived on ${toChainName}`} status={status} />);
    } else if (leg.quote_type === "same_chain_swap" || leg.quote_type === "swap") {
      bubbles.push(<Arrow key="a1" />);
      bubbles.push(<Bubble key="swap" icon="⇄" label="LiFi swap" status={status} accent={C.teal} />);
    }

    if (targetIsVault && vault) {
      bubbles.push(<Arrow key="av" />);
      bubbles.push(<Bubble key="vault" icon="🏦" label={vault.name || "Vault"} sub={vault.asset_symbol ? `→ ${vault.asset_symbol}` : null} status={status} accent={status === "completed" ? C.green : undefined} />);
    }

    return (
      <FlowRow key={leg._key || idx} label={legs.length > 1 ? `Step ${idx + 1}` : null}>
        {bubbles}
      </FlowRow>
    );
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
      {rows}
    </div>
  );
}

// Best-effort: pull a symbol for known token addresses on each chain. This
// avoids importing the giant TOKEN_META map from HistoryPage; we keep a small
// internal map for the most common deposits and fall back to a short hex.
const KNOWN = {
  "1:0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee": "ETH",
  "1:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": "USDC",
  "1:0xdac17f958d2ee523a2206206994597c13d831ec7": "USDT",
  "1:0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": "WETH",
  "1:0x2260fac5e5542a773aa44fbcfedf7c193bc2c599": "WBTC",
  "1:0x1abaea1f7c830bd89acc67ec4af516284b1bc33c": "EURC",
  "8453:0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee": "ETH",
  "8453:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913": "USDC",
  "8453:0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca": "USDbC",
  "8453:0x60a3e35cc302bfa44cb288bc5a4f316fdb1adb42": "EURC",
  "42161:0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee": "ETH",
  "42161:0xaf88d065e77c8cc2239327c5edb3a432268e5831": "USDC",
  "42161:0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9": "USDT",
  "10:0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee": "ETH",
  "10:0x0b2c639c533813f4aa9d7837caf62653d097ff85": "USDC",
  "43114:0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee": "AVAX",
  "43114:0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e": "USDC",
  "999:0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee": "HYPE",
  "999:0x5555555555555555555555555555555555555555": "WHYPE",
  "999:0xb88339cb7199b77e23db6e890353e22632ba630f": "USDC",
  "999:0xb8ce59fc3717ada4c02eadf9682a9e934f625ebb": "USDT0",
  "143:0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee": "MON",
  "143:0xf817257fed379853cde0fa4f97ab987181b1e5ea": "USDC",
  "8453:0x4200000000000000000000000000000000000006": "WETH",
  "8453:0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf": "cbBTC",
};
function guessTokenSymbol(chain, addr) {
  if (!addr) return null;
  return KNOWN[`${chain}:${String(addr).toLowerCase()}`] || null;
}
