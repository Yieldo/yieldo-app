// Headless component — wraps `useTrackingParams` so the attribution capture
// fires once on app boot, parallel to TxTracker/RefTracker. See the hook
// for the full flow and rationale.
import { useTrackingParams } from "../hooks/useTrackingParams.js";

export default function ClickTracker() {
  useTrackingParams();
  return null;
}
