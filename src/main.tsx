import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./app/App";
import "./app/styles/pilot-shell.css";
import "./app/styles/auth-legacy.css";

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
