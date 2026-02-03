import React from "react";
import ReactDOM from "react-dom/client";
import "./styles/brandkit.css";
import "./styles/global.css";
import App from "./App";
import { SemanticRegistryProvider } from "./semantic/SemanticRegistryContext";
import { operationRegistry } from "./semantic/operationRegistry";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <SemanticRegistryProvider registry={operationRegistry}>
      <App />
    </SemanticRegistryProvider>
  </React.StrictMode>
);
