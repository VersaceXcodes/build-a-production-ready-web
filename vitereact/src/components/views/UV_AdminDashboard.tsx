import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  RefreshCw, 
  FileText, 
  ShoppingCart, 
  DollarSign, 
  Calendar, 
  Package, 
  Activity,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface QuoteMetrics {
  requested: number;
  pending: number;
  approved: number;
  rejected: number;
  expired: number;
}

interface OrderMetrics {
  quote_requested: number;
  quote_approved: number;
  in_production: number;
  completed: number;
  cancelled: number;
}

interface RevenueMetrics {
  total_revenue_paid: number;
  outstanding_amount: number;
  current_month_revenue: number;
}

interface PendingQuote {
  id: string;
  customer_id: string;
  service_id: string;
  tier_id: string | null;
  status: string;
  estimate_subtotal: number | null;
  created_at: string;
  customer_name?: string;
  service_name?: string;
}

interface RecentPayment {
  id: string;
  order_id: string;
  amount: number;
  method: string;
  status: string;
  created_at: string;
  order_number?: string;
}

interface AuditLogEntry {
  id: string;
  action: string;
  user_id: string;
  created_at: string;
  order_id: string | null;
}

interface DashboardData {
  quotes_metrics: QuoteMetrics;
  orders_metrics: OrderMetrics;
  revenue_metrics: RevenueMetrics;
  upcoming_bookings_count: number;
  low_stock_items_count: number;
  pending_quotes_list: PendingQuote[];
  recent_activity: AuditLogEntry[];
  recent_payments: RecentPayment[];
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchQuotesMetrics = async (authToken: string | null): Promise<{ quotes_metrics: QuoteMetrics; pending_quotes_list: PendingQuote[] }> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/quotes`,
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      params: {
        limit: 100,
        sort_by: 'created_at',
        sort_order: 'desc',
      },
    }
  );

  const quotes = response.data.quotes || [];

  // Count by status
  const metrics: QuoteMetrics = {
    requested: quotes.filter((q: any) => q.status === 'REQUESTED').length,
    pending: quotes.filter((q: any) => q.status === 'PENDING').length,
    approved: quotes.filter((q: any) => q.status === 'APPROVED').length,
    rejected: quotes.filter((q: any) => q.status === 'REJECTED').length,
    expired: quotes.filter((q: any) => q.status === 'EXPIRED').length,
  };

  // Get first 5 pending quotes
  const pendingQuotes = quotes
    .filter((q: any) => q.status === 'REQUESTED' || q.status === 'PENDING')
    .slice(0, 5)
    .map((q: any) => ({
      id: q.id,
      customer_id: q.customer_id,
      service_id: q.service_id,
      tier_id: q.tier_id,
      status: q.status,
      estimate_subtotal: q.estimate_subtotal ? Number(q.estimate_subtotal) : null,
      created_at: q.created_at,
      customer_name: q.customer_name || 'Unknown',
      service_name: q.service_name || 'Unknown Service',
    }));

  return {
    quotes_metrics: metrics,
    pending_quotes_list: pendingQuotes,
  };
};

const fetchOrdersMetrics = async (authToken: string | null): Promise<{ orders_metrics: OrderMetrics; revenue_metrics: RevenueMetrics }> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/orders`,
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      params: {
        limit: 500,
        sort_by: 'created_at',
        sort_order: 'desc',
      },
    }
  );

  const orders = response.data.orders || [];

  // Count by status
  const statusCounts: any = {};
  orders.forEach((order: any) => {
    const status = order.status;
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  const metrics: OrderMetrics = {
    quote_requested: statusCounts['QUOTE_REQUESTED'] || 0,
    quote_approved: statusCounts['QUOTE_APPROVED'] || 0,
    in_production: statusCounts['IN_PRODUCTION'] || 0,
    completed: statusCounts['COMPLETED'] || 0,
    cancelled: statusCounts['CANCELLED'] || 0,
  };

  // Calculate revenue (CRITICAL: Convert numeric strings)
  const totalRevenuePaid = orders.reduce((sum: number, order: any) => {
    const totalAmount = Number(order.total_amount || 0);
    const balanceDue = Number(order.balance_due || 0);
    return sum + (totalAmount - balanceDue);
  }, 0);

  const outstandingAmount = orders.reduce((sum: number, order: any) => {
    return sum + Number(order.balance_due || 0);
  }, 0);

  // Current month revenue (filter by created_at)
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthRevenue = orders
    .filter((order: any) => new Date(order.created_at) >= currentMonthStart)
    .reduce((sum: number, order: any) => {
      const totalAmount = Number(order.total_amount || 0);
      const balanceDue = Number(order.balance_due || 0);
      return sum + (totalAmount - balanceDue);
    }, 0);

  return {
    orders_metrics: metrics,
    revenue_metrics: {
      total_revenue_paid: totalRevenuePaid,
      outstanding_amount: outstandingAmount,
      current_month_revenue: currentMonthRevenue,
    },
  };
};

const fetchUpcomingBookings = async (authToken: string | null): Promise<number> => {
  const today = new Date();
  const sevenDaysLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/bookings`,
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      params: {
        start_date: today.toISOString().split('T')[0],
        end_date: sevenDaysLater.toISOString().split('T')[0],
        status: 'CONFIRMED',
        limit: 100,
      },
    }
  );

  return response.data.bookings?.length || 0;
};

const fetchRecentActivity = async (authToken: string | null): Promise<AuditLogEntry[]> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/audit-logs`,
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      params: {
        limit: 10,
        sort_by: 'created_at',
        sort_order: 'desc',
      },
    }
  );

  const logs = response.data.logs || [];
  return logs.map((log: any) => ({
    id: log.id,
    action: log.action,
    user_id: log.user_id,
    created_at: log.created_at,
    order_id: log.order_id,
  }));
};

const fetchRecentPayments = async (authToken: string | null): Promise<RecentPayment[]> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/payments`,
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      params: {
        limit: 10,
        sort_by: 'created_at',
        sort_order: 'desc',
      },
    }
  );

  const payments = response.data.payments || [];
  return payments.map((payment: any) => ({
    id: payment.id,
    order_id: payment.order_id,
    amount: Number(payment.amount || 0),
    method: payment.method,
    status: payment.status,
    created_at: payment.created_at,
    order_number: payment.order_number || payment.order_id,
  }));
};

const fetchInventoryAlerts = async (authToken: string | null): Promise<number> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/inventory-items`,
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      params: {
        low_stock: true,
        limit: 100,
      },
    }
  );

  return response.data.items?.length || 0;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_AdminDashboard: React.FC = () => {
  // ============================================================================
  // GLOBAL STATE (Individual selectors - NO object destructuring)
  // ============================================================================
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const featureFlags = useAppStore(state => state.feature_flags);

  // ============================================================================
  // DATA FETCHING (React Query)
  // ============================================================================
  const {
    data: quotesData,
    isLoading: quotesLoading,
    error: quotesError,
    refetch: refetchQuotes,
  } = useQuery({
    queryKey: ['admin-dashboard-quotes'],
    queryFn: () => fetchQuotesMetrics(authToken),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 2 * 60 * 1000, // Auto-refresh every 2 minutes
    retry: 1,
  });

  const {
    data: ordersData,
    isLoading: ordersLoading,
    error: ordersError,
    refetch: refetchOrders,
  } = useQuery({
    queryKey: ['admin-dashboard-orders'],
    queryFn: () => fetchOrdersMetrics(authToken),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
    retry: 1,
  });

  const {
    data: bookingsCount,
    isLoading: bookingsLoading,
    error: bookingsError,
    refetch: refetchBookings,
  } = useQuery({
    queryKey: ['admin-dashboard-bookings'],
    queryFn: () => fetchUpcomingBookings(authToken),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
    retry: 1,
  });

  const {
    data: activityData,
    isLoading: activityLoading,
    error: activityError,
    refetch: refetchActivity,
  } = useQuery({
    queryKey: ['admin-dashboard-activity'],
    queryFn: () => fetchRecentActivity(authToken),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
    retry: 1,
  });

  const {
    data: paymentsData,
    isLoading: paymentsLoading,
    error: paymentsError,
    refetch: refetchPayments,
  } = useQuery({
    queryKey: ['admin-dashboard-payments'],
    queryFn: () => fetchRecentPayments(authToken),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
    retry: 1,
  });

  // Conditional Phase 2 query
  const {
    data: inventoryCount,
    isLoading: inventoryLoading,
    error: inventoryError,
    refetch: refetchInventory,
  } = useQuery({
    queryKey: ['admin-dashboard-inventory'],
    queryFn: () => fetchInventoryAlerts(authToken),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
    retry: 1,
    enabled: featureFlags.inventory_management === true, // Only fetch if feature enabled
  });

  // ============================================================================
  // HANDLERS
  // ============================================================================
  const handleRefreshAll = () => {
    refetchQuotes();
    refetchOrders();
    refetchBookings();
    refetchActivity();
    refetchPayments();
    if (featureFlags.inventory_management) {
      refetchInventory();
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-IE', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getStatusColor = (status: string): string => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('complete') || statusLower.includes('approved')) return 'text-green-600 bg-green-50';
    if (statusLower.includes('pending') || statusLower.includes('requested')) return 'text-yellow-600 bg-yellow-50';
    if (statusLower.includes('rejected') || statusLower.includes('cancelled')) return 'text-red-600 bg-red-50';
    if (statusLower.includes('production')) return 'text-blue-600 bg-blue-50';
    return 'text-gray-600 bg-gray-50';
  };

  // ============================================================================
  // LOADING STATE
  // ============================================================================
  const isLoading = quotesLoading || ordersLoading || bookingsLoading;

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Page Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Welcome back, {currentUser?.name || 'Admin'}
                </p>
              </div>
              <button
                onClick={handleRefreshAll}
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* Quotes Widget */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Quotes</h3>
                </div>
              </div>
              
              {quotesLoading ? (
                <div className="flex items-center justify-center h-24">
                  <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
                </div>
              ) : quotesError ? (
                <div className="text-sm text-red-600 p-4 bg-red-50 rounded-lg">
                  Failed to load quotes data
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-600">Requested</span>
                    <span className="text-lg font-bold text-yellow-600">
                      {quotesData?.quotes_metrics.requested || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-600">Pending</span>
                    <span className="text-lg font-bold text-orange-600">
                      {quotesData?.quotes_metrics.pending || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-600">Approved</span>
                    <span className="text-lg font-bold text-green-600">
                      {quotesData?.quotes_metrics.approved || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-t border-gray-100 pt-2">
                    <span className="text-sm font-medium text-gray-900">Total</span>
                    <span className="text-2xl font-bold text-gray-900">
                      {(quotesData?.quotes_metrics.requested || 0) + 
                       (quotesData?.quotes_metrics.pending || 0) + 
                       (quotesData?.quotes_metrics.approved || 0)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Orders Widget */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <ShoppingCart className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Orders</h3>
                </div>
              </div>
              
              {ordersLoading ? (
                <div className="flex items-center justify-center h-24">
                  <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
                </div>
              ) : ordersError ? (
                <div className="text-sm text-red-600 p-4 bg-red-50 rounded-lg">
                  Failed to load orders data
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-600">In Production</span>
                    <span className="text-lg font-bold text-blue-600">
                      {ordersData?.orders_metrics.in_production || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-600">Quote Approved</span>
                    <span className="text-lg font-bold text-green-600">
                      {ordersData?.orders_metrics.quote_approved || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-600">Completed</span>
                    <span className="text-lg font-bold text-gray-600">
                      {ordersData?.orders_metrics.completed || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-t border-gray-100 pt-2">
                    <span className="text-sm font-medium text-gray-900">Active</span>
                    <span className="text-2xl font-bold text-gray-900">
                      {(ordersData?.orders_metrics.in_production || 0) + 
                       (ordersData?.orders_metrics.quote_approved || 0)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Revenue Widget */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Revenue</h3>
                </div>
              </div>
              
              {ordersLoading ? (
                <div className="flex items-center justify-center h-24">
                  <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
                </div>
              ) : ordersError ? (
                <div className="text-sm text-red-600 p-4 bg-red-50 rounded-lg">
                  Failed to load revenue data
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-600">Total Paid</span>
                    <p className="text-2xl font-bold text-green-600 mt-1">
                      {formatCurrency(ordersData?.revenue_metrics.total_revenue_paid || 0)}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Outstanding</span>
                    <p className="text-xl font-semibold text-orange-600 mt-1">
                      {formatCurrency(ordersData?.revenue_metrics.outstanding_amount || 0)}
                    </p>
                  </div>
                  <div className="border-t border-gray-100 pt-2">
                    <span className="text-sm text-gray-600">This Month</span>
                    <p className="text-lg font-semibold text-blue-600 mt-1">
                      {formatCurrency(ordersData?.revenue_metrics.current_month_revenue || 0)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Bookings Widget */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <Calendar className="h-6 w-6 text-indigo-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Upcoming Bookings</h3>
                </div>
              </div>
              
              {bookingsLoading ? (
                <div className="flex items-center justify-center h-24">
                  <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
                </div>
              ) : bookingsError ? (
                <div className="text-sm text-red-600 p-4 bg-red-50 rounded-lg">
                  Failed to load bookings data
                </div>
              ) : (
                <div className="pt-4">
                  <p className="text-5xl font-bold text-indigo-600 mb-2">
                    {bookingsCount || 0}
                  </p>
                  <p className="text-sm text-gray-600">Next 7 days (confirmed)</p>
                  <Link
                    to="/admin/calendar"
                    className="mt-4 inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    View calendar
                    <TrendingUp className="ml-1 h-4 w-4" />
                  </Link>
                </div>
              )}
            </div>

            {/* Inventory Widget (Phase 2 - Conditional) */}
            {featureFlags.inventory_management && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <Package className="h-6 w-6 text-red-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Low Stock</h3>
                  </div>
                </div>
                
                {inventoryLoading ? (
                  <div className="flex items-center justify-center h-24">
                    <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
                  </div>
                ) : inventoryError ? (
                  <div className="text-sm text-red-600 p-4 bg-red-50 rounded-lg">
                    Failed to load inventory data
                  </div>
                ) : (
                  <div className="pt-4">
                    <p className="text-5xl font-bold text-red-600 mb-2">
                      {inventoryCount || 0}
                    </p>
                    <p className="text-sm text-gray-600">Items below reorder point</p>
                    {(inventoryCount || 0) > 0 && (
                      <Link
                        to="/admin/inventory"
                        className="mt-4 inline-flex items-center text-sm font-medium text-red-600 hover:text-red-700"
                      >
                        Manage inventory
                        <AlertTriangle className="ml-1 h-4 w-4" />
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Recent Activity Widget */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Activity className="h-6 w-6 text-gray-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">System Activity</h3>
                </div>
              </div>
              
              {activityLoading ? (
                <div className="flex items-center justify-center h-24">
                  <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
                </div>
              ) : activityError ? (
                <div className="text-sm text-red-600 p-4 bg-red-50 rounded-lg">
                  Failed to load activity data
                </div>
              ) : (
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {activityData && activityData.length > 0 ? (
                    activityData.slice(0, 5).map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
                        <Clock className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 truncate">{activity.action}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{formatDate(activity.created_at)}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Link
                to="/admin/quotes?status=requested"
                className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-lg text-black font-semibold hover:from-yellow-500 hover:to-yellow-600 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <FileText className="h-5 w-5" />
                Finalize Quotes
              </Link>
              <Link
                to="/admin/calendar"
                className="flex items-center gap-3 px-6 py-4 bg-white border-2 border-black rounded-lg text-black font-semibold hover:bg-gray-50 transition-colors"
              >
                <Calendar className="h-5 w-5" />
                Manage Calendar
              </Link>
              <Link
                to="/admin/orders?payment_status=partial"
                className="flex items-center gap-3 px-6 py-4 bg-white border-2 border-black rounded-lg text-black font-semibold hover:bg-gray-50 transition-colors"
              >
                <DollarSign className="h-5 w-5" />
                Review Payments
              </Link>
            </div>
          </div>

          {/* Pending Quotes Table */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Quotes Requiring Finalization</h3>
              <Link
                to="/admin/quotes"
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                View all →
              </Link>
            </div>
            
            {quotesLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
              </div>
            ) : quotesError ? (
              <div className="text-sm text-red-600 p-4 bg-red-50 rounded-lg">
                Failed to load pending quotes
              </div>
            ) : quotesData?.pending_quotes_list && quotesData.pending_quotes_list.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Service
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estimate
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {quotesData.pending_quotes_list.map((quote) => (
                      <tr key={quote.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {quote.customer_name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {quote.service_name}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(quote.status)}`}>
                            {quote.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {quote.estimate_subtotal !== null ? formatCurrency(quote.estimate_subtotal) : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {formatDate(quote.created_at)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm">
                          <Link
                            to={`/admin/quotes?edit_id=${quote.id}`}
                            className="text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Finalize
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <p className="text-gray-500">No quotes requiring finalization</p>
              </div>
            )}
          </div>

          {/* Recent Payments Table */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Payments</h3>
              <Link
                to="/admin/orders"
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                View all →
              </Link>
            </div>
            
            {paymentsLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
              </div>
            ) : paymentsError ? (
              <div className="text-sm text-red-600 p-4 bg-red-50 rounded-lg">
                Failed to load payments data
              </div>
            ) : paymentsData && paymentsData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Order
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Method
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paymentsData.slice(0, 5).map((payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                          {payment.order_number}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 font-semibold">
                          {formatCurrency(payment.amount)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {payment.method.replace('_', ' ')}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                            {payment.status === 'COMPLETED' && <CheckCircle className="mr-1 h-3 w-3" />}
                            {payment.status === 'FAILED' && <XCircle className="mr-1 h-3 w-3" />}
                            {payment.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {formatDate(payment.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No recent payments</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_AdminDashboard;