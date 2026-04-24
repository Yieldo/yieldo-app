import { useState, useEffect, useCallback, useMemo } from "react";
import { useAccount, useWriteContract, useSendTransaction, useWaitForTransactionReceipt, useSwitchChain, useChainId } from "wagmi";
import { parseUnits, formatUnits, erc20Abi } from "viem";
import { CHAIN_NAMES as CHAINS, CHAIN_EXPLORERS as EXPLORERS } from "../chains.js";

const API = import.meta.env.VITE_PARTNER_API || "https://api.yieldo.xyz";

const C = {
  bg: "#f8f7fc", white: "#fff",
  border: "rgba(0,0,0,.06)", border2: "rgba(0,0,0,.1)",
  text: "#121212", text2: "rgba(0,0,0,.65)", text3: "rgba(0,0,0,.4)", text4: "rgba(0,0,0,.25)",
  purple: "#7A1CCB", purpleDim: "rgba(122,28,203,.06)",
  purpleGrad: "linear-gradient(100deg,#4B0CA6 0%,#7A1CCB 58%,#9E3BFF 114%)",
  purpleShadow: "0 0 17px rgba(80,14,170,.12)",
  green: "#1a9d3f", greenDim: "rgba(26,157,63,.07)",
  red: "#d93636", redBg: "#FFF0F0",
  amber: "#d97706", amberDim: "rgba(217,119,6,.06)",
};

const ASYNC_DELAY = { midas: "1–3 days (fulfilled by Midas)" };

function fmt(raw, decimals = 18, maxDp = 6) {
  try {
    const s = formatUnits(BigInt(raw), decimals);
    const [w, d = ""] = s.split(".");
    const ds = d.slice(0, maxDp).replace(/0+$/, "");
    return ds ? `${w}.${ds}` : w;
  } catch { return "0"; }
}

function Btn({ children, primary, small, secondary, onClick, disabled, full, style: sx = {} }) {
  const base = {
    fontFamily: "'Inter',sans-serif", fontSize: small ? 13 : 14, fontWeight: 500,
    border: "none", borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer",
    padding: small ? "8px 14px" : "12px 20px",
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
    width: full ? "100%" : undefined, opacity: disabled ? 0.5 : 1, transition: "all .15s", ...sx,
  };
  if (primary) return <button onClick={onClick} disabled={disabled} style={{ ...base, backgroundImage: C.purpleGrad, color: "#fff", boxShadow: C.purpleShadow }}>{children}</button>;
  if (secondary) return <button onClick={onClick} disabled={disabled} style={{ ...base, background: C.white, color: C.text2, border: `1px solid ${C.border2}` }}>{children}</button>;
  return <button onClick={onClick} disabled={disabled} style={base}>{children}</button>;
}

export default function WithdrawModal({ position, onClose }) {
  const { address } = useAccount();
  const currentChain = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const needsSwitch = currentChain !== position.chain_id;

  const [view, setView] = useState("input");  // input | preview | approving | signing | submitting | success | error
  const [amountInput, setAmountInput] = useState("");
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState("");
  const [approvalTxHash, setApprovalTxHash] = useState("");

  const shareDecimals = position.share_decimals || 18;
  const balance = BigInt(position.share_balance || "0");

  const sharesBN = useMemo(() => {
    if (!amountInput) return 0n;
    try { return parseUnits(amountInput, shareDecimals); } catch { return 0n; }
  }, [amountInput, shareDecimals]);

  const setMax = () => setAmountInput(formatUnits(balance, shareDecimals));
  const pctBtn = (p) => () => setAmountInput(formatUnits((balance * BigInt(p)) / 100n, shareDecimals));

  // === Flow ===

  const { writeContractAsync } = useWriteContract();
  const { sendTransactionAsync } = useSendTransaction();
  const { isLoading: isTxLoading, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({ hash: txHash || undefined });

  const getQuote = useCallback(async () => {
    setError("");
    if (sharesBN <= 0n) { setError("Enter an amount"); return; }
    if (sharesBN > balance) { setError("Exceeds balance"); return; }
    try {
      const res = await fetch(`${API}/v1/withdraw/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vault_id: position.vault_id,
          shares: sharesBN.toString(),
          user_address: address,
          slippage: 0.01,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Quote failed (${res.status})`);
      }
      const q = await res.json();
      setQuote(q);
      setView("preview");
    } catch (e) {
      setError(e.message || "Quote failed");
    }
  }, [sharesBN, balance, position.vault_id, address]);

  const submit = useCallback(async () => {
    setError("");
    if (!quote) return;
    const needsApproval = BigInt(quote.approval?.amount || "0") > 0n;

    try {
      if (needsSwitch) {
        await switchChainAsync({ chainId: position.chain_id });
      }

      if (needsApproval) {
        setView("approving");
        const approveTx = await writeContractAsync({
          address: position.vault_address,
          abi: erc20Abi,
          functionName: "approve",
          args: [quote.approval.spender_address, BigInt(sharesBN.toString())],
        });
        setApprovalTxHash(approveTx);
      }

      setView("signing");
      const buildRes = await fetch(`${API}/v1/withdraw/build`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vault_id: position.vault_id,
          shares: quote.shares,
          min_amount_out: quote.min_amount_out,
          user_address: address,
          nonce: quote.intent.nonce,
          deadline: quote.intent.deadline,
          signature: quote.signature,
          mode: quote.mode,
        }),
      });
      if (!buildRes.ok) {
        const body = await buildRes.json().catch(() => ({}));
        throw new Error(body.detail || `Build failed (${buildRes.status})`);
      }
      const build = await buildRes.json();

      setView("submitting");
      const hash = await sendTransactionAsync({
        to: build.transaction_request.to,
        data: build.transaction_request.data,
        value: BigInt(build.transaction_request.value || "0"),
        gas: BigInt(build.transaction_request.gas_limit || "500000"),
      });
      setTxHash(hash);
    } catch (e) {
      setError(e.shortMessage || e.message || "Transaction failed");
      setView("error");
    }
  }, [quote, needsSwitch, switchChainAsync, writeContractAsync, sendTransactionAsync, position, address, sharesBN]);

  useEffect(() => { if (isTxSuccess) setView("success"); }, [isTxSuccess]);

  const isAsync = quote?.mode === "async";

  // Vaults with no instant-redemption liquidity need to use their protocol's
  // native scheduled-withdraw flow — we can't build a reliable direct redeem.
  const EXTERNAL_WITHDRAW_SITES = {
    veda: { name: "Veda", url: "https://app.veda.tech" },
    ipor: { name: "IPOR", url: "https://app.ipor.io" },
    lido: { name: "Lido Earn", url: "https://earn.lido.fi" },
  };
  const externalSite = EXTERNAL_WITHDRAW_SITES[position.vault_type];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "'Inter',sans-serif" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.white, borderRadius: 16, width: "100%", maxWidth: 460, boxShadow: "0 20px 60px rgba(0,0,0,.15)" }}>
        <div style={{ padding: "18px 22px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Withdraw</span>
            <span style={{ fontSize: 12, color: C.text3 }}>{position.vault_name} · {CHAINS[position.chain_id]}</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, color: C.text3, cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ padding: 22 }}>
          {externalSite && (
            <div style={{ padding: "16px 4px" }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Withdraw via {externalSite.name}</div>
              <div style={{ fontSize: 13, color: C.text2, lineHeight: 1.5, marginBottom: 14 }}>
                This vault uses a scheduled-withdrawal flow that Yieldo's router doesn't yet proxy.
                Your position is safe. Withdraw directly on {externalSite.name}'s interface — deposits tracked in your Yieldo dashboard will reflect the balance change automatically.
              </div>
              <div style={{ padding: "10px 12px", borderRadius: 8, background: C.amberDim, fontSize: 12, color: C.text2, marginBottom: 14, lineHeight: 1.5 }}>
                Your <strong>{fmt(balance, shareDecimals)}</strong> {position.asset_symbol} shares are held in your wallet at the vault contract. {externalSite.name} will recognize them when you connect the same wallet.
              </div>
              <a href={externalSite.url} target="_blank" rel="noopener noreferrer" style={{ display: "block", textAlign: "center", padding: "12px 20px", borderRadius: 8, backgroundImage: C.purpleGrad, color: "#fff", fontWeight: 600, textDecoration: "none", fontSize: 14 }}>
                Open {externalSite.name} ↗
              </a>
              <div style={{ marginTop: 10 }}>
                <Btn secondary full onClick={onClose}>Close</Btn>
              </div>
            </div>
          )}
          {!externalSite && view === "input" && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: C.text3 }}>Shares to redeem</span>
                <button onClick={setMax} style={{ fontSize: 11, fontWeight: 600, color: C.purple, background: "none", border: "none", cursor: "pointer" }}>
                  Balance: {fmt(balance, shareDecimals)} MAX
                </button>
              </div>
              <input
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="0.0"
                style={{ width: "100%", padding: "14px 16px", fontSize: 18, fontWeight: 600, border: `1px solid ${C.border2}`, borderRadius: 10, outline: "none", fontFamily: "'Inter',sans-serif" }}
              />
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                {[25, 50, 75, 100].map((p) => (
                  <button key={p} onClick={pctBtn(p)} style={{ flex: 1, fontSize: 12, padding: "6px 0", border: `1px solid ${C.border}`, borderRadius: 6, background: C.white, color: C.text2, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>{p}%</button>
                ))}
              </div>
              {error && <div style={{ marginTop: 12, padding: "8px 12px", background: C.redBg, color: C.red, fontSize: 12, borderRadius: 6 }}>{error}</div>}
              <div style={{ marginTop: 16 }}>
                <Btn primary full onClick={getQuote} disabled={sharesBN <= 0n}>Review</Btn>
              </div>
            </>
          )}

          {view === "preview" && quote && (
            <>
              <Row label="Redeeming" value={`${fmt(quote.shares, shareDecimals)} shares`} />
              {quote.estimated_assets && (
                <Row label="You receive (est.)" value={`${fmt(quote.estimated_assets, 6)} ${position.asset_symbol}`} bold />
              )}
              <Row label="Min received" value={quote.min_amount_out !== "0" ? `${fmt(quote.min_amount_out, 6)} ${position.asset_symbol}` : "—"} light />
              <Row label="Slippage tolerance" value="1%" light />
              <Row label="Fee" value="0%" light />

              {isAsync && (
                <div style={{ marginTop: 12, padding: "10px 12px", background: C.amberDim, borderRadius: 8, fontSize: 12, color: C.text2, lineHeight: 1.5 }}>
                  <strong style={{ color: C.amber }}>Delayed withdrawal.</strong> This vault uses request-based redemption. Expected wait: {ASYNC_DELAY[position.vault_type] || "a few days"}. Your shares are locked in escrow until fulfilled. You'll be able to claim from your dashboard when ready.
                </div>
              )}
              {!isAsync && (
                <div style={{ marginTop: 12, padding: "10px 12px", background: C.greenDim, borderRadius: 8, fontSize: 12, color: C.text2 }}>
                  <strong style={{ color: C.green }}>Instant.</strong> Assets arrive in your wallet in this transaction.
                </div>
              )}

              {error && <div style={{ marginTop: 12, padding: "8px 12px", background: C.redBg, color: C.red, fontSize: 12, borderRadius: 6 }}>{error}</div>}

              <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
                <Btn secondary onClick={() => setView("input")}>Back</Btn>
                <Btn primary full onClick={submit}>
                  {needsSwitch ? `Switch to ${CHAINS[position.chain_id]} & Continue` : (isAsync ? "Submit Request" : "Confirm Withdraw")}
                </Btn>
              </div>
            </>
          )}

          {["approving", "signing", "submitting"].includes(view) && (
            <div style={{ padding: "20px 0", textAlign: "center" }}>
              <div style={{ width: 36, height: 36, margin: "0 auto 12px", border: `3px solid ${C.border2}`, borderTopColor: C.purple, borderRadius: "50%", animation: "yi-spin 1s linear infinite" }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                {view === "approving" && "Approving shares..."}
                {view === "signing" && "Building transaction..."}
                {view === "submitting" && "Submitting withdraw..."}
              </div>
              <div style={{ fontSize: 11, color: C.text3, marginTop: 4 }}>Confirm in your wallet</div>
              <style>{`@keyframes yi-spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {view === "success" && (
            <div style={{ textAlign: "center", padding: "12px 0" }}>
              <div style={{ width: 48, height: 48, margin: "0 auto 12px", background: C.greenDim, color: C.green, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>✓</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 6 }}>
                {isAsync ? "Request submitted" : "Withdrawal complete"}
              </div>
              <div style={{ fontSize: 12, color: C.text3, marginBottom: 14, lineHeight: 1.5 }}>
                {isAsync
                  ? "Your redemption is queued. Funds will arrive directly in your wallet when the protocol fulfills it — no claim step needed."
                  : `Assets have been sent to your wallet.`}
              </div>
              <a href={`${EXPLORERS[position.chain_id] || EXPLORERS[1]}/tx/${txHash}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: C.purple, textDecoration: "none" }}>
                View on explorer ↗
              </a>
              <div style={{ marginTop: 16 }}>
                <Btn primary full onClick={onClose}>Done</Btn>
              </div>
            </div>
          )}

          {view === "error" && (
            <div style={{ padding: "12px 0" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.red, marginBottom: 6 }}>Transaction failed</div>
              <div style={{ fontSize: 12, color: C.text2, marginBottom: 14, padding: "10px 12px", background: C.redBg, borderRadius: 6, wordBreak: "break-word" }}>{error}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn secondary onClick={onClose}>Close</Btn>
                <Btn primary full onClick={() => { setError(""); setView("preview"); }}>Retry</Btn>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold, light }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: `1px solid ${C.border}` }}>
      <span style={{ fontSize: 12, color: C.text3 }}>{label}</span>
      <span style={{ fontSize: bold ? 14 : 12, fontWeight: bold ? 700 : light ? 400 : 600, color: bold ? C.purple : C.text }}>{value}</span>
    </div>
  );
}
