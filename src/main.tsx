import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import OAuthConsent from "./OAuthConsent";
import "./styles.css";

const isOAuthConsent =
  window.location.pathname.replace(/\/+$/, "") === "/oauth/consent";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {isOAuthConsent ? <OAuthConsent /> : <App />}
  </React.StrictMode>
);
