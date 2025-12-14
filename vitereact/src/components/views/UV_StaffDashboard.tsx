import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface JobSummary {
  total_assigned: number;
  in_design: number;
  awaiting_approval: number;
  in_production: number;
  completed_today: number;
}

interface TodayBooking {
  id: string;
  start_at: string;
  end_at: string;
  customer_name: string;
  service_name: string;
  is_emergency: boolean;
  order_id: string | null;
}

interface PendingActions {
  proofs_to_upload: number;
  overdue_jobs: number;
  unread_messages: number;
}

interface Order {
  id: string;
  order_number: string;
  assigned_staff_id: string | null;
  status: string;
  due_at: string | null;
  created_at: string;
  updated_at: string;
}

interface Booking {
  id: string;
  start_at: string;
  end_at: string;
  is_emergency: boolean;
  order_id: string | null;
  status: string;
  customer_id: string;
}

interface OrdersResponse {
  orders: Order[];
  total: number;
}

interface BookingsResponse {
  bookings: Booking[];
  total: number;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchStaffOrders = async (staffId: string, authToken: string): Promise<Order[]> => {
  const response = await axios.get<OrdersResponse>(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/orders`,
    {
      params: {
        assigned_staff_id: staffId,
        limit: 50,
      },
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    }
  );
  return response.data.orders;
};

const fetchTodaysBookings = async (authToken: string): Promise<Booking[]> => {
  const today = new Date().toISOString().split('T')[0];
  const response = await axios.get<BookingsResponse>(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/bookings`,
    {
      params: {
        start_date: today,
        end_date: today,
        status: 'CONFIRMED',
      },
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    }
  );
  return response.data.bookings;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_StaffDashboard: React.FC = () => {
  // CRITICAL: Individual Zustand selectors to avoid infinite loops
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const unreadMessagesCount = useAppStore(state => state.notification_state.unread_counts.messages);

  const currentStaffId = currentUser?.id || '';

  // ============================================================================
  // DATA FETCHING WITH REACT QUERY
  // ============================================================================

  const {
    data: orders = [],
    isLoading: isLoadingOrders,
    error: ordersError,
    refetch: refetchOrders,
  } = useQuery({
    queryKey: ['staff-orders', currentStaffId],
    queryFn: () => fetchStaffOrders(currentStaffId, authToken || ''),
    enabled: !!currentStaffId && !!authToken,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });

  const {
    data: bookings = [],
    isLoading: isLoadingBookings,
    error: bookingsError,
    refetch: refetchBookings,
  } = useQuery({
    queryKey: ['todays-bookings'],
    queryFn: () => fetchTodaysBookings(authToken || ''),
    enabled: !!authToken,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  // ============================================================================
  // DATA TRANSFORMATION & AGGREGATION
  // ============================================================================

  const isLoading = isLoadingOrders || isLoadingBookings;

  // Calculate job summary from orders
  const jobSummary: JobSummary = React.useMemo(() => {
    if (!orders.length) {
      return {
        total_assigned: 0,
        in_design: 0,
        awaiting_approval: 0,
        in_production: 0,
        completed_today: 0,
      };
    }

    const today = new Date().toISOString().split('T')[0];

    return {
      total_assigned: orders.length,
      in_design: orders.filter(o => o.status === 'IN_PRODUCTION').length,
      awaiting_approval: orders.filter(o => o.status === 'PROOF_SENT').length,
      in_production: orders.filter(o => o.status === 'IN_PRODUCTION').length,
      completed_today: orders.filter(
        o => o.status === 'COMPLETED' && o.updated_at.startsWith(today)
      ).length,
    };
  }, [orders]);

  // Calculate pending actions
  const pendingActions: PendingActions = React.useMemo(() => {
    const now = new Date();

    return {
      proofs_to_upload: orders.filter(o => o.status === 'IN_PRODUCTION').length,
      overdue_jobs: orders.filter(o => {
        if (!o.due_at) return false;
        const dueDate = new Date(o.due_at);
        return dueDate < now && o.status !== 'COMPLETED' && o.status !== 'CANCELLED';
      }).length,
      unread_messages: unreadMessagesCount,
    };
  }, [orders, unreadMessagesCount]);

  // Transform bookings to display format
  const todaysBookings: TodayBooking[] = React.useMemo(() => {
    return bookings.map(booking => ({
      id: booking.id,
      start_at: booking.start_at,
      end_at: booking.end_at,
      customer_name: 'Customer', // Backend should provide customer name via join
      service_name: 'Service', // Backend should provide service name via join
      is_emergency: booking.is_emergency,
      order_id: booking.order_id,
    }));
  }, [bookings]);

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const formatTime = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const handleRetry = () => {
    refetchOrders();
    refetchBookings();
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome back, {currentUser?.name || 'Staff Member'}
            </h1>
            <p className="text-gray-600">Here's what's happening with your jobs today</p>
          </div>

          {/* Error State */}
          {(ordersError || bookingsError) && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-red-800 font-semibold mb-1">Error loading dashboard data</h3>
                  <p className="text-red-600 text-sm">
                    {ordersError ? 'Failed to load orders. ' : ''}
                    {bookingsError ? 'Failed to load bookings.' : ''}
                  </p>
                </div>
                <button
                  onClick={handleRetry}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Job Summary Widgets */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Job Summary</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Total Assigned Widget */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                {isLoading ? (
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
                    <div className="h-10 bg-gray-200 rounded w-16"></div>
                  </div>
                ) : (
                  <>
                    <p className="text-gray-600 text-sm font-semibold uppercase tracking-wide mb-2">
                      Total Assigned
                    </p>
                    <p className="text-4xl font-bold text-gray-900">{jobSummary.total_assigned}</p>
                  </>
                )}
              </div>

              {/* In Design Widget */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                {isLoading ? (
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
                    <div className="h-10 bg-gray-200 rounded w-16"></div>
                  </div>
                ) : (
                  <>
                    <p className="text-gray-600 text-sm font-semibold uppercase tracking-wide mb-2">
                      In Design
                    </p>
                    <p className="text-4xl font-bold text-blue-600">{jobSummary.in_design}</p>
                  </>
                )}
              </div>

              {/* Awaiting Approval Widget */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                {isLoading ? (
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
                    <div className="h-10 bg-gray-200 rounded w-16"></div>
                  </div>
                ) : (
                  <>
                    <p className="text-gray-600 text-sm font-semibold uppercase tracking-wide mb-2">
                      Awaiting Approval
                    </p>
                    <p className="text-4xl font-bold text-yellow-500">{jobSummary.awaiting_approval}</p>
                  </>
                )}
              </div>

              {/* In Production Widget */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                {isLoading ? (
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
                    <div className="h-10 bg-gray-200 rounded w-16"></div>
                  </div>
                ) : (
                  <>
                    <p className="text-gray-600 text-sm font-semibold uppercase tracking-wide mb-2">
                      In Production
                    </p>
                    <p className="text-4xl font-bold text-orange-600">{jobSummary.in_production}</p>
                  </>
                )}
              </div>

              {/* Completed Today Widget */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                {isLoading ? (
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
                    <div className="h-10 bg-gray-200 rounded w-16"></div>
                  </div>
                ) : (
                  <>
                    <p className="text-gray-600 text-sm font-semibold uppercase tracking-wide mb-2">
                      Completed Today
                    </p>
                    <p className="text-4xl font-bold text-green-600">{jobSummary.completed_today}</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Pending Actions Alert */}
          {(pendingActions.proofs_to_upload > 0 || pendingActions.overdue_jobs > 0 || pendingActions.unread_messages > 0) && (
            <div className="mb-8 bg-yellow-50 border-2 border-yellow-400 rounded-xl p-6">
              <h3 className="text-yellow-900 font-bold text-lg mb-4 flex items-center">
                <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Action Required
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {pendingActions.proofs_to_upload > 0 && (
                  <div className="flex items-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-400 text-yellow-900 font-bold mr-3">
                      {pendingActions.proofs_to_upload}
                    </span>
                    <span className="text-yellow-900 font-medium">Proofs to Upload</span>
                  </div>
                )}
                {pendingActions.overdue_jobs > 0 && (
                  <div className="flex items-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-500 text-white font-bold mr-3">
                      {pendingActions.overdue_jobs}
                    </span>
                    <span className="text-yellow-900 font-medium">Overdue Jobs</span>
                  </div>
                )}
                {pendingActions.unread_messages > 0 && (
                  <div className="flex items-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 text-white font-bold mr-3">
                      {pendingActions.unread_messages}
                    </span>
                    <span className="text-yellow-900 font-medium">Unread Messages</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Today's Bookings */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Today's Schedule</h2>
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              {isLoading ? (
                <div className="p-6">
                  <div className="animate-pulse space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex items-center space-x-4">
                        <div className="h-16 w-16 bg-gray-200 rounded"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : todaysBookings.length === 0 ? (
                <div className="p-8 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-600 font-medium">No bookings scheduled for today</p>
                  <p className="text-gray-500 text-sm mt-1">Check your calendar for upcoming appointments</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {todaysBookings.map(booking => (
                    <div
                      key={booking.id}
                      className={`p-6 hover:bg-gray-50 transition-colors ${
                        booking.is_emergency ? 'bg-red-50 border-l-4 border-red-500' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <span className="text-lg font-bold text-gray-900">
                              {formatTime(booking.start_at)} - {formatTime(booking.end_at)}
                            </span>
                            {booking.is_emergency && (
                              <span className="ml-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-500 text-white">
                                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                EMERGENCY
                              </span>
                            )}
                          </div>
                          <p className="text-gray-900 font-semibold mb-1">{booking.service_name}</p>
                          <p className="text-gray-600 text-sm">Customer: {booking.customer_name}</p>
                        </div>
                        {booking.order_id && (
                          <Link
                            to={`/staff/jobs/${booking.order_id}`}
                            className="ml-4 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium text-sm"
                          >
                            View Job
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link
              to="/staff/jobs"
              className="group bg-gradient-to-br from-black to-gray-800 rounded-xl shadow-xl p-8 hover:shadow-2xl transition-all duration-200 transform hover:scale-105"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">View Job Queue</h3>
                  <p className="text-gray-300">Manage all your assigned jobs</p>
                </div>
                <svg className="w-12 h-12 text-yellow-400 group-hover:translate-x-2 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </Link>

            <Link
              to="/staff/calendar"
              className="group bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl shadow-xl p-8 hover:shadow-2xl transition-all duration-200 transform hover:scale-105"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Check Calendar</h3>
                  <p className="text-blue-100">View your full schedule</p>
                </div>
                <svg className="w-12 h-12 text-white group-hover:translate-x-2 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </Link>
          </div>

          {/* Last Updated Footer */}
          <div className="mt-8 text-center">
            <p className="text-gray-500 text-sm">
              Last updated: {new Date().toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              })}
            </p>
            <p className="text-gray-400 text-xs mt-1">Dashboard auto-refreshes every 5 minutes</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_StaffDashboard;