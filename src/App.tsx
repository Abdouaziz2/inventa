import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
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
import CompanySettingsPage from "@/pages/CompanySettingsPage";
import NotFound from "@/pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

const ProtectedRoutes = () => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // Force password change
  if (user?.mustChangePassword) return <ChangePasswordPage />;

  return <AppLayout />;
};

const AppRoutes = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route element={<ProtectedRoutes />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/clients/:id" element={<ClientDetailPage />} />
        <Route path="/jewelry" element={<JewelryPage />} />
        <Route path="/jewelry/add" element={<AddJewelryPage />} />
        <Route path="/deposits" element={<DepositsPage />} />
        <Route path="/reservations" element={<ReservationsPage />} />
        <Route path="/sales" element={<SalesPage />} />
        <Route path="/receipts" element={<ReceiptsPage />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/admin/settings" element={<CompanySettingsPage />} />
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
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
