import React, { useEffect, useState } from "react";
import App from "./App.jsx";
import HomePage from "./HomePage.jsx";
import AchievementsPage from "./AchievementsPage.jsx";
import ChildHub, { isChildModeActive } from "./ChildHub.jsx";
import GamesHub from "./GamesHub.jsx";
import MemoryGame from "./MemoryGame.jsx";
import SurahOrderGame from "./SurahOrderGame.jsx";
import SurahQuizGame from "./SurahQuizGame.jsx";
import QuranPage from "./QuranPage.jsx";
import MemorizePage from "./MemorizePage.jsx";
import TeacherPortal from "./TeacherPortal.jsx";
import TeacherAccessBar from "./TeacherAccessBar.jsx";
import TeacherLearningPreview from "./TeacherLearningPreview.jsx";
import TeacherQuranPreview from "./TeacherQuranPreview.jsx";
import { getCurrentUser } from "./api.js";
import { isTeacherRestrictedRoute } from "./accessPolicy.js";

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
  const teacher = accountType === "teacher";
  const isTeacherRoute = path === "/teacher" || path.startsWith("/teacher/");
  const teacherRestricted = teacher && isTeacherRestrictedRoute(path);

  useEffect(() => {
    if (teacherRestricted) navigate("/teacher", true);
  }, [teacherRestricted]);

  if (isTeacherRoute || teacherRestricted) {
    const portal = <TeacherPortal />;
    return teacher ? <TeacherAccessBar>{portal}</TeacherAccessBar> : portal;
  }

  if (!teacher && path === "/child") return <ChildHub />;
  if (!teacher && childMode && !isChildSafeRoute(path)) return <ChildHub />;

  let page;
  if (path === "/") page = <HomePage />;
  else if (path === "/quran") page = teacher ? <TeacherQuranPreview /> : <QuranPage />;
  else if (path === "/memorize") page = teacher ? <TeacherLearningPreview type="memorize" /> : <MemorizePage />;
  else if (path === "/review") page = teacher ? <TeacherLearningPreview type="review" /> : <App />;
  else if (path === "/games") page = <GamesHub />;
  else if (path === "/games/memory") page = <MemoryGame />;
  else if (path === "/games/order") page = <SurahOrderGame />;
  else if (path === "/games/quiz") page = <SurahQuizGame />;
  else if (path === "/achievements") page = teacher ? <TeacherLearningPreview type="achievements" /> : <AchievementsPage />;
  else if (path === "/challenges") page = teacher ? <TeacherLearningPreview type="challenges" /> : <App />;
  else page = <App />;

  return teacher ? <TeacherAccessBar>{page}</TeacherAccessBar> : page;
}
