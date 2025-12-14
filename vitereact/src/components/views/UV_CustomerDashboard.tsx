import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface UpcomingBooking {
  id: string;
  start_at: string;
  service_name: string;
  status: string;
  is_emergency: boolean;
}

interface DashboardSummary {
  active_orders_count: number;
  pending_quotes_count: number;
  upcoming_bookings: UpcomingBooking[];
  unread_messages_count: number;
  outstanding_balance: number;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchDashboardSummary = async (authToken: string): Promise<DashboardSummary> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/customer/dashboard-summary`,
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    }
  );
  return response.data;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_CustomerDashboard: React.FC = () => {
  const navigate = useNavigate();
  
  // CRITICAL: Individual selectors to avoid infinite loops
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);

  // Fetch dashboard data using React Query
  const {
    data: dashboardSummary,
    isLoading,
    error,
    refetch,
  } = useQuery<DashboardSummary>({
    queryKey: ['dashboard-summary'],
    queryFn: () => fetchDashboardSummary(authToken!),
    enabled: !!authToken,
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: true,
    retry: 1,
  });

  // Format date for display
  const formatBookingDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IE', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Handle refresh
  const handleRefresh = () => {
    refetch();
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header Section */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
                  Welcome back, {currentUser?.name}!
                </h1>
                <p className="mt-2 text-base md:text-lg text-gray-600 leading-relaxed">
                  Here's an overview of your projects and activities
                </p>
              </div>
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border-2 border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Refresh dashboard"
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Refreshing...
                  </span>
                ) : (
                  'Refresh'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Error State */}
          {error && (
            <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">
                    Failed to load dashboard data. Please try refreshing.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Outstanding Balance Alert */}
          {!isLoading && dashboardSummary && Number(dashboardSummary.outstanding_balance || 0) > 0 && (
            <div className="mb-6 bg-yellow-50 border-2 border-yellow-400 rounded-xl p-6 shadow-lg">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-bold text-gray-900">
                    Outstanding Balance
                  </h3>
                  <p className="mt-1 text-2xl font-bold text-yellow-600">
                    €{Number(dashboardSummary.outstanding_balance || 0).toFixed(2)}
                  </p>
                  <p className="mt-2 text-sm text-gray-700 leading-relaxed">
                    You have pending payments. Please review your orders and complete any outstanding payments.
                  </p>
                  <Link
                    to="/app/orders"
                    className="mt-4 inline-flex items-center px-6 py-3 bg-black text-white text-sm font-semibold rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-4 focus:ring-gray-200 transition-all duration-200 hover:scale-105"
                  >
                    View Orders
                    <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                to="/app/quotes/new"
                className="flex items-center justify-between p-6 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-yellow-200"
              >
                <div>
                  <h3 className="text-lg font-bold text-black">Create New Quote</h3>
                  <p className="mt-1 text-sm text-gray-800">Start a new project</p>
                </div>
                <svg className="h-8 w-8 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </Link>

              <Link
                to="/app/quotes"
                className="flex items-center justify-between p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 border-2 border-gray-200 focus:outline-none focus:ring-4 focus:ring-blue-100"
              >
                <div>
                  <h3 className="text-lg font-bold text-gray-900">View Quotes</h3>
                  <p className="mt-1 text-sm text-gray-600">Manage your quotes</p>
                </div>
                <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </Link>

              <Link
                to="/app/orders"
                className="flex items-center justify-between p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 border-2 border-gray-200 focus:outline-none focus:ring-4 focus:ring-blue-100"
              >
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Track Orders</h3>
                  <p className="mt-1 text-sm text-gray-600">Check order status</p>
                </div>
                <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex justify-center items-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-yellow-400"></div>
                <p className="text-gray-600 font-medium">Loading your dashboard...</p>
              </div>
            </div>
          )}

          {/* Dashboard Widgets */}
          {!isLoading && dashboardSummary && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Active Orders Card */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-600">Active Orders</p>
                      <p className="mt-2 text-3xl font-bold text-gray-900">
                        {dashboardSummary.active_orders_count}
                      </p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Link
                      to="/app/orders"
                      className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center transition-colors"
                    >
                      View all orders
                      <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>

                {/* Pending Quotes Card */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-600">Pending Quotes</p>
                      <p className="mt-2 text-3xl font-bold text-gray-900">
                        {dashboardSummary.pending_quotes_count}
                      </p>
                    </div>
                    <div className="p-3 bg-yellow-100 rounded-lg">
                      <svg className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Link
                      to="/app/quotes"
                      className="text-sm font-semibold text-yellow-600 hover:text-yellow-700 flex items-center transition-colors"
                    >
                      View all quotes
                      <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>

                {/* Upcoming Bookings Card */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-600">Upcoming Bookings</p>
                      <p className="mt-2 text-3xl font-bold text-gray-900">
                        {dashboardSummary.upcoming_bookings.length}
                      </p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-lg">
                      <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Link
                      to="/app/bookings"
                      className="text-sm font-semibold text-green-600 hover:text-green-700 flex items-center transition-colors"
                    >
                      View all bookings
                      <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>

                {/* Unread Messages Card */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-600">Unread Messages</p>
                      <p className="mt-2 text-3xl font-bold text-gray-900">
                        {dashboardSummary.unread_messages_count}
                      </p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <svg className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                    </div>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={() => navigate('/app/orders')}
                      className="text-sm font-semibold text-purple-600 hover:text-purple-700 flex items-center transition-colors"
                    >
                      View messages
                      <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Upcoming Bookings List */}
              {dashboardSummary.upcoming_bookings.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Upcoming Bookings</h2>
                    <Link
                      to="/app/bookings"
                      className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center transition-colors"
                    >
                      View all
                      <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                  <div className="space-y-4">
                    {dashboardSummary.upcoming_bookings.slice(0, 3).map((booking) => (
                      <div
                        key={booking.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border-2 border-gray-200 hover:bg-gray-100 transition-all duration-200"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="p-2 bg-white rounded-lg border-2 border-gray-200">
                            <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{booking.service_name}</p>
                            <p className="text-sm text-gray-600">{formatBookingDate(booking.start_at)}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          {booking.is_emergency && (
                            <span className="px-3 py-1 text-xs font-bold text-red-700 bg-red-100 rounded-full">
                              Emergency
                            </span>
                          )}
                          <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                            booking.status === 'CONFIRMED'
                              ? 'bg-green-100 text-green-700'
                              : booking.status === 'PENDING'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {booking.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State for Bookings */}
              {dashboardSummary.upcoming_bookings.length === 0 && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-12 text-center">
                  <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <h3 className="mt-4 text-lg font-bold text-gray-900">No upcoming bookings</h3>
                  <p className="mt-2 text-sm text-gray-600 leading-relaxed">You don't have any scheduled bookings at the moment.</p>
                  <Link
                    to="/app/quotes/new"
                    className="mt-6 inline-flex items-center px-6 py-3 bg-yellow-400 text-black font-bold rounded-lg hover:bg-yellow-500 focus:outline-none focus:ring-4 focus:ring-yellow-200 transition-all duration-200 hover:scale-105"
                  >
                    Create New Quote
                    <svg className="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default UV_CustomerDashboard;