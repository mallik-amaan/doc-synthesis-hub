import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Bypass ngrok's browser-warning interstitial for all API calls to ngrok tunnels.
// Without this header, ngrok returns its own HTML page (status 200, no CORS headers),
// which the browser treats as a CORS failure.
const _originalFetch = window.fetch.bind(window);
window.fetch = (input, init = {}) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
  if (url.includes('ngrok-free.app') || url.includes('ngrok.io')) {
    const headers = new Headers((init as RequestInit).headers);
    headers.set('ngrok-skip-browser-warning', 'true');
    return _originalFetch(input, { ...(init as RequestInit), headers });
  }
  return _originalFetch(input, init);
};

createRoot(document.getElementById("root")!).render(<App />);
