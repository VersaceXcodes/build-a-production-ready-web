import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAppStore } from '@/store/main';

// ============================================================================
// VIEW IMPORTS
// ============================================================================

// Shared/Global Views
import GV_TopNav from '@/components/views/GV_TopNav';
import GV_AuthNav from '@/components/views/GV_AuthNav';
import GV_Footer from '@/components/views/GV_Footer';
import GV_CustomerNav from '@/components/views/GV_CustomerNav';
import GV_StaffNav from '@/components/views/GV_StaffNav';
import GV_AdminNav from '@/components/views/GV_AdminNav';

// Public Views
import UV_Landing from '@/components/views/UV_Landing';
import UV_About from '@/components/views/UV_About';
import UV_Gallery from '@/components/views/UV_Gallery';
import UV_Services from '@/components/views/UV_Services';
import UV_ServiceDetail from '@/components/views/UV_ServiceDetail';
import UV_Pricing from '@/components/views/UV_Pricing';
import UV_Policies from '@/components/views/UV_Policies';
import UV_Contact from '@/components/views/UV_Contact';

// Auth Views
import UV_Login from '@/components/views/UV_Login';
import UV_Register from '@/components/views/UV_Register';
import UV_ForgotPassword from '@/components/views/UV_ForgotPassword';
import UV_ResetPassword from '@/components/views/UV_ResetPassword';

// Customer Portal Views
import UV_CustomerDashboard from '@/components/views/UV_CustomerDashboard';
import UV_QuotesList from '@/components/views/UV_QuotesList';
import UV_QuoteBuilder from '@/components/views/UV_QuoteBuilder';
import UV_QuoteDetail from '@/components/views/UV_QuoteDetail';
import UV_BookingsList from '@/components/views/UV_BookingsList';
import UV_OrdersList from '@/components/views/UV_OrdersList';
import UV_OrderDetail from '@/components/views/UV_OrderDetail';
import UV_CustomerProfile from '@/components/views/UV_CustomerProfile';

// Staff Portal Views
import UV_StaffDashboard from '@/components/views/UV_StaffDashboard';
import UV_JobQueue from '@/components/views/UV_JobQueue';
import UV_JobDetail from '@/components/views/UV_JobDetail';
import UV_StaffCalendar from '@/components/views/UV_StaffCalendar';
import UV_StaffMessages from '@/components/views/UV_StaffMessages';
import UV_StaffProfile from '@/components/views/UV_StaffProfile';

// Admin Portal Views
import UV_AdminDashboard from '@/components/views/UV_AdminDashboard';
import UV_ServicesManagement from '@/components/views/UV_ServicesManagement';
import UV_PricingManagement from '@/components/views/UV_PricingManagement';
import UV_TiersManagement from '@/components/views/UV_TiersManagement';
import UV_CalendarManagement from '@/components/views/UV_CalendarManagement';
import UV_QuotesManagement from '@/components/views/UV_QuotesManagement';
import UV_OrdersManagement from '@/components/views/UV_OrdersManagement';
import UV_UsersManagement from '@/components/views/UV_UsersManagement';
import UV_ContentManagement from '@/components/views/UV_ContentManagement';
import UV_SystemSettings from '@/components/views/UV_SystemSettings';
import UV_B2BManagement from '@/components/views/UV_B2BManagement';
import UV_InventoryManagement from '@/components/views/UV_InventoryManagement';
import UV_AnalyticsDashboard from '@/components/views/UV_AnalyticsDashboard';

// ============================================================================
// REACT QUERY CLIENT SETUP
// ============================================================================

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// ============================================================================
// LOADING COMPONENT
// ============================================================================

const LoadingSpinner: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-900">
    <div className="flex flex-col items-center gap-4">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-yellow-400"></div>
      <p className="text-white text-lg font-medium">Loading...</p>
    </div>
  </div>
);

// ============================================================================
// LAYOUT COMPONENTS
// ============================================================================

// Public Layout (unauthenticated pages)
const PublicLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex flex-col min-h-screen">
    <GV_TopNav />
    <main className="flex-1">{children}</main>
    <GV_Footer />
  </div>
);

// Customer Portal Layout
const CustomerLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex flex-col min-h-screen">
    <GV_AuthNav />
    <div className="flex flex-1">
      <GV_CustomerNav />
      <main className="flex-1">{children}</main>
    </div>
    <GV_Footer />
  </div>
);

// Staff Portal Layout
const StaffLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex flex-col min-h-screen">
    <GV_AuthNav />
    <div className="flex flex-1">
      <GV_StaffNav />
      <main className="flex-1">{children}</main>
    </div>
    <GV_Footer />
  </div>
);

// Admin Portal Layout
const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex flex-col min-h-screen">
    <GV_AuthNav />
    <div className="flex flex-1">
      <GV_AdminNav />
      <main className="flex-1">{children}</main>
    </div>
    <GV_Footer />
  </div>
);

// ============================================================================
// ROUTE PROTECTION COMPONENTS
// ============================================================================

// Basic Protected Route (requires authentication)
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAppStore(
    (state) => state.authentication_state.authentication_status.is_authenticated
  );
  const isLoading = useAppStore(
    (state) => state.authentication_state.authentication_status.is_loading
  );

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Role-based Protected Route
const RoleProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles: Array<'CUSTOMER' | 'STAFF' | 'ADMIN'>;
}> = ({ children, allowedRoles }) => {
  const isAuthenticated = useAppStore(
    (state) => state.authentication_state.authentication_status.is_authenticated
  );
  const isLoading = useAppStore(
    (state) => state.authentication_state.authentication_status.is_loading
  );
  const currentUser = useAppStore((state) => state.authentication_state.current_user);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!currentUser || !allowedRoles.includes(currentUser.role)) {
    // Redirect to appropriate dashboard based on user role
    if (currentUser?.role === 'CUSTOMER') {
      return <Navigate to="/app" replace />;
    } else if (currentUser?.role === 'STAFF') {
      return <Navigate to="/staff" replace />;
    } else if (currentUser?.role === 'ADMIN') {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// Feature Flag Protected Route (for Phase 2 features)
const FeatureFlagRoute: React.FC<{
  children: React.ReactNode;
  featureFlag: 'b2b_accounts' | 'inventory_management' | 'analytics_dashboard';
}> = ({ children, featureFlag }) => {
  const featureFlags = useAppStore((state) => state.feature_flags);

  if (!featureFlags[featureFlag]) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
};

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

const App: React.FC = () => {
  // CRITICAL: Use individual selectors to avoid infinite loops
  const isLoading = useAppStore(
    (state) => state.authentication_state.authentication_status.is_loading
  );
  const initializeAuth = useAppStore((state) => state.initialize_auth);

  // Initialize authentication on app mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Show loading spinner during auth initialization
  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <Router>
      <QueryClientProvider client={queryClient}>
        <div className="App min-h-screen bg-gray-50">
          <Routes>
            {/* ========================================================== */}
            {/* PUBLIC ROUTES */}
            {/* ========================================================== */}

            <Route
              path="/"
              element={
                <PublicLayout>
                  <UV_Landing />
                </PublicLayout>
              }
            />

            <Route
              path="/about"
              element={
                <PublicLayout>
                  <UV_About />
                </PublicLayout>
              }
            />

            <Route
              path="/gallery"
              element={
                <PublicLayout>
                  <UV_Gallery />
                </PublicLayout>
              }
            />

            <Route
              path="/services"
              element={
                <PublicLayout>
                  <UV_Services />
                </PublicLayout>
              }
            />

            <Route
              path="/services/:service_slug"
              element={
                <PublicLayout>
                  <UV_ServiceDetail />
                </PublicLayout>
              }
            />

            <Route
              path="/pricing"
              element={
                <PublicLayout>
                  <UV_Pricing />
                </PublicLayout>
              }
            />

            <Route
              path="/policies"
              element={
                <PublicLayout>
                  <UV_Policies />
                </PublicLayout>
              }
            />

            <Route
              path="/contact"
              element={
                <PublicLayout>
                  <UV_Contact />
                </PublicLayout>
              }
            />

            {/* ========================================================== */}
            {/* AUTH ROUTES */}
            {/* ========================================================== */}

            <Route
              path="/login"
              element={
                <PublicLayout>
                  <UV_Login />
                </PublicLayout>
              }
            />

            <Route
              path="/register"
              element={
                <PublicLayout>
                  <UV_Register />
                </PublicLayout>
              }
            />

            <Route
              path="/forgot-password"
              element={
                <PublicLayout>
                  <UV_ForgotPassword />
                </PublicLayout>
              }
            />

            <Route
              path="/reset-password/:reset_token"
              element={
                <PublicLayout>
                  <UV_ResetPassword />
                </PublicLayout>
              }
            />

            {/* ========================================================== */}
            {/* CUSTOMER PROTECTED ROUTES */}
            {/* ========================================================== */}

            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={['CUSTOMER']}>
                    <CustomerLayout>
                      <UV_CustomerDashboard />
                    </CustomerLayout>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              }
            />

            <Route
              path="/app/quotes"
              element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={['CUSTOMER']}>
                    <CustomerLayout>
                      <UV_QuotesList />
                    </CustomerLayout>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              }
            />

            <Route
              path="/app/quotes/new"
              element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={['CUSTOMER']}>
                    <CustomerLayout>
                      <UV_QuoteBuilder />
                    </CustomerLayout>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              }
            />

            <Route
              path="/app/quotes/:quote_id"
              element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={['CUSTOMER']}>
                    <CustomerLayout>
                      <UV_QuoteDetail />
                    </CustomerLayout>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              }
            />

            <Route
              path="/app/bookings"
              element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={['CUSTOMER']}>
                    <CustomerLayout>
                      <UV_BookingsList />
                    </CustomerLayout>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              }
            />

            <Route
              path="/app/orders"
              element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={['CUSTOMER']}>
                    <CustomerLayout>
                      <UV_OrdersList />
                    </CustomerLayout>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              }
            />

            <Route
              path="/app/orders/:order_id"
              element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={['CUSTOMER']}>
                    <CustomerLayout>
                      <UV_OrderDetail />
                    </CustomerLayout>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              }
            />

            <Route
              path="/app/profile"
              element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={['CUSTOMER']}>
                    <CustomerLayout>
                      <UV_CustomerProfile />
                    </CustomerLayout>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              }
            />

            {/* ========================================================== */}
            {/* STAFF PROTECTED ROUTES */}
            {/* ========================================================== */}

            <Route
              path="/staff"
              element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={['STAFF']}>
                    <StaffLayout>
                      <UV_StaffDashboard />
                    </StaffLayout>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              }
            />

            <Route
              path="/staff/jobs"
              element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={['STAFF']}>
                    <StaffLayout>
                      <UV_JobQueue />
                    </StaffLayout>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              }
            />

            <Route
              path="/staff/jobs/:order_id"
              element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={['STAFF']}>
                    <StaffLayout>
                      <UV_JobDetail />
                    </StaffLayout>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              }
            />

            <Route
              path="/staff/calendar"
              element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={['STAFF']}>
                    <StaffLayout>
                      <UV_StaffCalendar />
                    </StaffLayout>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              }
            />

            <Route
              path="/staff/messages"
              element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={['STAFF']}>
                    <StaffLayout>
                      <UV_StaffMessages />
                    </StaffLayout>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              }
            />

            <Route
              path="/staff/profile"
              element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={['STAFF']}>
                    <StaffLayout>
                      <UV_StaffProfile />
                    </StaffLayout>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              }
            />

            {/* ========================================================== */}
            {/* ADMIN PROTECTED ROUTES */}
            {/* ========================================================== */}

            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminLayout>
                      <UV_AdminDashboard />
                    </AdminLayout>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/services"
              element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminLayout>
                      <UV_ServicesManagement />
                    </AdminLayout>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/pricing"
              element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminLayout>
                      <UV_PricingManagement />
                    </AdminLayout>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/tiers"
              element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminLayout>
                      <UV_TiersManagement />
                    </AdminLayout>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/calendar"
              element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminLayout>
                      <UV_CalendarManagement />
                    </AdminLayout>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/quotes"
              element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminLayout>
                      <UV_QuotesManagement />
                    </AdminLayout>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/orders"
              element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminLayout>
                      <UV_OrdersManagement />
                    </AdminLayout>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/users"
              element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminLayout>
                      <UV_UsersManagement />
                    </AdminLayout>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/content"
              element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminLayout>
                      <UV_ContentManagement />
                    </AdminLayout>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminLayout>
                      <UV_SystemSettings />
                    </AdminLayout>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              }
            />

            {/* ========================================================== */}
            {/* ADMIN PHASE 2 ROUTES (Feature Flagged) */}
            {/* ========================================================== */}

            <Route
              path="/admin/b2b"
              element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={['ADMIN']}>
                    <FeatureFlagRoute featureFlag="b2b_accounts">
                      <AdminLayout>
                        <UV_B2BManagement />
                      </AdminLayout>
                    </FeatureFlagRoute>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/inventory"
              element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={['ADMIN']}>
                    <FeatureFlagRoute featureFlag="inventory_management">
                      <AdminLayout>
                        <UV_InventoryManagement />
                      </AdminLayout>
                    </FeatureFlagRoute>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/analytics"
              element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={['ADMIN']}>
                    <FeatureFlagRoute featureFlag="analytics_dashboard">
                      <AdminLayout>
                        <UV_AnalyticsDashboard />
                      </AdminLayout>
                    </FeatureFlagRoute>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              }
            />

            {/* ========================================================== */}
            {/* CATCH ALL - 404 REDIRECT */}
            {/* ========================================================== */}

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </QueryClientProvider>
    </Router>
  );
};

export default App;