import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import AppErrorBoundary from "@/components/AppErrorBoundary";
import AppSpinner from "@/components/AppSpinner";
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import Dashboard from "@/pages/Dashboard";
import ClientsPage from "@/pages/ClientsPage";
import ClientDetailPage from "@/pages/ClientDetailPage";
import JewelryPage from "@/pages/JewelryPage";
import AddJewelryPage from "@/pages/AddJewelryPage";
import DepositsPage from "@/pages/DepositsPage";
import ReservationsPage from "@/pages/ReservationsPage";
import SalesPage from "@/pages/SalesPage";
import ReceiptsPage from "@/pages/ReceiptsPage";
import ProfileSettingsPage from "@/pages/CompanySettingsPage";
import NotFound from "@/pages/NotFound";
import SubscriptionRequiredPage from "@/pages/SubscriptionRequiredPage";
import SubscriptionsPage from "@/pages/SubscriptionsPage";

const queryClient = new QueryClient();
// Use BrowserRouter for standard SPA routing. HashRouter can be enabled via VITE_USE_HASH_ROUTER env var if needed for file:// protocol support
const useHashRouter = import.meta.env.VITE_USE_HASH_ROUTER === 'true';
const AppRouter = useHashRouter ? HashRouter : BrowserRouter;

const appRoutes = [
  { path: "/dashboard", element: <Dashboard /> },
  { path: "/clients", element: <ClientsPage /> },
  { path: "/clients/:id", element: <ClientDetailPage /> },
  { path: "/jewelry", element: <JewelryPage /> },
  { path: "/jewelry/add", element: <AddJewelryPage /> },
  { path: "/deposits", element: <DepositsPage /> },
  { path: "/reservations", element: <ReservationsPage /> },
  { path: "/sales", element: <SalesPage /> },
  { path: "/receipts", element: <ReceiptsPage /> },
  { path: "/profile", element: <ProfileSettingsPage /> },
  { path: "/subscriptions", element: <SubscriptionsPage /> },
  { path: "/admin/settings", element: <Navigate to="/profile" replace /> },
] as const;

const ProtectedRoutes = () => {
  const { isAuthenticated, hasAccess, loading } = useAuth();

  if (loading) return <AppSpinner fullScreen />;

  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (!hasAccess) return <SubscriptionRequiredPage />;

  return <AppLayout />;
};

const AppRoutes = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <AppSpinner fullScreen />;

  return (
    <Routes>
      <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route element={<ProtectedRoutes />}>
        {appRoutes.map((route) => (
          <Route key={route.path} path={route.path} element={route.element} />
        ))}
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <AppRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <AppErrorBoundary>
            <AppRoutes />
          </AppErrorBoundary>
        </AuthProvider>
      </AppRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
