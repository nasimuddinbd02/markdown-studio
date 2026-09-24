import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { startApp } from "./features/lifecycle";
import "./styles/app.css";
import "./styles/markdown.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

void startApp();
