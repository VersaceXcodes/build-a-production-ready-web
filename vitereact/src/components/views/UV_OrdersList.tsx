import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface Order {
  id: string;
  order_number: string;
  quote_id: string;
  customer_id: string;
  service_id: string;
  tier_id: string;
  assigned_staff_id: string | null;
  status: 'QUOTE_REQUESTED' | 'QUOTE_APPROVED' | 'IN_PRODUCTION' | 'PROOF_SENT' | 'REVISION_REQUESTED' | 'COMPLETED' | 'CANCELLED';
  due_at: string | null;
  subtotal: string | number;
  tax_rate: string | number;
  tax_amount: string | number;
  total_amount: string | number;
  deposit_pct: string | number;
  deposit_amount: string | number;
  balance_due: string | number;
  revision_count: number;
  created_at: string;
  updated_at: string;
}

interface Service {
  id: string;
  name: string;
  slug: string;
  category_id: string;
  description: string;
  is_active: boolean;
}

interface TierPackage {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  revision_limit: number;
  turnaround_days: number;
  is_active: boolean;
}

interface OrdersResponse {
  orders: Order[];
  total: number;
}

interface ServicesResponse {
  services: Service[];
  total?: number;
}

interface TiersResponse {
  tiers: TierPackage[];
  total?: number;
}

// ============================================================================
// STATUS FILTER CONFIGURATION
// ============================================================================

const STATUS_FILTERS = [
  { label: 'All', value: null },
  { label: 'Awaiting Deposit', value: 'awaiting_deposit' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Awaiting Approval', value: 'awaiting_approval' },
  { label: 'Ready', value: 'ready' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getStatusBadgeStyles = (status: string): string => {
  switch (status) {
    case 'QUOTE_REQUESTED':
    case 'QUOTE_APPROVED':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'IN_PRODUCTION':
    case 'REVISION_REQUESTED':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'PROOF_SENT':
      return 'bg-purple-100 text-purple-800 border-purple-300';
    case 'COMPLETED':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800 border-red-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

const getStatusDisplayName = (status: string): string => {
  switch (status) {
    case 'QUOTE_REQUESTED':
      return 'Quote Requested';
    case 'QUOTE_APPROVED':
      return 'Quote Approved';
    case 'IN_PRODUCTION':
      return 'In Production';
    case 'PROOF_SENT':
      return 'Proof Sent';
    case 'REVISION_REQUESTED':
      return 'Revision Requested';
    case 'COMPLETED':
      return 'Completed';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return status;
  }
};

const formatDate = (dateString: string | null): string => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-IE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
};

const formatCurrency = (amount: string | number): string => {
  const numAmount = Number(amount || 0);
  return `€${numAmount.toFixed(2)}`;
};

// Filter orders based on UI filter selection
const filterOrdersByStatus = (orders: Order[], filterValue: string | null): Order[] => {
  if (!filterValue) return orders;

  return orders.filter((order) => {
    const balanceDue = Number(order.balance_due || 0);

    switch (filterValue) {
      case 'awaiting_deposit':
        return order.status === 'QUOTE_APPROVED' && balanceDue > 0;
      case 'in_progress':
        return ['IN_PRODUCTION', 'REVISION_REQUESTED'].includes(order.status);
      case 'awaiting_approval':
        return order.status === 'PROOF_SENT';
      case 'ready':
        return order.status === 'QUOTE_APPROVED' && balanceDue === 0;
      case 'completed':
        return order.status === 'COMPLETED';
      case 'cancelled':
        return order.status === 'CANCELLED';
      default:
        return true;
    }
  });
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_OrdersList: React.FC = () => {
  // =========================================================================
  // STATE & HOOKS - Individual Zustand selectors (CRITICAL)
  // =========================================================================
  
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // CRITICAL: Individual selectors, NO object destructuring
  const currentUser = useAppStore((state) => state.authentication_state.current_user);
  const authToken = useAppStore((state) => state.authentication_state.auth_token);

  // Local notification state (no native alerts)
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Get filter from URL params
  const filterStatus = searchParams.get('status') || null;
  const filterDateRange = searchParams.get('date_range') || null;

  // =========================================================================
  // API QUERIES
  // =========================================================================

  // Fetch orders
  const {
    data: ordersData,
    isLoading: isLoadingOrders,
    error: ordersError,
    refetch: refetchOrders,
  } = useQuery<OrdersResponse>({
    queryKey: ['orders', currentUser?.id, filterStatus, filterDateRange],
    queryFn: async () => {
      if (!currentUser?.id) {
        throw new Error('User not authenticated');
      }

      const params: Record<string, string> = {
        customer_id: currentUser.id,
        limit: '50',
        offset: '0',
        sort_by: 'created_at',
        sort_order: 'desc',
      };

      const response = await axios.get<OrdersResponse>(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/orders`,
        {
          params,
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      return response.data;
    },
    enabled: !!currentUser?.id && !!authToken,
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Fetch services for name lookup
  const { data: servicesData } = useQuery<ServicesResponse>({
    queryKey: ['services'],
    queryFn: async () => {
      const response = await axios.get<ServicesResponse>(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/services`,
        {
          params: {
            is_active: true,
            limit: 100,
          },
        }
      );
      return response.data;
    },
    staleTime: 300000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Fetch tiers for name lookup
  const { data: tiersData } = useQuery<TiersResponse>({
    queryKey: ['tier-packages'],
    queryFn: async () => {
      const response = await axios.get<TiersResponse>(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/tier-packages`,
        {
          params: {
            is_active: true,
          },
        }
      );
      return response.data;
    },
    staleTime: 300000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // =========================================================================
  // DATA TRANSFORMATION
  // =========================================================================

  // Build lookup maps for service and tier names
  const serviceNamesMap: Record<string, string> = React.useMemo(() => {
    if (!servicesData?.services) return {};
    return servicesData.services.reduce((acc, service) => {
      acc[service.id] = service.name;
      return acc;
    }, {} as Record<string, string>);
  }, [servicesData]);

  const tierNamesMap: Record<string, string> = React.useMemo(() => {
    if (!tiersData?.tiers) return {};
    return tiersData.tiers.reduce((acc, tier) => {
      acc[tier.id] = tier.name;
      return acc;
    }, {} as Record<string, string>);
  }, [tiersData]);

  // Convert orders with numeric fields properly (PostgreSQL NUMERIC returns strings)
  const normalizedOrders = React.useMemo(() => {
    if (!ordersData?.orders) return [];
    
    return ordersData.orders.map((order) => ({
      ...order,
      subtotal: Number(order.subtotal || 0),
      tax_rate: Number(order.tax_rate || 0),
      tax_amount: Number(order.tax_amount || 0),
      total_amount: Number(order.total_amount || 0),
      deposit_pct: Number(order.deposit_pct || 0),
      deposit_amount: Number(order.deposit_amount || 0),
      balance_due: Number(order.balance_due || 0),
    }));
  }, [ordersData]);

  // Apply client-side filtering
  const filteredOrders = React.useMemo(() => {
    return filterOrdersByStatus(normalizedOrders, filterStatus);
  }, [normalizedOrders, filterStatus]);

  // =========================================================================
  // EVENT HANDLERS
  // =========================================================================

  const handleFilterChange = (newFilterValue: string | null) => {
    const newParams = new URLSearchParams(searchParams);
    
    if (newFilterValue) {
      newParams.set('status', newFilterValue);
    } else {
      newParams.delete('status');
    }
    
    setSearchParams(newParams);
  };

  const handleRetry = () => {
    setNotification(null);
    refetchOrders();
  };

  // Auto-dismiss notifications
  React.useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header Section */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">My Orders</h1>
            
            {/* Status Filter Chips */}
            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map((filter) => (
                <button
                  key={filter.value || 'all'}
                  onClick={() => handleFilterChange(filter.value)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    filterStatus === filter.value
                      ? 'bg-black text-white shadow-md'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Notification Banner */}
        {notification && (
          <div
            className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-xl ${
              notification.type === 'success'
                ? 'bg-green-600 text-white'
                : 'bg-red-600 text-white'
            }`}
            role="alert"
            aria-live="polite"
          >
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              <p className="font-medium">{notification.message}</p>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Loading State */}
          {isLoadingOrders && (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-black"></div>
                <p className="text-gray-600 font-medium">Loading your orders...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {ordersError && !isLoadingOrders && (
            <div className="max-w-md mx-auto mt-12">
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-8 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-red-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Failed to Load Orders
                </h3>
                <p className="text-gray-600 mb-6">
                  {ordersError instanceof Error
                    ? ordersError.message
                    : 'An error occurred while loading your orders.'}
                </p>
                <button
                  onClick={handleRetry}
                  className="bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!isLoadingOrders && !ordersError && filteredOrders.length === 0 && (
            <div className="max-w-md mx-auto mt-12">
              <div className="bg-white border-2 border-gray-200 rounded-xl p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {filterStatus ? 'No Orders Found' : 'No Orders Yet'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {filterStatus
                    ? 'No orders match the selected filter. Try a different filter or view all orders.'
                    : 'Start by requesting a quote for your first project!'}
                </p>
                {!filterStatus && (
                  <Link
                    to="/app/quotes/new"
                    className="inline-block bg-yellow-400 text-black px-6 py-3 rounded-lg font-bold hover:bg-yellow-500 transition-colors"
                  >
                    Create Your First Quote
                  </Link>
                )}
                {filterStatus && (
                  <button
                    onClick={() => handleFilterChange(null)}
                    className="bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
                  >
                    View All Orders
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Orders Grid */}
          {!isLoadingOrders && !ordersError && filteredOrders.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredOrders.map((order) => {
                const serviceName = serviceNamesMap[order.service_id] || 'Unknown Service';
                const tierName = tierNamesMap[order.tier_id] || 'Unknown Tier';
                const balanceDue = Number(order.balance_due || 0);
                const hasOutstandingBalance = balanceDue > 0;

                return (
                  <div
                    key={order.id}
                    className={`bg-white rounded-xl shadow-lg border overflow-hidden transition-all duration-200 hover:shadow-xl ${
                      hasOutstandingBalance ? 'border-red-300' : 'border-gray-200'
                    }`}
                  >
                    {/* Card Header */}
                    <div className={`px-6 py-4 border-b ${
                      hasOutstandingBalance ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-600 mb-1">
                            Order Number
                          </p>
                          <p className="text-lg font-bold text-gray-900 truncate">
                            #{order.order_number}
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadgeStyles(
                            order.status
                          )}`}
                        >
                          {getStatusDisplayName(order.status)}
                        </span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="px-6 py-5 space-y-4">
                      {/* Service & Tier */}
                      <div>
                        <p className="text-base font-bold text-gray-900 mb-2">
                          {serviceName}
                        </p>
                        <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-gray-100 text-gray-800 border border-gray-300">
                          {tierName} Tier
                        </span>
                      </div>

                      {/* Dates */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600 mb-1">Created</p>
                          <p className="font-semibold text-gray-900">
                            {formatDate(order.created_at)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600 mb-1">Due Date</p>
                          <p className="font-semibold text-gray-900">
                            {formatDate(order.due_at)}
                          </p>
                        </div>
                      </div>

                      {/* Financial Summary */}
                      <div className="border-t border-gray-200 pt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Total Amount:</span>
                          <span className="font-semibold text-gray-900">
                            {formatCurrency(order.total_amount)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Deposit Paid:</span>
                          <span className="font-semibold text-gray-900">
                            {formatCurrency(order.deposit_amount)}
                          </span>
                        </div>
                        
                        {/* Outstanding Balance - Prominently Displayed */}
                        {hasOutstandingBalance && (
                          <div className="flex justify-between items-center bg-red-50 -mx-6 px-6 py-3 border-t border-red-200">
                            <span className="font-bold text-red-900">
                              Balance Due:
                            </span>
                            <span className="text-xl font-bold text-red-600">
                              {formatCurrency(balanceDue)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                      <Link
                        to={`/app/orders/${order.id}`}
                        className="block w-full bg-black text-white text-center px-4 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default UV_OrdersList;