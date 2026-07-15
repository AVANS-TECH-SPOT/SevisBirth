import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toast/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { AuthProvider } from '@/hooks/use-auth';
import { AuthGuard, MobileAuthGuard } from '@/components/auth-guard';

// Pages
import LoginPage from '@/pages/login';
import ChwHome from '@/pages/chw-home';
import ChwRegistration from '@/pages/chw-registration';
import ChwQueue from '@/pages/chw-queue';
import FacilityDashboard from '@/pages/facility-dashboard';
import RegistryQueue from '@/pages/registry-queue';
import ApprovalDashboard from '@/pages/approval-dashboard';

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={LoginPage} />
      
      {/* CHW Mobile App Routes */}
      <Route path="/chw">
        <MobileAuthGuard><ChwHome /></MobileAuthGuard>
      </Route>
      <Route path="/chw/register">
        <MobileAuthGuard><ChwRegistration /></MobileAuthGuard>
      </Route>
      <Route path="/chw/queue">
        <MobileAuthGuard><ChwQueue /></MobileAuthGuard>
      </Route>

      {/* Desktop Dashboard Routes */}
      <Route path="/facility">
        <AuthGuard><FacilityDashboard /></AuthGuard>
      </Route>
      <Route path="/registry">
        <AuthGuard><RegistryQueue /></AuthGuard>
      </Route>
      <Route path="/approval">
        <AuthGuard><ApprovalDashboard /></AuthGuard>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <AuthProvider>
          <TooltipProvider>
            <Router />
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
