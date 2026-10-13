import React from "react";
import ReactDOM from "react-dom/client";
import { ControlPanel } from "./components/panel/ControlPanel";
import { ErrorBoundary } from "./components/shared/ErrorBoundary";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ControlPanel />
    </ErrorBoundary>
  </React.StrictMode>,
);
