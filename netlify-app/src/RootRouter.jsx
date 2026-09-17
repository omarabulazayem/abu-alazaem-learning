import React, { useEffect, useState } from "react";
import App from "./App.jsx";
import MemoryGame from "./MemoryGame.jsx";

function usePath() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const sync = () => setPath(window.location.pathname);
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  return path;
}

export default function RootRouter() {
  const path = usePath();
  if (path === "/games") return <MemoryGame />;
  return <App />;
}
