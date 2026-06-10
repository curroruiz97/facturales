import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./app/App";
import "./app/styles/pilot-shell.css";
import "./app/styles/auth-legacy.css";

if (Capacitor.isNativePlatform()) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const savedTheme = localStorage.getItem("theme");
  const isDark = savedTheme === "dark" || (!savedTheme && prefersDark);

  StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light }).catch(() => {});
  StatusBar.setBackgroundColor({ color: isDark ? "#1d1e24" : "#ffffff" }).catch(() => {});
  StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
}

const rootElement = document.getElementById("react-root");
if (!rootElement) {
  throw new Error("No se encontro #react-root para montar la aplicacion React.");
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
