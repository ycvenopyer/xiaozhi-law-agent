import { BrowserRouter, Route } from 'react-router-dom';
import { AnimatedRoutes } from "@/components/AnimatedRoutes";
import { PageTransition } from "@/components/PageTransition";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { CloudAccountGate } from '@/components/assistant/CloudAccount';

function App() {
  return (
    <BrowserRouter>
      <AnimatedRoutes>
        <Route path="/" element={<PageTransition transition="slide-up"><CloudAccountGate><Index /></CloudAccountGate></PageTransition>} />
        <Route path="*" element={<PageTransition transition="fade"><NotFound /></PageTransition>} />
      </AnimatedRoutes>
    </BrowserRouter>
  );
}

export default App
