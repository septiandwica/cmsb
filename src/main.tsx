import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { PWAInstaller } from "@/components/PWA/PWAInstaller";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PWAInstaller />
    <App />
  </React.StrictMode>
);
