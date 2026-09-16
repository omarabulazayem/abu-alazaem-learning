import "./pages/LearningExtensions.css";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Teacher from "./pages/Teacher";
import Family from "./pages/Family";
import Quran from "./pages/Quran";
import Memorize from "./pages/Memorize";
import Review from "./pages/Review";
import Games from "./pages/Games";
import Room from "./pages/Room";
import Achievements from "./pages/Achievements";
import Challenges from "./pages/Challenges";
import ChildMode from "./pages/ChildMode";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/teacher" component={Teacher} />
      <Route path="/family" component={Family} />
      <Route path="/child" component={ChildMode} />
      <Route path="/" component={Home} />
      <Route path="/quran" component={Quran} />
      <Route path="/memorize" component={Memorize} />
      <Route path="/review" component={Review} />
      <Route path="/games" component={Games} />
      <Route path="/achievements" component={Achievements} />
      <Route path="/room" component={Room} />
      <Route path="/board" component={Home} />
      <Route path="/challenges" component={Challenges} />
      <Route path="/leaderboard" component={Home} />
      <Route path="/about" component={Home} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster position="top-center" richColors />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
