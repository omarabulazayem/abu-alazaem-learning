import React from "react";
import { createRoot } from "react-dom/client";
import RootRouter from "./RootRouter.jsx";
import "./styles.css";
import "./ui-enhancements.css";
import "./memory-game.css";
import "./child-dashboard.css";
import "./teacher.css";
import "./teacher-access.css";

const configuredBase = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
const basePath = configuredBase === "/" ? "" : configuredBase;

window.__ABU_ROUTE_PATH__ = () => {
  const pathname = window.location.pathname || "/";
  if (!basePath) return pathname;
  if (pathname === basePath || pathname === `${basePath}/`) return "/";
  if (pathname.startsWith(`${basePath}/`)) return pathname.slice(basePath.length) || "/";
  return pathname;
};

const withBase = url => {
  if (!basePath || typeof url !== "string" || !url.startsWith("/") || url === basePath || url.startsWith(`${basePath}/`)) return url;
  return `${basePath}${url}`;
};

const nativePushState = window.history.pushState.bind(window.history);
const nativeReplaceState = window.history.replaceState.bind(window.history);
window.history.pushState = (state, unused, url) => nativePushState(state, unused, withBase(url));
window.history.replaceState = (state, unused, url) => nativeReplaceState(state, unused, withBase(url));

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RootRouter />
  </React.StrictMode>,
);
