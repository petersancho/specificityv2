import React from "react";
import ReactDOM from "react-dom/client";
import "./styles/brandkit.css";
import "./styles/semantic.css";
import "./styles/global.css";
import App from "./App";
import { SemanticRegistryProvider } from "./semantic/SemanticRegistryContext";
import { operationRegistry } from "./semantic/operationRegistry";
import { applyNumericaTheme } from "./theme/apply";

applyNumericaTheme();

const runtimeMode = (import.meta as { env?: { MODE?: string } }).env?.MODE ?? "development";

if (runtimeMode !== "production") {
  import("./theme/lint").then(({ lintUI }) => {
    requestAnimationFrame(() => lintUI());
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <SemanticRegistryProvider registry={operationRegistry}>
      <App />
    </SemanticRegistryProvider>
  </React.StrictMode>
);
