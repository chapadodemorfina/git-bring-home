/**
 * Sistema de gestão técnica i9
 * Desenvolvido por Alvo Sistemas e Gestão
 */
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { TenantProvider } from "@/contexts/TenantContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleGuard } from "@/components/RoleGuard";
import { AppLayout } from "@/components/layout/AppLayout";
import { SubscriptionGate } from "@/components/SubscriptionGate";
import { ROUTE_ROLES } from "@/lib/permissions";
import { ROUTE_PERMISSIONS } from "@/lib/routePermissions";
import { PermissionGuard } from "@/modules/permissions/components/PermissionGuard";

import Login from "./pages/Login";
import Register from "./pages/Register";
import SelectPlanPage from "./pages/SelectPlanPage";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

// Module Pages (tabbed)
import OperationModulePage from "./pages/modules/OperationModulePage";
import RegistrationsModulePage from "./pages/modules/RegistrationsModulePage";
import InventoryModulePage from "./pages/modules/InventoryModulePage";
import CommercialModulePage from "./pages/modules/CommercialModulePage";
import FinanceModulePage from "./pages/modules/FinanceModulePage";
import CommissionsModulePage from "./pages/modules/CommissionsModulePage";
import CommunicationModulePage from "./pages/modules/CommunicationModulePage";
import AdminModulePage from "./pages/modules/AdminModulePage";

// Detail/Create/Edit pages (keep individual routes)
import CustomerCreatePage from "./modules/customers/pages/CustomerCreatePage";
import CustomerEditPage from "./modules/customers/pages/CustomerEditPage";
import CustomerDetailPage from "./modules/customers/pages/CustomerDetailPage";
import DeviceCreatePage from "./modules/devices/pages/DeviceCreatePage";
import DeviceEditPage from "./modules/devices/pages/DeviceEditPage";
import DeviceDetailPage from "./modules/devices/pages/DeviceDetailPage";
import ServiceOrderCreatePage from "./modules/service-orders/pages/ServiceOrderCreatePage";
import ServiceOrderEditPage from "./modules/service-orders/pages/ServiceOrderEditPage";
import ServiceOrderDetailPage from "./modules/service-orders/pages/ServiceOrderDetailPage";
import ProductCreatePage from "./modules/inventory/pages/ProductCreatePage";
import ProductDetailPage from "./modules/inventory/pages/ProductDetailPage";
import ProductEditPage from "./modules/inventory/pages/ProductEditPage";
import SuppliersPage from "./modules/inventory/pages/SuppliersPage";
import SupplierDetailPage from "./modules/inventory/pages/SupplierDetailPage";
import SupplierEditPage from "./modules/inventory/pages/SupplierEditPage";
import StockMovementsPage from "./modules/inventory/pages/StockMovementsPage";
import ScrapCreatePage from "./modules/inventory/pages/ScrapCreatePage";
import ScrapDetailPage from "./modules/inventory/pages/ScrapDetailPage";
import ScrapDashboardPage from "./modules/inventory/pages/ScrapDashboardPage";
import ScrapDisassemblyPage from "./modules/inventory/pages/ScrapDisassemblyPage";
import CollectionPointCreatePage from "./modules/collection-points/pages/CollectionPointCreatePage";
import CollectionPointDetailPage from "./modules/collection-points/pages/CollectionPointDetailPage";
import CollectionPointEditPage from "./modules/collection-points/pages/CollectionPointEditPage";
import CpCommissionPeriodsPage from "./modules/collection-points/pages/CpCommissionPeriodsPage";
import CpRankingPage from "./modules/collection-points/pages/CpRankingPage";
import QuoteCreatePage from "./modules/quotes/pages/QuoteCreatePage";
import QuoteDetailPage from "./modules/quotes/pages/QuoteDetailPage";
import QuoteEditPage from "./modules/quotes/pages/QuoteEditPage";
import SaleCreatePage from "./modules/sales/pages/SaleCreatePage";
import SaleDetailPage from "./modules/sales/pages/SaleDetailPage";
import SaleEditPage from "./modules/sales/pages/SaleEditPage";
import SalesDashboardPage from "./modules/sales/pages/SalesDashboardPage";
import PdvPage from "./modules/sales/pages/PdvPage";
import WarrantyDetailPage from "./modules/repair/pages/WarrantyDetailPage";
import WarrantyReturnsPage from "./modules/repair/pages/WarrantyReturnsPage";
import LogisticsCreatePage from "./modules/logistics/pages/LogisticsCreatePage";
import LogisticsDetailPage from "./modules/logistics/pages/LogisticsDetailPage";
import LogisticsEditPage from "./modules/logistics/pages/LogisticsEditPage";
import FinanceCreatePage from "./modules/finance/pages/FinanceCreatePage";
import FinanceDetailPage from "./modules/finance/pages/FinanceDetailPage";
import FinanceEditPage from "./modules/finance/pages/FinanceEditPage";
import UserCreatePage from "./modules/users/pages/UserCreatePage";
import UserEditPage from "./modules/users/pages/UserEditPage";
import PermissionsManagementPage from "./modules/permissions/pages/PermissionsManagementPage";

// Portals
import PortalLayout from "./modules/portal/components/PortalLayout";
import PortalLoginPage from "./modules/portal/pages/PortalLoginPage";
import PortalDashboardPage from "./modules/portal/pages/PortalDashboardPage";
import PortalOrdersPage from "./modules/portal/pages/PortalOrdersPage";
import PortalOrderDetailPage from "./modules/portal/pages/PortalOrderDetailPage";
import PortalQuotesPage from "./modules/portal/pages/PortalQuotesPage";
import PortalWarrantiesPage from "./modules/portal/pages/PortalWarrantiesPage";
import PortalLogisticsPage from "./modules/portal/pages/PortalLogisticsPage";
import PortalSupportPage from "./modules/portal/pages/PortalSupportPage";
import PartnerPortalLayout from "./modules/collection-points/pages/PartnerPortalLayout";
import PartnerDashboardPage from "./modules/collection-points/pages/PartnerDashboardPage";
import PartnerOrdersPage from "./modules/collection-points/pages/PartnerOrdersPage";
import PartnerCommissionsPage from "./modules/collection-points/pages/PartnerCommissionsPage";

// Technician Mobile
import TechLayout from "./modules/technician/components/TechLayout";
import TechDashboardPage from "./modules/technician/pages/TechDashboardPage";
import TechScanPage from "./modules/technician/pages/TechScanPage";
import TechQueuePage from "./modules/technician/pages/TechQueuePage";
import TechOrderDetailPage from "./modules/technician/pages/TechOrderDetailPage";

// Public
import PublicTrackingPage from "./modules/tracking/pages/PublicTrackingPage";

const queryClient = new QueryClient();

const ProtectedPage = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <SubscriptionGate>
      <AppLayout>{children}</AppLayout>
    </SubscriptionGate>
  </ProtectedRoute>
);

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TenantProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/select-plan" element={<ProtectedRoute><SelectPlanPage /></ProtectedRoute>} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Dashboard */}
              <Route path="/dashboard" element={<ProtectedPage><RoleGuard allowedRoles={ROUTE_ROLES.dashboard} redirectByRole><Dashboard /></RoleGuard></ProtectedPage>} />

              {/* Module Hub Pages */}
              <Route path="/operation" element={<ProtectedPage><RoleGuard allowedRoles={ROUTE_ROLES.operation}><OperationModulePage /></RoleGuard></ProtectedPage>} />
              <Route path="/registrations" element={<ProtectedPage><RoleGuard allowedRoles={ROUTE_ROLES.registrations}><RegistrationsModulePage /></RoleGuard></ProtectedPage>} />
              <Route path="/stock" element={<ProtectedPage><RoleGuard allowedRoles={ROUTE_ROLES.stock}><InventoryModulePage /></RoleGuard></ProtectedPage>} />
              <Route path="/commercial" element={<ProtectedPage><RoleGuard allowedRoles={ROUTE_ROLES.commercial}><CommercialModulePage /></RoleGuard></ProtectedPage>} />
              <Route path="/financial" element={<ProtectedPage><RoleGuard allowedRoles={ROUTE_ROLES.financial}><FinanceModulePage /></RoleGuard></ProtectedPage>} />
              <Route path="/commissions-hub" element={<ProtectedPage><RoleGuard allowedRoles={ROUTE_ROLES.commissionsHub}><CommissionsModulePage /></RoleGuard></ProtectedPage>} />
              <Route path="/communication" element={<ProtectedPage><RoleGuard allowedRoles={ROUTE_ROLES.communication}><CommunicationModulePage /></RoleGuard></ProtectedPage>} />
              <Route path="/admin-hub" element={<ProtectedPage><RoleGuard allowedRoles={ROUTE_ROLES.adminHub}><AdminModulePage /></RoleGuard></ProtectedPage>} />

              {/* Legacy redirects — list pages now live inside module tabs */}
              <Route path="/service-orders" element={<Navigate to="/operation?tab=orders" replace />} />
              <Route path="/service-orders/scan" element={<Navigate to="/operation?tab=scan" replace />} />
              <Route path="/queues" element={<Navigate to="/operation?tab=queues" replace />} />
              <Route path="/warranties" element={<Navigate to="/operation?tab=warranties" replace />} />
              <Route path="/customers" element={<Navigate to="/registrations?tab=customers" replace />} />
              <Route path="/devices" element={<Navigate to="/registrations?tab=devices" replace />} />
              <Route path="/collection-points" element={<Navigate to="/registrations?tab=collection-points" replace />} />
              <Route path="/system/users" element={<Navigate to="/registrations?tab=team" replace />} />
              <Route path="/inventory" element={<Navigate to="/stock?tab=products" replace />} />
              <Route path="/inventory/scrap" element={<Navigate to="/stock?tab=scrap" replace />} />
              <Route path="/logistics" element={<Navigate to="/stock?tab=logistics" replace />} />
              <Route path="/quotes" element={<Navigate to="/commercial?tab=quotes" replace />} />
              <Route path="/sales" element={<Navigate to="/commercial?tab=sales" replace />} />
              <Route path="/finance" element={<Navigate to="/financial?tab=entries" replace />} />
              <Route path="/financial/receivables" element={<Navigate to="/financial?tab=receivables" replace />} />
              <Route path="/cash-register" element={<Navigate to="/financial?tab=cash-register" replace />} />
              <Route path="/collection-points/commissions" element={<Navigate to="/commissions-hub?tab=partners" replace />} />
              <Route path="/collection-points/reports" element={<Navigate to="/commissions-hub?tab=reports" replace />} />
              <Route path="/commissions" element={<Navigate to="/commissions-hub?tab=team" replace />} />
              <Route path="/whatsapp" element={<Navigate to="/communication?tab=whatsapp" replace />} />
              <Route path="/message-history" element={<Navigate to="/communication?tab=messages" replace />} />
              <Route path="/notifications" element={<Navigate to="/communication?tab=notifications" replace />} />
              <Route path="/settings" element={<Navigate to="/admin-hub?tab=settings" replace />} />
              <Route path="/subscription" element={<Navigate to="/admin-hub?tab=subscription" replace />} />
              <Route path="/admin/subscription" element={<Navigate to="/admin-hub?tab=admin-sub" replace />} />
              <Route path="/audit-logs" element={<Navigate to="/admin-hub?tab=audit-logs" replace />} />
              <Route path="/financial/audit" element={<Navigate to="/admin-hub?tab=financial-audit" replace />} />

              {/* Detail/Create/Edit — preserved */}
              <Route path="/customers/new" element={<ProtectedPage><RoleGuard allowedRoles={ROUTE_ROLES.customers}><CustomerCreatePage /></RoleGuard></ProtectedPage>} />
              <Route path="/customers/:id" element={<ProtectedPage><RoleGuard allowedRoles={ROUTE_ROLES.customers}><CustomerDetailPage /></RoleGuard></ProtectedPage>} />
              <Route path="/customers/:id/edit" element={<ProtectedPage><RoleGuard allowedRoles={ROUTE_ROLES.customers}><CustomerEditPage /></RoleGuard></ProtectedPage>} />
              <Route path="/devices/new" element={<ProtectedPage><RoleGuard allowedRoles={ROUTE_ROLES.devices}><DeviceCreatePage /></RoleGuard></ProtectedPage>} />
              <Route path="/devices/:id" element={<ProtectedPage><RoleGuard allowedRoles={ROUTE_ROLES.devices}><DeviceDetailPage /></RoleGuard></ProtectedPage>} />
              <Route path="/devices/:id/edit" element={<ProtectedPage><RoleGuard allowedRoles={ROUTE_ROLES.devices}><DeviceEditPage /></RoleGuard></ProtectedPage>} />
              <Route path="/service-orders/new" element={<ProtectedPage><RoleGuard allowedRoles={ROUTE_ROLES.serviceOrders}><ServiceOrderCreatePage /></RoleGuard></ProtectedPage>} />
              <Route path="/service-orders/:id" element={<ProtectedPage><RoleGuard allowedRoles={ROUTE_ROLES.serviceOrders}><ServiceOrderDetailPage /></RoleGuard></ProtectedPage>} />
              <Route path="/service-orders/:id/edit" element={<ProtectedPage><RoleGuard allowedRoles={ROUTE_ROLES.serviceOrders}><ServiceOrderEditPage /></RoleGuard></ProtectedPage>} />
              <Route path="/inventory/products/new" element={<ProtectedPage><RoleGuard allowedRoles={ROUTE_ROLES.inventory}><ProductCreatePage /></RoleGuard></ProtectedPage>} />
              <Route path="/inventory/products/:id" element={<ProtectedPage><RoleGuard allowedRoles={ROUTE_ROLES.inventory}><ProductDetailPage /></RoleGuard></ProtectedPage>} />
              <Route path="/inventory/products/:id/edit" element={<ProtectedPage><RoleGuard allowedRoles={ROUTE_ROLES.inventory}><ProductEditPage /></RoleGuard></ProtectedPage>} />
              <Route path="/inventory/suppliers" element={<ProtectedPage><RoleGuard allowedRoles={ROUTE_ROLES.inventory}><SuppliersPage /></RoleGuard></ProtectedPage>} />
              <Route path="/inventory/suppliers/:id" element={<ProtectedPage><RoleGuard allowedRoles={ROUTE_ROLES.inventory}><SupplierDetailPage /></RoleGuard></ProtectedPage>} />
              <Route path="/inventory/suppliers/:id/edit" element={<ProtectedPage><RoleGuard allowedRoles={ROUTE_ROLES.inventory}><SupplierEditPage /></RoleGuard></ProtectedPage>} />
              <Route path="/inventory/movements" element={<ProtectedPage><RoleGuard allowedRoles={ROUTE_ROLES.inventory}><StockMovementsPage /></RoleGuard></ProtectedPage>} />
              <Route path="/inventory/scrap/new" element={<ProtectedPage><RoleGuard allowedRoles={ROUTE_ROLES.inventory}><ScrapCreatePage /></RoleGuard></ProtectedPage>} />
              <Route path="/inventory/scrap/dashboard" element={<ProtectedPage><RoleGuard allowedRoles={ROUTE_ROLES.inventory}><ScrapDashboardPage /></RoleGuard></ProtectedPage>} />
              <Route path="/inventory/scrap/disassembly" element={<ProtectedPage><RoleGuard allowedRoles={ROUTE_ROLES.inventory}><ScrapDisassemblyPage /></RoleGuard></ProtectedPage>} />
              <Route path="/inventory/scrap/:id" element={<ProtectedPage><RoleGuard allowedRoles={ROUTE_ROLES.inventory}><ScrapDetailPage /></RoleGuard></ProtectedPage>} />
              <Route path="/collection-points/new" element={<ProtectedPage><RoleGuard allowedRoles={["admin", "manager"]}><CollectionPointCreatePage /></RoleGuard></ProtectedPage>} />
              <Route path="/collection-points/:id" element={<ProtectedPage><RoleGuard allowedRoles={["admin", "manager"]}><CollectionPointDetailPage /></RoleGuard></ProtectedPage>} />
              <Route path="/collection-points/:id/edit" element={<ProtectedPage><RoleGuard allowedRoles={["admin", "manager"]}><CollectionPointEditPage /></RoleGuard></ProtectedPage>} />
              <Route path="/commissions/cp" element={<ProtectedPage><RoleGuard allowedRoles={["admin", "manager", "finance"]}><CpCommissionPeriodsPage /></RoleGuard></ProtectedPage>} />
              <Route path="/cp-ranking" element={<ProtectedPage><RoleGuard allowedRoles={["admin", "manager", "finance"]}><CpRankingPage /></RoleGuard></ProtectedPage>} />
              <Route path="/quotes/new" element={<ProtectedPage><RoleGuard allowedRoles={ROUTE_ROLES.quotes}><QuoteCreatePage /></RoleGuard></ProtectedPage>} />
              <Route path="/quotes/:id" element={<ProtectedPage><RoleGuard allowedRoles={ROUTE_ROLES.quotes}><QuoteDetailPage /></RoleGuard></ProtectedPage>} />
              <Route path="/quotes/:id/edit" element={<ProtectedPage><RoleGuard allowedRoles={ROUTE_ROLES.quotes}><QuoteEditPage /></RoleGuard></ProtectedPage>} />
              <Route path="/warranties/returns" element={<ProtectedPage><RoleGuard allowedRoles={ROUTE_ROLES.warranties}><WarrantyReturnsPage /></RoleGuard></ProtectedPage>} />
              <Route path="/warranties/:id" element={<ProtectedPage><RoleGuard allowedRoles={ROUTE_ROLES.warranties}><WarrantyDetailPage /></RoleGuard></ProtectedPage>} />
              <Route path="/sales/dashboard" element={<ProtectedPage><RoleGuard allowedRoles={["admin", "manager", "finance"]}><SalesDashboardPage /></RoleGuard></ProtectedPage>} />
              <Route path="/sales/new" element={<ProtectedPage><RoleGuard allowedRoles={ROUTE_ROLES.sales}><SaleCreatePage /></RoleGuard></ProtectedPage>} />
              <Route path="/sales/:id" element={<ProtectedPage><RoleGuard allowedRoles={ROUTE_ROLES.salesRead}><SaleDetailPage /></RoleGuard></ProtectedPage>} />
              <Route path="/sales/:id/edit" element={<ProtectedPage><RoleGuard allowedRoles={ROUTE_ROLES.sales}><SaleEditPage /></RoleGuard></ProtectedPage>} />
              <Route path="/pdv" element={<ProtectedRoute><RoleGuard allowedRoles={ROUTE_ROLES.pdv}><PdvPage /></RoleGuard></ProtectedRoute>} />
              <Route path="/logistics/new" element={<ProtectedPage><RoleGuard allowedRoles={ROUTE_ROLES.logistics}><LogisticsCreatePage /></RoleGuard></ProtectedPage>} />
              <Route path="/logistics/:id" element={<ProtectedPage><RoleGuard allowedRoles={ROUTE_ROLES.logistics}><LogisticsDetailPage /></RoleGuard></ProtectedPage>} />
              <Route path="/logistics/:id/edit" element={<ProtectedPage><RoleGuard allowedRoles={ROUTE_ROLES.logistics}><LogisticsEditPage /></RoleGuard></ProtectedPage>} />
              <Route path="/finance/new" element={<ProtectedPage><RoleGuard allowedRoles={ROUTE_ROLES.finance}><FinanceCreatePage /></RoleGuard></ProtectedPage>} />
              <Route path="/finance/:id" element={<ProtectedPage><RoleGuard allowedRoles={ROUTE_ROLES.finance}><FinanceDetailPage /></RoleGuard></ProtectedPage>} />
              <Route path="/finance/:id/edit" element={<ProtectedPage><RoleGuard allowedRoles={ROUTE_ROLES.finance}><FinanceEditPage /></RoleGuard></ProtectedPage>} />
              <Route path="/system/users/new" element={<ProtectedPage><RoleGuard allowedRoles={["admin", "manager"]}><UserCreatePage /></RoleGuard></ProtectedPage>} />
              <Route path="/system/users/:id/edit" element={<ProtectedPage><RoleGuard allowedRoles={["admin", "manager"]}><UserEditPage /></RoleGuard></ProtectedPage>} />
              <Route path="/system/permissions" element={<ProtectedPage><RoleGuard allowedRoles={["admin", "manager"]}><PermissionGuard anyOf={[...ROUTE_PERMISSIONS.permissionsPage.anyOf]} shadowOnly debugLabel="/system/permissions"><PermissionsManagementPage /></PermissionGuard></RoleGuard></ProtectedPage>} />

              {/* Customer Portal */}
              <Route path="/portal/login" element={<PortalLoginPage />} />
              <Route path="/portal" element={<PortalLayout />}>
                <Route index element={<PortalDashboardPage />} />
                <Route path="orders" element={<PortalOrdersPage />} />
                <Route path="order/:id" element={<PortalOrderDetailPage />} />
                <Route path="quotes" element={<PortalQuotesPage />} />
                <Route path="warranties" element={<PortalWarrantiesPage />} />
                <Route path="logistics" element={<PortalLogisticsPage />} />
                <Route path="support" element={<PortalSupportPage />} />
              </Route>

              {/* Partner Portal */}
              <Route path="/partner" element={<PartnerPortalLayout />}>
                <Route index element={<PartnerDashboardPage />} />
                <Route path="orders" element={<PartnerOrdersPage />} />
                <Route path="commissions" element={<PartnerCommissionsPage />} />
              </Route>

              {/* Technician Mobile */}
              <Route
                path="/tech"
                element={
                  <ProtectedRoute>
                    <RoleGuard allowedRoles={ROUTE_ROLES.tech}>
                      <TechLayout />
                    </RoleGuard>
                  </ProtectedRoute>
                }
              >
                <Route index element={<TechDashboardPage />} />
                <Route path="scan" element={<TechScanPage />} />
                <Route path="queue" element={<TechQueuePage />} />
                <Route path="order/:id" element={<TechOrderDetailPage />} />
              </Route>

              {/* Public Tracking */}
              <Route path="/track/:token" element={<PublicTrackingPage />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
        </TenantProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
