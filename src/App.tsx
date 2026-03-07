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
import WorkQueuesPage from "./pages/WorkQueuesPage";
import NotificationsPage from "./modules/notifications/pages/NotificationsPage";
import WhatsAppPage from "./modules/whatsapp/pages/WhatsAppPage";
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

// Service Orders Module
import ServiceOrdersListPage from "./modules/service-orders/pages/ServiceOrdersListPage";
import ServiceOrderCreatePage from "./modules/service-orders/pages/ServiceOrderCreatePage";
import ServiceOrderEditPage from "./modules/service-orders/pages/ServiceOrderEditPage";
import ServiceOrderDetailPage from "./modules/service-orders/pages/ServiceOrderDetailPage";

// Inventory Module
import ProductsListPage from "./modules/inventory/pages/ProductsListPage";
import ProductCreatePage from "./modules/inventory/pages/ProductCreatePage";
import ProductDetailPage from "./modules/inventory/pages/ProductDetailPage";
import ProductEditPage from "./modules/inventory/pages/ProductEditPage";
import SuppliersPage from "./modules/inventory/pages/SuppliersPage";
import StockMovementsPage from "./modules/inventory/pages/StockMovementsPage";

// Collection Points Module
import CollectionPointsListPage from "./modules/collection-points/pages/CollectionPointsListPage";
import CollectionPointCreatePage from "./modules/collection-points/pages/CollectionPointCreatePage";
import CollectionPointDetailPage from "./modules/collection-points/pages/CollectionPointDetailPage";
import CollectionPointEditPage from "./modules/collection-points/pages/CollectionPointEditPage";

// Logistics Module
import LogisticsListPage from "./modules/logistics/pages/LogisticsListPage";
import LogisticsCreatePage from "./modules/logistics/pages/LogisticsCreatePage";
import LogisticsDetailPage from "./modules/logistics/pages/LogisticsDetailPage";
import LogisticsEditPage from "./modules/logistics/pages/LogisticsEditPage";

// Finance Module
import FinanceListPage from "./modules/finance/pages/FinanceListPage";
import FinanceCreatePage from "./modules/finance/pages/FinanceCreatePage";
import FinanceDetailPage from "./modules/finance/pages/FinanceDetailPage";
import FinanceEditPage from "./modules/finance/pages/FinanceEditPage";

// Customer Portal
import PortalLayout from "./modules/portal/components/PortalLayout";
import PortalLoginPage from "./modules/portal/pages/PortalLoginPage";
import PortalOrdersPage from "./modules/portal/pages/PortalOrdersPage";
import PortalOrderDetailPage from "./modules/portal/pages/PortalOrderDetailPage";
import PortalQuotesPage from "./modules/portal/pages/PortalQuotesPage";
import PortalWarrantiesPage from "./modules/portal/pages/PortalWarrantiesPage";
import PortalLogisticsPage from "./modules/portal/pages/PortalLogisticsPage";

// Public Tracking
import PublicTrackingPage from "./modules/tracking/pages/PublicTrackingPage";

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
              <Route path="/queues" element={<ProtectedPage><WorkQueuesPage /></ProtectedPage>} />
              <Route path="/notifications" element={<ProtectedPage><NotificationsPage /></ProtectedPage>} />
              <Route path="/whatsapp" element={<ProtectedPage><WhatsAppPage /></ProtectedPage>} />

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

              {/* Service Orders */}
              <Route path="/service-orders" element={<ProtectedPage><ServiceOrdersListPage /></ProtectedPage>} />
              <Route path="/service-orders/new" element={<ProtectedPage><ServiceOrderCreatePage /></ProtectedPage>} />
              <Route path="/service-orders/:id" element={<ProtectedPage><ServiceOrderDetailPage /></ProtectedPage>} />
              <Route path="/service-orders/:id/edit" element={<ProtectedPage><ServiceOrderEditPage /></ProtectedPage>} />

              {/* Inventory */}
              <Route path="/inventory" element={<ProtectedPage><ProductsListPage /></ProtectedPage>} />
              <Route path="/inventory/products/new" element={<ProtectedPage><ProductCreatePage /></ProtectedPage>} />
              <Route path="/inventory/products/:id" element={<ProtectedPage><ProductDetailPage /></ProtectedPage>} />
              <Route path="/inventory/products/:id/edit" element={<ProtectedPage><ProductEditPage /></ProtectedPage>} />
              <Route path="/inventory/suppliers" element={<ProtectedPage><SuppliersPage /></ProtectedPage>} />
              <Route path="/inventory/movements" element={<ProtectedPage><StockMovementsPage /></ProtectedPage>} />

              {/* Collection Points */}
              <Route path="/collection-points" element={<ProtectedPage><CollectionPointsListPage /></ProtectedPage>} />
              <Route path="/collection-points/new" element={<ProtectedPage><CollectionPointCreatePage /></ProtectedPage>} />
              <Route path="/collection-points/:id" element={<ProtectedPage><CollectionPointDetailPage /></ProtectedPage>} />
              <Route path="/collection-points/:id/edit" element={<ProtectedPage><CollectionPointEditPage /></ProtectedPage>} />

              {/* Logistics */}
              <Route path="/logistics" element={<ProtectedPage><LogisticsListPage /></ProtectedPage>} />
              <Route path="/logistics/new" element={<ProtectedPage><LogisticsCreatePage /></ProtectedPage>} />
              <Route path="/logistics/:id" element={<ProtectedPage><LogisticsDetailPage /></ProtectedPage>} />
              <Route path="/logistics/:id/edit" element={<ProtectedPage><LogisticsEditPage /></ProtectedPage>} />

              {/* Finance */}
              <Route path="/finance" element={<ProtectedPage><FinanceListPage /></ProtectedPage>} />
              <Route path="/finance/new" element={<ProtectedPage><FinanceCreatePage /></ProtectedPage>} />
              <Route path="/finance/:id" element={<ProtectedPage><FinanceDetailPage /></ProtectedPage>} />
              <Route path="/finance/:id/edit" element={<ProtectedPage><FinanceEditPage /></ProtectedPage>} />

              {/* Customer Portal */}
              <Route path="/portal/login" element={<PortalLoginPage />} />
              <Route path="/portal" element={<PortalLayout />}>
                <Route index element={<PortalOrdersPage />} />
                <Route path="order/:id" element={<PortalOrderDetailPage />} />
                <Route path="quotes" element={<PortalQuotesPage />} />
                <Route path="warranties" element={<PortalWarrantiesPage />} />
                <Route path="logistics" element={<PortalLogisticsPage />} />
              </Route>

              {/* Public Tracking (no auth) */}
              <Route path="/track/:token" element={<PublicTrackingPage />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
