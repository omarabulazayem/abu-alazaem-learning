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
import TeacherPortal from "./TeacherPortal.jsx";
import { getCurrentUser } from "./api.js";

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

function readPath() {
  return typeof window.__ABU_ROUTE_PATH__ === "function" ? window.__ABU_ROUTE_PATH__() : window.location.pathname;
}

function navigate(path, replace = false) {
  if (readPath() === path) return;
  if (replace) history.replaceState({}, "", path); else history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function isChildSafeRoute(path) {
  return childSafeRoutes.has(path) || path.startsWith("/games/");
}

function usePath() {
  const [path, setPath] = useState(readPath);
  useEffect(() => {
    const sync = () => setPath(readPath());
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

function useAccountType() {
  const [role, setRole] = useState(undefined);
  useEffect(() => {
    let alive = true;
    const sync = async () => {
      try {
        const user = await getCurrentUser();
        if (alive) setRole(user?.accountType || null);
      } catch {
        if (alive) setRole(null);
      }
    };
    sync();
    window.addEventListener("abu-auth", sync);
    return () => { alive = false; window.removeEventListener("abu-auth", sync); };
  }, []);
  return role;
}

export default function RootRouter() {
  const path = usePath();
  const childMode = useChildMode();
  const accountType = useAccountType();

  const isTeacherRoute = path === "/teacher" || path.startsWith("/teacher/");
  const teacherAllowed = path === "/" || path === "/login" || isTeacherRoute;

  useEffect(() => {
    if (accountType === "teacher" && !teacherAllowed) navigate("/teacher", true);
  }, [accountType, path, teacherAllowed]);

  if (isTeacherRoute) return <TeacherPortal />;
  if (accountType === "teacher" && !teacherAllowed) return <TeacherPortal />;

  if (path === "/child") return <ChildHub />;
  if (accountType !== "teacher" && childMode && !isChildSafeRoute(path)) return <ChildHub />;

  if (path === "/quran") return <QuranPage />;
  if (path === "/memorize") return <MemorizePage />;
  if (path === "/games") return <GamesHub />;
  if (path === "/games/memory") return <MemoryGame />;
  if (path === "/games/order") return <SurahOrderGame />;
  if (path === "/games/quiz") return <SurahQuizGame />;
  if (path === "/achievements") return <AchievementsPage />;

  return <App />;
}
