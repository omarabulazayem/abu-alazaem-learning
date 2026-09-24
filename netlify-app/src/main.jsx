import React from "react";
import { createRoot } from "react-dom/client";
import RootRouter from "./RootRouter.jsx";
import SiteCredits from "./SiteCredits.jsx";

/* Game-mechanics CSS only. These files style playable internals, not the site shell. */
import "./styles.css";
import "./ui-enhancements.css";
import "./memory-game.css";
import "./quran-games.css";
import "./game-intelligence.css";
import "./quran-game-batch2.css";
import "./quran-game-batch3.css";
import "./quran-game-batch4.css";
import "./new-quran-game-pack.css";
import "./adaptive-games.css";
import "./tafsir-world.css";
import "./whiteboard.css";

/* Clean-sheet interface. UI v4 owns structure; brand identity owns color and tone. */
import "./ui-v4-support.css";
import "./ui-v4-preview.css";
import "./ui-v4.css";
import "./brand-identity.css";

const configuredBase=(import.meta.env.BASE_URL||"/").replace(/\/$/,"");
const basePath=configuredBase==="/"?"":configuredBase;
window.__ABU_ASSET_BASE__=import.meta.env.BASE_URL||"/";
window.__ABU_ROUTE_PATH__=()=>{
  const pathname=window.location.pathname||"/";
  if(!basePath)return pathname;
  if(pathname===basePath||pathname===`${basePath}/`)return "/";
  if(pathname.startsWith(`${basePath}/`))return pathname.slice(basePath.length)||"/";
  return pathname;
};
const withBase=url=>{
  if(!basePath||typeof url!=="string"||!url.startsWith("/")||url===basePath||url.startsWith(`${basePath}/`))return url;
  return `${basePath}${url}`;
};
const nativePushState=window.history.pushState.bind(window.history),nativeReplaceState=window.history.replaceState.bind(window.history);
window.history.pushState=(state,unused,url)=>nativePushState(state,unused,withBase(url));
window.history.replaceState=(state,unused,url)=>nativeReplaceState(state,unused,withBase(url));

createRoot(document.getElementById("root")).render(
  <React.StrictMode><RootRouter/><SiteCredits/></React.StrictMode>
);
