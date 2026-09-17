import React, { useEffect, useState } from "react";
import App from "./App.jsx";
import AchievementsPage from "./AchievementsPage.jsx";
import ChildHub, { isChildModeActive } from "./ChildHub.jsx";
import GamesHub from "./GamesHub.jsx";
import MemoryGame from "./MemoryGame.jsx";
import SurahOrderGame from "./SurahOrderGame.jsx";
import SurahQuizGame from "./SurahQuizGame.jsx";
import QuranPage from "./QuranPage.jsx";
import MemorizePage from "./MemorizePage.jsx";

const childSafeRoutes = new Set([
  "/child",
  "/quran",
  "/memorize",
  "/review",
  "/games",
  "/achievements",
  "/challenges",
  "/room",
]);

function isChildSafeRoute(path) {
  return childSafeRoutes.has(path) || path.startsWith("/games/");
}

function usePath() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const sync = () => setPath(window.location.pathname);
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  return path;
}

function useChildMode() {
  const [active, setActive] = useState(() => isChildModeActive());
  useEffect(() => {
    const sync = () => setActive(isChildModeActive());
    window.addEventListener("abu-child-mode", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("abu-child-mode", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return active;
}

export default function RootRouter() {
  const path = usePath();
  const childMode = useChildMode();

  if (path === "/child") return <ChildHub />;
  if (childMode && !isChildSafeRoute(path)) return <ChildHub />;

  if (path === "/quran") return <QuranPage />;
  if (path === "/memorize") return <MemorizePage />;
  if (path === "/games") return <GamesHub />;
  if (path === "/games/memory") return <MemoryGame />;
  if (path === "/games/order") return <SurahOrderGame />;
  if (path === "/games/quiz") return <SurahQuizGame />;
  if (path === "/achievements") return <AchievementsPage />;

  return <App />;
}
