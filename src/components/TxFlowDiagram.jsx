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
  // Ethereum
  "1:0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee": "ETH",
  "1:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": "USDC",
  "1:0xdac17f958d2ee523a2206206994597c13d831ec7": "USDT",
  "1:0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": "WETH",
  "1:0x2260fac5e5542a773aa44fbcfedf7c193bc2c599": "WBTC",
  "1:0x1abaea1f7c830bd89acc67ec4af516284b1bc33c": "EURC",
  // Base
  "8453:0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee": "ETH",
  "8453:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913": "USDC",
  "8453:0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca": "USDbC",
  "8453:0x60a3e35cc302bfa44cb288bc5a4f316fdb1adb42": "EURC",
  "8453:0x4200000000000000000000000000000000000006": "WETH",
  "8453:0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf": "cbBTC",
  // Arbitrum
  "42161:0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee": "ETH",
  "42161:0xaf88d065e77c8cc2239327c5edb3a432268e5831": "USDC",
  "42161:0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9": "USDT",
  // Optimism
  "10:0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee": "ETH",
  "10:0x0b2c639c533813f4aa9d7837caf62653d097ff85": "USDC",
  // Avalanche
  "43114:0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee": "AVAX",
  "43114:0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e": "USDC",
  "43114:0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7": "USDT",
  "43114:0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7": "WAVAX",
  "43114:0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab": "WETH.e",
  "43114:0x152b9d0fdc40c096757f570a51e494bd4b943e50": "BTC.b",
  "43114:0xd586e7f844cea2f87f50152665bcbc2c279d8d70": "DAI.e",
  // BNB Smart Chain
  "56:0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee": "BNB",
  "56:0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d": "USDC",
  "56:0x55d398326f99059ff775485246999027b3197955": "USDT",
  "56:0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c": "WBNB",
  "56:0x2170ed0880ac9a755fd29b2688956bd959f933f8": "ETH",
  "56:0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c": "BTCB",
  "56:0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3": "DAI",
  // Gnosis
  "100:0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee": "xDAI",
  "100:0xe91d153e0b41518a2ce8dd3d7944fa863463a97d": "WXDAI",
  "100:0xddafbb505ad214d7b80b1f830fccc89b60fb7a83": "USDC",
  "100:0x2a22f9c3b484c3629090feed35f17ff8f88f76f0": "USDC.e",
  "100:0x4ecaba5870353805a9f068101a40e0f32ed605c6": "USDT",
  "100:0x6a023ccd1ff6f2045c3309768ead9e68f978f6e1": "WETH",
  "100:0x8e5bbbb09ed1ebde8674cda39a0c169401db4252": "WBTC",
  "100:0xaf204776c7245bf4147c2612bf6e5972ee483701": "sDAI",
  // HyperEVM
  "999:0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee": "HYPE",
  "999:0x5555555555555555555555555555555555555555": "WHYPE",
  "999:0xb88339cb7199b77e23db6e890353e22632ba630f": "USDC",
  "999:0xb8ce59fc3717ada4c02eadf9682a9e934f625ebb": "USDT0",
  // Monad
  "143:0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee": "MON",
  "143:0x754704bc059f8c67012fed69bc8a327a5aafb603": "USDC",
  "143:0x00000000efe302beaa2b3e6e1b18d08d69a9012a": "AUSD",
  "143:0xee8c0e9f1bffb4eb878d8f15f368a02a35481242": "WETH",
  // Katana
  "747474:0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee": "ETH",
  "747474:0x8ff7af1de8dc20ca3eae3cf0bf4a93894706b7f4": "USDC",
  "747474:0x2dca96907fde857dd3d816880a0df407eeb2d2f2": "USDT",
  "747474:0xee7d8bcfb72bc1880d0cf19822eb0a2e6577ab62": "WETH",
  "747474:0x0913da6da4b42f538b445599b46bb4622342cf52": "WBTC",
  "747474:0x00000000efe302beaa2b3e6e1b18d08d69a9012a": "AUSD",
};
function guessTokenSymbol(chain, addr) {
  if (!addr) return null;
  return KNOWN[`${chain}:${String(addr).toLowerCase()}`] || null;
}
