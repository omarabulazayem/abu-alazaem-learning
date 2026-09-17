import React from "react";
import { createRoot } from "react-dom/client";
import RootRouter from "./RootRouter.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RootRouter />
  </React.StrictMode>,
);
