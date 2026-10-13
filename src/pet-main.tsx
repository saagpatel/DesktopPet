import React from "react";
import ReactDOM from "react-dom/client";
import { PetOverlay } from "./components/pet/PetOverlay";
import { ErrorBoundary } from "./components/shared/ErrorBoundary";
import "./pet.css";
import "./components/pet/animations.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <PetOverlay />
    </ErrorBoundary>
  </React.StrictMode>,
);
