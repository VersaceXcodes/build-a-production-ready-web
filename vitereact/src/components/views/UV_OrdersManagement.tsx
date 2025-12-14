import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// ============================================================================
// TYPE DEFINITIONS
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
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  deposit_pct: number;
  deposit_amount: number;
  balance_due: number;
  revision_count: number;
  created_at: string;
  updated_at: string;
  // Joined data
  customer_name?: string;
  customer_email?: string;
  service_name?: string;
  tier_name?: string;
  staff_name?: string;
}

interface Payment {
  id: string;
  order_id: string;
  amount: number;
  method: 'CREDIT_CARD' | 'DEBIT_CARD' | 'BANK_TRANSFER' | 'CASH' | 'CHECK';
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  transaction_ref: string | null;
  receipt_url: string | null;
  created_at: string;
  updated_at: string;
}

interface StaffMember {
  id: string;
  user_id: string;
  user_name: string;
  department: string | null;
}

interface TierPackage {
  id: string;
  name: string;
  slug: string;
}

interface OrderFilters {
  status: string | null;
  assigned_staff: string | null;
  tier: string | null;
  payment_status: string | null;
}

interface RefundForm {
  payment_id: string | null;
  amount: number | null;
  reason: string | null;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchOrders = async (token: string, filters: OrderFilters, limit: number = 20, offset: number = 0) => {
  const params: any = {
    limit,
    offset,
    sort_by: 'created_at',
    sort_order: 'desc',
  };

  if (filters.status) params.status = filters.status;
  if (filters.assigned_staff) params.assigned_staff_id = filters.assigned_staff;
  if (filters.tier) params.tier_id = filters.tier;
  // Note: payment_status filtering would require custom backend logic

  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/orders`,
    {
      headers: { Authorization: `Bearer ${token}` },
      params,
    }
  );

  return response.data.orders || [];
};

const fetchOrderDetail = async (token: string, orderId: string) => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/orders/${orderId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  return response.data;
};

const fetchOrderPayments = async (token: string, orderId: string) => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/payments`,
    {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        order_id: orderId,
        sort_by: 'created_at',
        sort_order: 'desc',
      },
    }
  );

  return response.data.payments || [];
};

const fetchStaffList = async (token: string) => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/users`,
    {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        role: 'STAFF',
        status: 'ACTIVE',
        limit: 100,
      },
    }
  );

  return response.data.users.map((user: any) => ({
    id: user.staff_profile?.id || user.id,
    user_id: user.id,
    user_name: user.name,
    department: user.staff_profile?.department || null,
  }));
};

const fetchTierPackages = async (token: string) => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/tier-packages`,
    {
      headers: { Authorization: `Bearer ${token}` },
      params: { is_active: true },
    }
  );

  return response.data.tiers.map((tier: any) => ({
    id: tier.id,
    name: tier.name,
    slug: tier.slug,
  }));
};

const updateOrderAssignment = async (token: string, orderId: string, staffId: string | null) => {
  const response = await axios.put(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/orders/${orderId}`,
    { assigned_staff_id: staffId },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  return response.data;
};

const updateOrderStatus = async (token: string, orderId: string, status: string) => {
  const response = await axios.put(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/orders/${orderId}`,
    { status },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  return response.data;
};

const processRefund = async (token: string, paymentId: string, amount: number, reason: string) => {
  const response = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/payments/${paymentId}/refund`,
    { amount, reason },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  return response.data;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_OrdersManagement: React.FC = () => {
  // Global state
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const currentUser = useAppStore(state => state.authentication_state.current_user);

  // URL params for filters
  const [searchParams, setSearchParams] = useSearchParams();

  // Local state
  const [orderFilters, setOrderFilters] = useState<OrderFilters>({
    status: searchParams.get('status'),
    assigned_staff: searchParams.get('assigned_staff'),
    tier: searchParams.get('tier'),
    payment_status: searchParams.get('payment_status'),
  });

  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundForm, setRefundForm] = useState<RefundForm>({
    payment_id: null,
    amount: null,
    reason: null,
  });
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'payments' | 'audit'>('overview');

  const queryClient = useQueryClient();

  // Sync filters with URL params
  useEffect(() => {
    const newParams: any = {};
    if (orderFilters.status) newParams.status = orderFilters.status;
    if (orderFilters.assigned_staff) newParams.assigned_staff = orderFilters.assigned_staff;
    if (orderFilters.tier) newParams.tier = orderFilters.tier;
    if (orderFilters.payment_status) newParams.payment_status = orderFilters.payment_status;
    setSearchParams(newParams);
  }, [orderFilters, setSearchParams]);

  // Queries
  const { data: orders = [], isLoading: isLoadingOrders } = useQuery({
    queryKey: ['orders', orderFilters],
    queryFn: () => fetchOrders(authToken!, orderFilters),
    enabled: !!authToken,
    staleTime: 30000,
  });

  const { data: staffList = [] } = useQuery({
    queryKey: ['staff-list'],
    queryFn: () => fetchStaffList(authToken!),
    enabled: !!authToken,
    staleTime: 300000, // 5 minutes
  });

  const { data: tierPackages = [] } = useQuery({
    queryKey: ['tier-packages'],
    queryFn: () => fetchTierPackages(authToken!),
    enabled: !!authToken,
    staleTime: 300000, // 5 minutes
  });

  const { data: orderPayments = [] } = useQuery({
    queryKey: ['order-payments', selectedOrder?.id],
    queryFn: () => fetchOrderPayments(authToken!, selectedOrder!.id),
    enabled: !!authToken && !!selectedOrder?.id,
    staleTime: 10000,
  });

  // Mutations
  const assignmentMutation = useMutation({
    mutationFn: ({ orderId, staffId }: { orderId: string; staffId: string | null }) =>
      updateOrderAssignment(authToken!, orderId, staffId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setNotification({ type: 'success', message: 'Order assigned successfully' });
      setTimeout(() => setNotification(null), 3000);
    },
    onError: (error: any) => {
      setNotification({ 
        type: 'error', 
        message: error.response?.data?.message || 'Failed to assign order' 
      });
      setTimeout(() => setNotification(null), 3000);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: string }) =>
      updateOrderStatus(authToken!, orderId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setNotification({ type: 'success', message: 'Order status updated successfully' });
      setTimeout(() => setNotification(null), 3000);
    },
    onError: (error: any) => {
      setNotification({ 
        type: 'error', 
        message: error.response?.data?.message || 'Failed to update order status' 
      });
      setTimeout(() => setNotification(null), 3000);
    },
  });

  const refundMutation = useMutation({
    mutationFn: () =>
      processRefund(authToken!, refundForm.payment_id!, refundForm.amount!, refundForm.reason!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-payments'] });
      setIsRefundModalOpen(false);
      setRefundForm({ payment_id: null, amount: null, reason: null });
      setNotification({ type: 'success', message: 'Refund processed successfully' });
      setTimeout(() => setNotification(null), 3000);
    },
    onError: (error: any) => {
      setNotification({ 
        type: 'error', 
        message: error.response?.data?.message || 'Failed to process refund' 
      });
      setTimeout(() => setNotification(null), 3000);
    },
  });

  // Handlers
  const handleFilterChange = (key: keyof OrderFilters, value: string | null) => {
    setOrderFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setOrderFilters({
      status: null,
      assigned_staff: null,
      tier: null,
      payment_status: null,
    });
  };

  const handleOrderClick = async (order: Order) => {
    setSelectedOrder(order);
    setIsDetailModalOpen(true);
    setActiveTab('overview');
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedOrder(null);
  };

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrders(prev =>
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  const handleSelectAllOrders = () => {
    if (selectedOrders.length === orders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(orders.map((o: Order) => o.id));
    }
  };

  const handleBulkAssign = async (staffId: string | null) => {
    if (selectedOrders.length === 0) return;
    
    try {
      await Promise.all(
        selectedOrders.map(orderId => 
          assignmentMutation.mutateAsync({ orderId, staffId })
        )
      );
      setSelectedOrders([]);
    } catch (error) {
      // Errors handled in mutation
    }
  };

  const handleBulkStatusUpdate = async (status: string) => {
    if (selectedOrders.length === 0) return;
    
    try {
      await Promise.all(
        selectedOrders.map(orderId => 
          statusMutation.mutateAsync({ orderId, status })
        )
      );
      setSelectedOrders([]);
    } catch (error) {
      // Errors handled in mutation
    }
  };

  const handleOpenRefundModal = (payment: Payment) => {
    setRefundForm({
      payment_id: payment.id,
      amount: Number(payment.amount),
      reason: null,
    });
    setIsRefundModalOpen(true);
  };

  const handleProcessRefund = () => {
    if (refundForm.payment_id && refundForm.amount && refundForm.reason) {
      refundMutation.mutate();
    }
  };

  // Status badge styling
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      QUOTE_REQUESTED: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      QUOTE_APPROVED: 'bg-blue-100 text-blue-800 border-blue-300',
      IN_PRODUCTION: 'bg-purple-100 text-purple-800 border-purple-300',
      PROOF_SENT: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      REVISION_REQUESTED: 'bg-orange-100 text-orange-800 border-orange-300',
      COMPLETED: 'bg-green-100 text-green-800 border-green-300',
      CANCELLED: 'bg-gray-100 text-gray-800 border-gray-300',
    };

    return styles[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getPaymentStatusBadge = (order: Order) => {
    const paid = Number(order.total_amount || 0) - Number(order.balance_due || 0);
    const total = Number(order.total_amount || 0);
    
    if (paid >= total) {
      return 'bg-green-100 text-green-800 border-green-300';
    } else if (paid > 0) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    } else {
      return 'bg-red-100 text-red-800 border-red-300';
    }
  };

  const getPaymentStatusText = (order: Order) => {
    const paid = Number(order.total_amount || 0) - Number(order.balance_due || 0);
    const total = Number(order.total_amount || 0);
    
    if (paid >= total) return 'Paid';
    if (paid > 0) return 'Partial';
    return 'Unpaid';
  };

  // Render
  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Notification */}
        {notification && (
          <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg ${
            notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}>
            {notification.message}
          </div>
        )}

        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Status
                </label>
                <select
                  value={orderFilters.status || ''}
                  onChange={(e) => handleFilterChange('status', e.target.value || null)}
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 transition-all"
                >
                  <option value="">All Statuses</option>
                  <option value="QUOTE_REQUESTED">Quote Requested</option>
                  <option value="QUOTE_APPROVED">Quote Approved</option>
                  <option value="IN_PRODUCTION">In Production</option>
                  <option value="PROOF_SENT">Proof Sent</option>
                  <option value="REVISION_REQUESTED">Revision Requested</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              {/* Staff Filter */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Assigned Staff
                </label>
                <select
                  value={orderFilters.assigned_staff || ''}
                  onChange={(e) => handleFilterChange('assigned_staff', e.target.value || null)}
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 transition-all"
                >
                  <option value="">All Staff</option>
                  <option value="unassigned">Unassigned</option>
                  {staffList.map((staff: StaffMember) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.user_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tier Filter */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Service Tier
                </label>
                <select
                  value={orderFilters.tier || ''}
                  onChange={(e) => handleFilterChange('tier', e.target.value || null)}
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 transition-all"
                >
                  <option value="">All Tiers</option>
                  {tierPackages.map((tier: TierPackage) => (
                    <option key={tier.id} value={tier.id}>
                      {tier.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Status Filter */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Payment Status
                </label>
                <select
                  value={orderFilters.payment_status || ''}
                  onChange={(e) => handleFilterChange('payment_status', e.target.value || null)}
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 transition-all"
                >
                  <option value="">All Payments</option>
                  <option value="paid">Paid</option>
                  <option value="partial">Partial</option>
                  <option value="unpaid">Unpaid</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedOrders.length > 0 && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-900">
                {selectedOrders.length} order{selectedOrders.length !== 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-3">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleBulkAssign(e.target.value === 'unassign' ? null : e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="px-4 py-2 text-sm rounded-lg border border-gray-300 bg-white"
                >
                  <option value="">Assign to Staff...</option>
                  <option value="unassign">Unassign</option>
                  {staffList.map((staff: StaffMember) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.user_name}
                    </option>
                  ))}
                </select>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleBulkStatusUpdate(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="px-4 py-2 text-sm rounded-lg border border-gray-300 bg-white"
                >
                  <option value="">Update Status...</option>
                  <option value="IN_PRODUCTION">In Production</option>
                  <option value="PROOF_SENT">Proof Sent</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Orders Table */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {isLoadingOrders ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-yellow-400"></div>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No orders found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="w-12 px-6 py-3">
                        <input
                          type="checkbox"
                          checked={selectedOrders.length === orders.length}
                          onChange={handleSelectAllOrders}
                          className="h-4 w-4 rounded border-gray-300 text-yellow-400 focus:ring-yellow-400"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                        Order #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                        Service
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                        Tier
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                        Staff
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                        Due Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                        Payment
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {orders.map((order: Order) => (
                      <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedOrders.includes(order.id)}
                            onChange={() => handleSelectOrder(order.id)}
                            className="h-4 w-4 rounded border-gray-300 text-yellow-400 focus:ring-yellow-400"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-semibold text-gray-900">
                            {order.order_number}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{order.customer_name || 'N/A'}</div>
                          <div className="text-xs text-gray-500">{order.customer_email || ''}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {order.service_name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {order.tier_name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {order.staff_name || 'Unassigned'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusBadge(order.status)}`}>
                            {order.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {order.due_at ? new Date(order.due_at).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getPaymentStatusBadge(order)}`}>
                            {getPaymentStatusText(order)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => handleOrderClick(order)}
                            className="text-yellow-600 hover:text-yellow-800 font-medium"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Order Detail Modal */}
        {isDetailModalOpen && selectedOrder && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              {/* Backdrop */}
              <div
                className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
                onClick={handleCloseDetailModal}
              ></div>

              {/* Modal */}
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
                {/* Header */}
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-900">
                      Order {selectedOrder.order_number}
                    </h3>
                    <button
                      onClick={handleCloseDetailModal}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200">
                  <nav className="flex space-x-8 px-6" aria-label="Tabs">
                    <button
                      onClick={() => setActiveTab('overview')}
                      className={`py-4 px-1 border-b-2 font-semibold text-sm ${
                        activeTab === 'overview'
                          ? 'border-yellow-400 text-gray-900'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Overview
                    </button>
                    <button
                      onClick={() => setActiveTab('payments')}
                      className={`py-4 px-1 border-b-2 font-semibold text-sm ${
                        activeTab === 'payments'
                          ? 'border-yellow-400 text-gray-900'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Payment History
                    </button>
                    <button
                      onClick={() => setActiveTab('audit')}
                      className={`py-4 px-1 border-b-2 font-semibold text-sm ${
                        activeTab === 'audit'
                          ? 'border-yellow-400 text-gray-900'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Audit Log
                    </button>
                  </nav>
                </div>

                {/* Tab Content */}
                <div className="px-6 py-6 max-h-96 overflow-y-auto">
                  {activeTab === 'overview' && (
                    <div className="space-y-6">
                      {/* Order Info */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-900 mb-1">
                            Status
                          </label>
                          <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full border ${getStatusBadge(selectedOrder.status)}`}>
                            {selectedOrder.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-900 mb-1">
                            Due Date
                          </label>
                          <p className="text-sm text-gray-900">
                            {selectedOrder.due_at ? new Date(selectedOrder.due_at).toLocaleDateString() : 'Not set'}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-900 mb-1">
                            Total Amount
                          </label>
                          <p className="text-sm text-gray-900">
                            €{Number(selectedOrder.total_amount || 0).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-900 mb-1">
                            Balance Due
                          </label>
                          <p className="text-sm text-gray-900">
                            €{Number(selectedOrder.balance_due || 0).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {/* Admin Controls */}
                      <div className="border-t pt-6">
                        <h4 className="text-lg font-bold text-gray-900 mb-4">Admin Controls</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">
                              Assign to Staff
                            </label>
                            <select
                              value={selectedOrder.assigned_staff_id || ''}
                              onChange={(e) => assignmentMutation.mutate({ 
                                orderId: selectedOrder.id, 
                                staffId: e.target.value || null 
                              })}
                              className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-yellow-400"
                            >
                              <option value="">Unassigned</option>
                              {staffList.map((staff: StaffMember) => (
                                <option key={staff.id} value={staff.id}>
                                  {staff.user_name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">
                              Update Status
                            </label>
                            <select
                              value={selectedOrder.status}
                              onChange={(e) => statusMutation.mutate({ 
                                orderId: selectedOrder.id, 
                                status: e.target.value 
                              })}
                              className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-yellow-400"
                            >
                              <option value="QUOTE_REQUESTED">Quote Requested</option>
                              <option value="QUOTE_APPROVED">Quote Approved</option>
                              <option value="IN_PRODUCTION">In Production</option>
                              <option value="PROOF_SENT">Proof Sent</option>
                              <option value="REVISION_REQUESTED">Revision Requested</option>
                              <option value="COMPLETED">Completed</option>
                              <option value="CANCELLED">Cancelled</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'payments' && (
                    <div className="space-y-4">
                      {orderPayments.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No payments found</p>
                      ) : (
                        orderPayments.map((payment: Payment) => (
                          <div key={payment.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-semibold text-gray-900">
                                  €{Number(payment.amount || 0).toFixed(2)} - {payment.method.replace(/_/g, ' ')}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {new Date(payment.created_at).toLocaleString()}
                                </p>
                                <span className={`inline-block mt-2 px-2 py-1 text-xs font-semibold rounded-full ${
                                  payment.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                  payment.status === 'REFUNDED' ? 'bg-red-100 text-red-800' :
                                  payment.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {payment.status}
                                </span>
                              </div>
                              {payment.status === 'COMPLETED' && (
                                <button
                                  onClick={() => handleOpenRefundModal(payment)}
                                  className="px-4 py-2 text-sm font-medium text-red-700 hover:text-red-900"
                                >
                                  Process Refund
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {activeTab === 'audit' && (
                    <div className="text-center py-8">
                      <p className="text-gray-500">Audit log coming soon</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Refund Modal */}
        {isRefundModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              {/* Backdrop */}
              <div
                className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
                onClick={() => setIsRefundModalOpen(false)}
              ></div>

              {/* Modal */}
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                {/* Header */}
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <h3 className="text-xl font-bold text-gray-900">Process Refund</h3>
                </div>

                {/* Form */}
                <div className="px-6 py-6 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Refund Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={refundForm.amount || ''}
                      onChange={(e) => setRefundForm(prev => ({ 
                        ...prev, 
                        amount: e.target.value ? parseFloat(e.target.value) : null 
                      }))}
                      className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Reason for Refund
                    </label>
                    <textarea
                      value={refundForm.reason || ''}
                      onChange={(e) => setRefundForm(prev => ({ ...prev, reason: e.target.value || null }))}
                      rows={4}
                      className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100"
                      placeholder="Explain the reason for this refund..."
                    ></textarea>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
                  <button
                    onClick={() => setIsRefundModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleProcessRefund}
                    disabled={!refundForm.amount || !refundForm.reason || refundMutation.isPending}
                    className="px-6 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {refundMutation.isPending ? 'Processing...' : 'Process Refund'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default UV_OrdersManagement;