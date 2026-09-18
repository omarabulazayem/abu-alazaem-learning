import React,{useEffect,useState} from "react";
import LoginPage from "./LoginPage.jsx";
import HomePage from "./HomePage.jsx";
import FamilyPage from "./FamilyPage.jsx";
import LeaderboardPage from "./LeaderboardPage.jsx";
import ReviewPage from "./ReviewPage.jsx";
import ChallengesPage from "./ChallengesPage.jsx";
import RoomPage from "./RoomPage.jsx";
import AchievementsPage from "./AchievementsPage.jsx";
import ChildHub,{isChildModeActive} from "./ChildHub.jsx";
import GamesHub from "./GamesHub.jsx";
import NewGamePackHub from "./NewGamePackHub.jsx";
import TafsirWorldHubV4 from "./TafsirWorldHubV4.jsx";
import MemoryGame from "./MemoryGame.jsx";
import SurahOrderGame from "./SurahOrderGame.jsx";
import SurahQuizGame from "./SurahQuizGame.jsx";
import {QuranWheelGame,AyahOrderGame,CompleteAyahGame,QuickMemoryGame} from "./QuranGameSystem.jsx";
import {WordTrainGame,AyahBurgerGame,KnowledgeBridgeGame,FlipCardsGame} from "./QuranGameBatch2.jsx";
import {GuessSurahGame,WordHunterGame,AyahMatchingGame,SurahCardsGame} from "./QuranGameBatch3.jsx";
import {AyahCodeGame,SurahExamGame} from "./QuranGameBatch4.jsx";
import {NEW_GAME_ROUTES} from "./NewQuranGamePack.jsx";
import {TAFSIR_GAME_ROUTES} from "./TafsirWorld.jsx";
import {gameByRoute} from "./gameRegistry.js";
import NotFoundPage from "./NotFoundPage.jsx";
import QuranPage from "./QuranPage.jsx";
import MemorizePage from "./MemorizePage.jsx";
import TeacherPortal from "./TeacherPortal.jsx";
import TeacherGameReports from "./TeacherGameReports.jsx";
import TeacherAccessBar from "./TeacherAccessBar.jsx";
import TeacherLearningPreview from "./TeacherLearningPreview.jsx";
import TeacherQuranPreview from "./TeacherQuranPreview.jsx";
import {getCurrentUser} from "./api.js";
import {isTeacherRestrictedRoute} from "./accessPolicy.js";

const childSafeRoutes=new Set(["/child","/quran","/memorize","/review","/games","/achievements","/challenges","/room","/leaderboard"]);
const teacherPreviewPages=new Set(["/quran","/memorize","/review","/achievements","/challenges"]);
function readPath(){return typeof window.__ABU_ROUTE_PATH__==="function"?window.__ABU_ROUTE_PATH__():window.location.pathname;}
function navigate(path,replace=false){if(readPath()===path)return;if(replace)history.replaceState({},"",path);else history.pushState({},"",path);window.dispatchEvent(new PopStateEvent("popstate"));}
function isChildSafeRoute(path){return childSafeRoutes.has(path)||path.startsWith("/games/");}
function usePath(){const [path,setPath]=useState(readPath);useEffect(()=>{const sync=()=>setPath(readPath());window.addEventListener("popstate",sync);return()=>window.removeEventListener("popstate",sync);},[]);return path;}
function useChildMode(){const [active,setActive]=useState(()=>isChildModeActive());useEffect(()=>{const sync=()=>setActive(isChildModeActive());window.addEventListener("abu-child-mode",sync);window.addEventListener("storage",sync);return()=>{window.removeEventListener("abu-child-mode",sync);window.removeEventListener("storage",sync);};},[]);return active;}
function useAccountType(){const [role,setRole]=useState(undefined);useEffect(()=>{let alive=true;const sync=async()=>{try{const user=await getCurrentUser();if(alive)setRole(user?.accountType||null);}catch{if(alive)setRole(null);}};sync();window.addEventListener("abu-auth",sync);return()=>{alive=false;window.removeEventListener("abu-auth",sync);};},[]);return role;}

export default function RootRouter(){
  const path=usePath(),childMode=useChildMode(),accountType=useAccountType(),teacher=accountType==="teacher",teacherRestricted=teacher&&isTeacherRestrictedRoute(path);
  useEffect(()=>{if(teacherRestricted)navigate("/teacher",true);},[teacherRestricted]);
  if(path==="/teacher/game-reports")return <TeacherGameReports/>;
  const isTeacherRoute=path==="/teacher"||path.startsWith("/teacher/");
  if(isTeacherRoute||teacherRestricted)return <TeacherPortal/>;
  if(!teacher&&path==="/child")return <ChildHub/>;
  if(!teacher&&childMode&&!isChildSafeRoute(path))return <ChildHub/>;
  const TafsirGame=TAFSIR_GAME_ROUTES[path],NewGame=NEW_GAME_ROUTES[path];let page;
  if(TafsirGame)page=<TafsirGame/>;
  else if(NewGame){const definition=gameByRoute(path);page=definition?.status==="live"?<NewGame/>:<NotFoundPage/>;}
  else if(path==="/")page=<HomePage/>;
  else if(path==="/family")page=<FamilyPage/>;
  else if(path==="/leaderboard")page=<LeaderboardPage/>;
  else if(path==="/quran")page=teacher?<TeacherQuranPreview/>:<QuranPage/>;
  else if(path==="/memorize")page=teacher?<TeacherLearningPreview type="memorize"/>:<MemorizePage/>;
  else if(path==="/review")page=teacher?<TeacherLearningPreview type="review"/>:<ReviewPage/>;
  else if(path==="/games")page=<GamesHub/>;
  else if(path==="/games/new-pack")page=<NewGamePackHub/>;
  else if(path==="/games/tafsir")page=<TafsirWorldHubV4/>;
  else if(path==="/games/quran-wheel")page=<QuranWheelGame/>;
  else if(path==="/games/ayah-order")page=<AyahOrderGame/>;
  else if(path==="/games/complete-ayah")page=<CompleteAyahGame/>;
  else if(path==="/games/quick-memory")page=<QuickMemoryGame/>;
  else if(path==="/games/train")page=<WordTrainGame/>;
  else if(path==="/games/burger")page=<AyahBurgerGame/>;
  else if(path==="/games/bridge")page=<KnowledgeBridgeGame/>;
  else if(path==="/games/flip-cards")page=<FlipCardsGame/>;
  else if(path==="/games/guess-surah")page=<GuessSurahGame/>;
  else if(path==="/games/word-hunter")page=<WordHunterGame/>;
  else if(path==="/games/ayah-matching")page=<AyahMatchingGame/>;
  else if(path==="/games/surah-cards")page=<SurahCardsGame/>;
  else if(path==="/games/code")page=<AyahCodeGame/>;
  else if(path==="/games/surah-exam")page=<SurahExamGame/>;
  else if(path==="/games/memory")page=<MemoryGame/>;
  else if(path==="/games/order")page=<SurahOrderGame/>;
  else if(path==="/games/quiz")page=<SurahQuizGame/>;
  else if(path==="/achievements")page=teacher?<TeacherLearningPreview type="achievements"/>:<AchievementsPage/>;
  else if(path==="/challenges")page=teacher?<TeacherLearningPreview type="challenges"/>:<ChallengesPage/>;
  else if(path==="/room")page=<RoomPage/>;
  else if(path==="/login")page=<LoginPage/>;
  else page=<NotFoundPage/>;
  if(teacher&&teacherPreviewPages.has(path))return <TeacherAccessBar>{page}</TeacherAccessBar>;
  if(teacher&&path.startsWith("/games/")&&path!=="/games")return <TeacherAccessBar>{page}</TeacherAccessBar>;
  return page;
}
