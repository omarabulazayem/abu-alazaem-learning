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

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/teacher" component={Teacher} />
      <Route path="/family" component={Family} />
      <Route path="/" component={Home} />
      <Route path="/quran" component={Home} />
      <Route path="/memorize" component={Home} />
      <Route path="/review" component={Home} />
      <Route path="/games" component={Home} />
      <Route path="/achievements" component={Home} />
      <Route path="/room" component={Home} />
      <Route path="/board" component={Home} />
      <Route path="/challenges" component={Home} />
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
