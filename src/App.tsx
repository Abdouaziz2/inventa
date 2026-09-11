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
import OrdersPage from "@/pages/OrdersPage";
import OperationsPage from "@/pages/OperationsPage";
import ReceiptsPage from "@/pages/ReceiptsPage";
import ProfileSettingsPage from "@/pages/CompanySettingsPage";
import NotFound from "@/pages/NotFound";
import SubscriptionRequiredPage from "@/pages/SubscriptionRequiredPage";
import SubscriptionsPage from "@/pages/SubscriptionsPage";
import UsersPage from "@/pages/UsersPage";
import VerifyReceiptPage from "@/pages/VerifyReceiptPage";
import SuperAdminLayout from "@/components/SuperAdminLayout";
import AuditLogsPage from "@/pages/AuditLogsPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import PaymentSuccessPage from "@/pages/PaymentSuccessPage";
import PaymentErrorPage from "@/pages/PaymentErrorPage";
import { DemoDashboard, DemoModulePage } from "@/pages/DemoDashboard";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});
const AppRouter = window.location.protocol === "file:" ? HashRouter : BrowserRouter;

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAuth();

  if (loading) return <AppSpinner fullScreen />;
  return isAdmin ? children : <Navigate to="/dashboard" replace />;
}

function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { isSuperAdmin, loading } = useAuth();

  if (loading) return <AppSpinner fullScreen />;
  return isSuperAdmin ? children : <Navigate to="/dashboard" replace />;
}

function HomeRedirect() {
  const { isSuperAdmin } = useAuth();
  return <Navigate to={isSuperAdmin ? "/admin/users" : "/dashboard"} replace />;
}

function DemoAware({ children, dashboard = false }: { children: React.ReactNode; dashboard?: boolean }) {
  const { user } = useAuth();
  if (!user?.isDemo) return children;
  return dashboard ? <DemoDashboard /> : <DemoModulePage />;
}

const appRoutes = [
  { path: "/dashboard", element: <DemoAware dashboard><Dashboard /></DemoAware> },
  { path: "/clients", element: <DemoAware><ClientsPage /></DemoAware> },
  { path: "/clients/:id", element: <DemoAware><ClientDetailPage /></DemoAware> },
  { path: "/products", element: <JewelryPage /> },
  { path: "/products/add", element: <AdminRoute><AddJewelryPage /></AdminRoute> },
  { path: "/jewelry", element: <Navigate to="/products" replace /> },
  { path: "/jewelry/add", element: <Navigate to="/products/add" replace /> },
  { path: "/deposits", element: <DemoAware><DepositsPage /></DemoAware> },
  { path: "/operations", element: <Navigate to="/operations/sale" replace /> },
  { path: "/operations/:type", element: <DemoAware><OperationsPage /></DemoAware> },
  { path: "/reservations", element: <Navigate to="/operations/reservation" replace /> },
  { path: "/orders", element: <DemoAware><OrdersPage /></DemoAware> },
  { path: "/sales", element: <Navigate to="/operations/sale" replace /> },
  { path: "/receipts", element: <DemoAware><ReceiptsPage /></DemoAware> },
  { path: "/profile", element: <AdminRoute><DemoAware><ProfileSettingsPage /></DemoAware></AdminRoute> },
  { path: "/subscriptions", element: <AdminRoute><DemoAware><SubscriptionsPage /></DemoAware></AdminRoute> },
  { path: "/audit", element: <AdminRoute><DemoAware><AuditLogsPage /></DemoAware></AdminRoute> },
  { path: "/users", element: <Navigate to="/admin/users" replace /> },
  { path: "/admin/settings", element: <Navigate to="/profile" replace /> },
] as const;

const ProtectedRoutes = () => {
  const { isAuthenticated, hasAccess, isSuperAdmin, loading } = useAuth();

  if (loading) return <AppSpinner fullScreen />;

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (isSuperAdmin) return <Navigate to="/admin/users" replace />;
  if (!hasAccess) return <SubscriptionRequiredPage />;

  return <AppLayout />;
};

const SuperAdminRoutes = () => {
  const { isAuthenticated, isSuperAdmin, loading } = useAuth();

  if (loading) return <AppSpinner fullScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isSuperAdmin) return <Navigate to="/dashboard" replace />;

  return <SuperAdminLayout />;
};

const AppRoutes = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <AppSpinner fullScreen />;

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/verify" element={<VerifyReceiptPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/payment/success" element={<PaymentSuccessPage />} />
      <Route path="/payment/error" element={<PaymentErrorPage />} />
      <Route path="/login" element={isAuthenticated ? <HomeRedirect /> : <LoginPage />} />
      <Route path="/admin" element={<SuperAdminRoutes />}>
        <Route index element={<Navigate to="/admin/users" replace />} />
        <Route path="users" element={<SuperAdminRoute><UsersPage /></SuperAdminRoute>} />
        <Route path="subscriptions" element={<SuperAdminRoute><SubscriptionsPage /></SuperAdminRoute>} />
        <Route path="audit" element={<SuperAdminRoute><AuditLogsPage /></SuperAdminRoute>} />
      </Route>
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
