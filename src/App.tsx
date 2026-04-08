import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import AppErrorBoundary from "@/components/AppErrorBoundary";
import AppSpinner from "@/components/AppSpinner";
import LoginPage from "@/pages/LoginPage";
import ChangePasswordPage from "@/pages/ChangePasswordPage";
import Dashboard from "@/pages/Dashboard";
import ClientsPage from "@/pages/ClientsPage";
import ClientDetailPage from "@/pages/ClientDetailPage";
import JewelryPage from "@/pages/JewelryPage";
import AddJewelryPage from "@/pages/AddJewelryPage";
import DepositsPage from "@/pages/DepositsPage";
import ReservationsPage from "@/pages/ReservationsPage";
import SalesPage from "@/pages/SalesPage";
import ReceiptsPage from "@/pages/ReceiptsPage";
import AdminUsersPage from "@/pages/AdminUsersPage";
import ProfileSettingsPage from "@/pages/CompanySettingsPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const appRoutes = [
  { path: "/", element: <Dashboard /> },
  { path: "/clients", element: <ClientsPage /> },
  { path: "/clients/:id", element: <ClientDetailPage /> },
  { path: "/jewelry", element: <JewelryPage /> },
  { path: "/jewelry/add", element: <AddJewelryPage /> },
  { path: "/deposits", element: <DepositsPage /> },
  { path: "/reservations", element: <ReservationsPage /> },
  { path: "/sales", element: <SalesPage /> },
  { path: "/receipts", element: <ReceiptsPage /> },
  { path: "/profile", element: <ProfileSettingsPage /> },
  { path: "/admin/users", element: <AdminUsersPage /> },
  { path: "/admin/settings", element: <Navigate to="/profile" replace /> },
] as const;

const ProtectedRoutes = () => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) return <AppSpinner fullScreen />;

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // Force password change
  if (user?.mustChangePassword) return <ChangePasswordPage />;

  return <AppLayout />;
};

const AppRoutes = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <AppSpinner fullScreen />;

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
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
      <BrowserRouter>
        <AuthProvider>
          <AppErrorBoundary>
            <AppRoutes />
          </AppErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
