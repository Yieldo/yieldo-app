import { useEffect, useState } from "react";

// Breakpoints aligned with modern device classes (Tailwind-ish but trimmed
// for our actual layouts). Use these everywhere — never hard-code 768/1024.
export const BP = {
  xs: 0,      // very small phones
  sm: 480,    // standard phones
  md: 768,    // tablets / large phones
  lg: 1024,   // small laptops
  xl: 1280,   // standard desktops
  xxl: 1536,  // large desktops
};

export function getBreakpoint(w) {
  if (w >= BP.xxl) return "xxl";
  if (w >= BP.xl)  return "xl";
  if (w >= BP.lg)  return "lg";
  if (w >= BP.md)  return "md";
  if (w >= BP.sm)  return "sm";
  return "xs";
}

// Single hook for all responsive logic. Subscribes to window resize once
// and returns the current breakpoint + raw width + boolean shortcuts.
// SSR-safe: returns "lg" on the server so server-rendered output matches the
// most common client.
export function useResponsive() {
  const [w, setW] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 1024));
  useEffect(() => {
    if (typeof window === "undefined") return;
    let raf = null;
    const onResize = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setW(window.innerWidth));
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  const bp = getBreakpoint(w);
  return {
    width: w,
    bp,
    isMobile: w < BP.md,        // < 768
    isPhone:  w < BP.sm,        // < 480
    isTablet: w >= BP.md && w < BP.lg,
    isDesktop: w >= BP.lg,
    isWide:   w >= BP.xl,
  };
}

// Pick the right value per breakpoint. Pass a partial object — falls back
// from xxl→xl→lg→md→sm→xs to find the nearest defined value.
//   pick(bp, { xs: 12, md: 16, xl: 20 })
const ORDER = ["xs", "sm", "md", "lg", "xl", "xxl"];
export function pick(bp, values) {
  if (values == null) return undefined;
  if (typeof values !== "object" || Array.isArray(values)) return values;
  // Find defined value at or below current bp
  const idx = ORDER.indexOf(bp);
  for (let i = idx; i >= 0; i--) {
    if (values[ORDER[i]] !== undefined) return values[ORDER[i]];
  }
  // Fallback: scan upward if nothing below was defined
  for (let i = idx + 1; i < ORDER.length; i++) {
    if (values[ORDER[i]] !== undefined) return values[ORDER[i]];
  }
  return undefined;
}
