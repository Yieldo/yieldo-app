// Token registry for display resolution (address → symbol + decimals).
// Mirrors ALL_TOKENS in DepositModal.jsx; kept standalone (no heavy deps) so
// lightweight components like UserDeposits can resolve a token without pulling
// in the whole deposit module. If you add a token to DepositModal, add it here.

export const NATIVE_ETH = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

export const ALL_TOKENS = {
  1: [
    { symbol: "ETH", address: NATIVE_ETH, decimals: 18, native: true },
    { symbol: "USDC", address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6 },
    { symbol: "USDT", address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6 },
    { symbol: "WETH", address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", decimals: 18 },
    { symbol: "WBTC", address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", decimals: 8 },
    { symbol: "cbBTC", address: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf", decimals: 8 },
    { symbol: "LBTC", address: "0x8236a87084f8B84306f72007F36F2618A5634494", decimals: 8 },
    { symbol: "tBTC", address: "0x18084fbA666a33d37592fA2633fD49a74DD93a88", decimals: 18 },
    { symbol: "DAI", address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", decimals: 18 },
    { symbol: "PYUSD", address: "0x6c3ea9036406852006290770BEdFcAbA0e23A0e8", decimals: 6 },
    { symbol: "USDe", address: "0x4c9EDD5852cd905f086C759E8383e09bff1E68B3", decimals: 18 },
    { symbol: "sUSDe", address: "0x9D39A5DE30e57443BfF2A8307A4256c8797A3497", decimals: 18 },
    { symbol: "USDS", address: "0xdC035D45d973E3EC169d2276DDab16f1e407384F", decimals: 18 },
    { symbol: "USDtb", address: "0xC139190F447e929f090edF9bB84c22a9D232dDA2", decimals: 18 },
    { symbol: "wstETH", address: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0", decimals: 18 },
    { symbol: "stETH", address: "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84", decimals: 18 },
    { symbol: "weETH", address: "0xCd5fE23C85820F7B72D0926FC9b05b43E359b7ee", decimals: 18 },
    { symbol: "cbETH", address: "0xBe9895146f7AF43049ca1c1AE358B0541Ea49704", decimals: 18 },
    { symbol: "rETH", address: "0xae78736Cd615f374D3085123A210448E74Fc6393", decimals: 18 },
    { symbol: "LINK", address: "0x514910771AF9Ca656af840dff83E8264EcF986CA", decimals: 18 },
  ],
  8453: [
    { symbol: "ETH", address: NATIVE_ETH, decimals: 18, native: true },
    { symbol: "USDC", address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", decimals: 6 },
    { symbol: "WETH", address: "0x4200000000000000000000000000000000000006", decimals: 18 },
    { symbol: "cbBTC", address: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf", decimals: 8 },
    { symbol: "cbETH", address: "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22", decimals: 18 },
    { symbol: "wstETH", address: "0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452", decimals: 18 },
    { symbol: "weETH", address: "0x04C0599Ae5A44757c0af6F9eC3b93da8976c150A", decimals: 18 },
    { symbol: "rETH", address: "0xB6fe221Fe9EeF5aBa221c348bA20A1Bf5e73624c", decimals: 18 },
    { symbol: "DAI", address: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb", decimals: 18 },
    { symbol: "USDbC", address: "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA", decimals: 6 },
    { symbol: "USDe", address: "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34", decimals: 18 },
    { symbol: "sUSDe", address: "0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2", decimals: 18 },
    { symbol: "USDS", address: "0x820C137fa70C8691f0e44Dc420a5e53c168921Dc", decimals: 18 },
    { symbol: "AERO", address: "0x940181a94A35A4569E4529A3CDfB74e38FD98631", decimals: 18 },
  ],
  42161: [
    { symbol: "ETH", address: NATIVE_ETH, decimals: 18, native: true },
    { symbol: "USDC", address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", decimals: 6 },
    { symbol: "USDT", address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", decimals: 6 },
    { symbol: "WETH", address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", decimals: 18 },
    { symbol: "WBTC", address: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", decimals: 8 },
    { symbol: "DAI", address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", decimals: 18 },
    { symbol: "wstETH", address: "0x5979D7b546E38E414F7E9822514be443A4800529", decimals: 18 },
    { symbol: "weETH", address: "0x35751007a407ca6FEFfE80b3cB397736D2cf4dbe", decimals: 18 },
    { symbol: "rETH", address: "0xEC70Dcb4A1EFa46b8F2D97C310C9c4790ba5ffA8", decimals: 18 },
    { symbol: "USDe", address: "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34", decimals: 18 },
    { symbol: "ARB", address: "0x912CE59144191C1204E64559FE8253a0e49E6548", decimals: 18 },
    { symbol: "LINK", address: "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", decimals: 18 },
    { symbol: "GMX", address: "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a", decimals: 18 },
  ],
  10: [
    { symbol: "ETH", address: NATIVE_ETH, decimals: 18, native: true },
    { symbol: "USDC", address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", decimals: 6 },
    { symbol: "USDT", address: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58", decimals: 6 },
    { symbol: "WETH", address: "0x4200000000000000000000000000000000000006", decimals: 18 },
    { symbol: "WBTC", address: "0x68f180fcCe6836688e9084f035309E29Bf0A2095", decimals: 8 },
    { symbol: "DAI", address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", decimals: 18 },
    { symbol: "OP", address: "0x4200000000000000000000000000000000000042", decimals: 18 },
    { symbol: "wstETH", address: "0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb", decimals: 18 },
    { symbol: "weETH", address: "0x5A7fACB970D094B6C7FF1df0eA68D99E6e73CBFF", decimals: 18 },
    { symbol: "rETH", address: "0x9Bcef72be871e61ED4fBbc7630889beE758eb81D", decimals: 18 },
    { symbol: "LINK", address: "0x350a791Bfc2C21F9Ed5d10980Dad2e2638ffa7f6", decimals: 18 },
  ],
  999: [
    { symbol: "HYPE", address: NATIVE_ETH, decimals: 18, native: true },
    { symbol: "USDC", address: "0xb88339CB7199b77E23DB6E890353E22632Ba630f", decimals: 6 },
    { symbol: "USDT0", address: "0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb", decimals: 6 },
    { symbol: "WHYPE", address: "0x5555555555555555555555555555555555555555", decimals: 18 },
    { symbol: "UBTC", address: "0x9FDBdA0A5e284c32744D2f17Ee5c74B284993463", decimals: 8 },
    { symbol: "USDe", address: "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34", decimals: 18 },
    { symbol: "USDT", address: "0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb", decimals: 6 },
    { symbol: "USR", address: "0x66E7c10e6f5C90B70C49F71B3Cf7E7a0eD5dD4fA", decimals: 18 },
    { symbol: "LHYPE", address: "0x5748ae796AE46A4F1348a1693de4b50560485562", decimals: 18 },
    { symbol: "stHYPE", address: "0xfFaA4a3D97fE9107Cef8a3F48c069F577Ff76cC1", decimals: 18 },
  ],
  143: [
    { symbol: "MON", address: NATIVE_ETH, decimals: 18, native: true },
    { symbol: "USDC", address: "0x754704Bc059F8C67012fEd69BC8A327a5aafb603", decimals: 6 },
    { symbol: "AUSD", address: "0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a", decimals: 6 },
    { symbol: "WETH", address: "0xEE8c0E9f1BFFb4Eb878d8f15f368A02a35481242", decimals: 18 },
  ],
  747474: [
    { symbol: "ETH", address: NATIVE_ETH, decimals: 18, native: true },
    { symbol: "USDC", address: "0x8Ff7Af1de8dC20cA3Eae3cf0bF4A93894706B7F4", decimals: 6 },
    { symbol: "WETH", address: "0xee7D8BCFb72bC1880D0Cf19822eB0A2e6577aB62", decimals: 18 },
    { symbol: "USDT", address: "0x2DCa96907fde857dd3D816880A0df407eeB2D2F2", decimals: 6 },
    { symbol: "WBTC", address: "0x0913dA6Da4b42f538B445599b46Bb4622342Cf52", decimals: 8 },
    { symbol: "AUSD", address: "0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a", decimals: 6 },
    { symbol: "KAT", address: "0x7F1f4b4b29f5058fA32CC7a97141b8D7e5abdC2d", decimals: 18 },
    { symbol: "vbUSDC", address: "0x203A662b0BD271A6ed5a60EdFbd04bFce608FD36", decimals: 6 },
    { symbol: "vbUSDT", address: "0x2DCa96907fde857dd3D816880A0df407eeB2D2F2", decimals: 6 },
    { symbol: "vbWBTC", address: "0x0913dA6Da4b42f538B445599b46Bb4622342Cf52", decimals: 8 },
    { symbol: "vbETH", address: "0xee7D8BCFb72bC1880D0Cf19822eB0A2e6577aB62", decimals: 18 },
  ],
  43114: [
    { symbol: "AVAX", address: NATIVE_ETH, decimals: 18, native: true },
    { symbol: "USDC", address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", decimals: 6 },
    { symbol: "USDT", address: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7", decimals: 6 },
    { symbol: "WAVAX", address: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", decimals: 18 },
    { symbol: "WETH.e", address: "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB", decimals: 18 },
    { symbol: "BTC.b", address: "0x152b9d0FdC40C096757F570A51E494bd4b943E50", decimals: 8 },
    { symbol: "DAI.e", address: "0xd586E7F844cEa2F87f50152665BCbc2C279D8d70", decimals: 18 },
  ],
  56: [
    { symbol: "BNB", address: NATIVE_ETH, decimals: 18, native: true },
    { symbol: "USDC", address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", decimals: 18 },
    { symbol: "USDT", address: "0x55d398326f99059fF775485246999027B3197955", decimals: 18 },
    { symbol: "WBNB", address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", decimals: 18 },
    { symbol: "ETH", address: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8", decimals: 18 },
    { symbol: "BTCB", address: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c", decimals: 18 },
    { symbol: "DAI", address: "0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3", decimals: 18 },
  ],
  100: [
    { symbol: "xDAI", address: NATIVE_ETH, decimals: 18, native: true },
    { symbol: "WXDAI", address: "0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d", decimals: 18 },
    { symbol: "USDC", address: "0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83", decimals: 6 },
    { symbol: "USDC.e", address: "0x2a22f9c3b484c3629090FeED35F17Ff8F88f76F0", decimals: 6 },
    { symbol: "USDT", address: "0x4ECaBa5870353805a9F068101A40E0f32ed605C6", decimals: 6 },
    { symbol: "WETH", address: "0x6A023CCd1ff6F2045C3309768eAd9E68F978f6e1", decimals: 18 },
    { symbol: "WBTC", address: "0x8e5bBbb09Ed1ebdE8674Cda39A0c169401db4252", decimals: 8 },
    { symbol: "sDAI", address: "0xaf204776c7245bF4147c2612BF6e5972Ee483701", decimals: 18 },
  ],
};

const _isAddress = (s) => /^0x[0-9a-fA-F]{40}$/.test(s || "");

// Resolve a token address on a chain → { symbol, decimals } or null.
export function resolveToken(chainId, address) {
  if (!_isAddress(address)) return null;
  const a = address.toLowerCase();
  const list = ALL_TOKENS[chainId] || [];
  return list.find((t) => t.address.toLowerCase() === a) || null;
}

function fmtNum(n) {
  if (!isFinite(n)) return String(n);
  if (n === 0) return "0";
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  if (abs < 0.0001) return n.toExponential(2);
  return n.toLocaleString(undefined, { maximumFractionDigits: abs < 1 ? 4 : 2 });
}

// Render a deposit/withdrawal amount + token label, handling BOTH storage
// shapes used across the app:
//   • API deposits:   from_token = address, from_amount = RAW integer  → scale
//     by the token decimals + show its symbol.
//   • Local deposits: from_token = symbol,  from_amount = HUMAN amount  → show
//     as-is with the symbol.
export function formatDepositAmount(chainId, token, amount) {
  if (amount == null || amount === "") return "—";
  if (_isAddress(token)) {
    const t = resolveToken(chainId, token);
    const decimals = t ? t.decimals : null;
    const sym = t ? t.symbol : `${token.slice(0, 6)}…${token.slice(-4)}`;
    if (decimals == null) return `${fmtNum(Number(amount))} ${sym}`.trim(); // unknown token: best-effort
    const human = Number(amount) / Math.pow(10, decimals);
    return `${fmtNum(human)} ${sym}`.trim();
  }
  // token is already a symbol; amount is already human
  return `${fmtNum(Number(amount))} ${token || ""}`.trim();
}
