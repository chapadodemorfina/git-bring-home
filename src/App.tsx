import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";

import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import UsersPage from "./pages/UsersPage";
import RolesPage from "./pages/RolesPage";
import SettingsPage from "./pages/SettingsPage";
import AuditLogsPage from "./pages/AuditLogsPage";
import NotFound from "./pages/NotFound";

// CRM Module
import CustomersListPage from "./modules/customers/pages/CustomersListPage";
import CustomerCreatePage from "./modules/customers/pages/CustomerCreatePage";
import CustomerEditPage from "./modules/customers/pages/CustomerEditPage";
import CustomerDetailPage from "./modules/customers/pages/CustomerDetailPage";

// Devices Module
import DevicesListPage from "./modules/devices/pages/DevicesListPage";
import DeviceCreatePage from "./modules/devices/pages/DeviceCreatePage";
import DeviceEditPage from "./modules/devices/pages/DeviceEditPage";
import DeviceDetailPage from "./modules/devices/pages/DeviceDetailPage";

const queryClient = new QueryClient();

const ProtectedPage = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <AppLayout>{children}</AppLayout>
  </ProtectedRoute>
);

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              <Route path="/dashboard" element={<ProtectedPage><Dashboard /></ProtectedPage>} />
              <Route path="/users" element={<ProtectedPage><UsersPage /></ProtectedPage>} />
              <Route path="/roles" element={<ProtectedPage><RolesPage /></ProtectedPage>} />
              <Route path="/settings" element={<ProtectedPage><SettingsPage /></ProtectedPage>} />
              <Route path="/audit-logs" element={<ProtectedPage><AuditLogsPage /></ProtectedPage>} />

              {/* CRM */}
              <Route path="/customers" element={<ProtectedPage><CustomersListPage /></ProtectedPage>} />
              <Route path="/customers/new" element={<ProtectedPage><CustomerCreatePage /></ProtectedPage>} />
              <Route path="/customers/:id" element={<ProtectedPage><CustomerDetailPage /></ProtectedPage>} />
              <Route path="/customers/:id/edit" element={<ProtectedPage><CustomerEditPage /></ProtectedPage>} />

              {/* Devices */}
              <Route path="/devices" element={<ProtectedPage><DevicesListPage /></ProtectedPage>} />
              <Route path="/devices/new" element={<ProtectedPage><DeviceCreatePage /></ProtectedPage>} />
              <Route path="/devices/:id" element={<ProtectedPage><DeviceDetailPage /></ProtectedPage>} />
              <Route path="/devices/:id/edit" element={<ProtectedPage><DeviceEditPage /></ProtectedPage>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
