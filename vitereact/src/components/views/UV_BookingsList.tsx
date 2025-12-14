import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  Calendar, 
  Clock, 
  AlertTriangle, 
  ExternalLink, 
  XCircle,
  Filter,
  CheckCircle,
  Loader2
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Booking {
  id: string;
  quote_id: string | null;
  customer_id: string;
  order_id: string | null;
  start_at: string;
  end_at: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  is_emergency: boolean;
  urgent_fee_pct: number | null;
  urgent_fee_amt: number | null;
  location_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined service data (if returned by backend)
  service_name?: string;
}

interface BookingsResponse {
  bookings: Booking[];
  total: number;
}

interface CancelBookingPayload {
  status: 'CANCELLED';
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchBookings = async (
  customerId: string,
  authToken: string,
  status?: string | null
): Promise<BookingsResponse> => {
  const params: Record<string, any> = {
    customer_id: customerId,
    limit: 50,
    offset: 0,
    sort_by: 'start_at',
    sort_order: 'asc'
  };

  if (status) {
    params.status = status;
  }

  const response = await axios.get<BookingsResponse>(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/bookings`,
    {
      params,
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    }
  );

  return response.data;
};

const cancelBooking = async (
  bookingId: string,
  authToken: string
): Promise<Booking> => {
  const response = await axios.put<Booking>(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/bookings/${bookingId}`,
    { status: 'CANCELLED' } as CancelBookingPayload,
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data;
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const formatBookingDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatBookingTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

const canCancelBooking = (booking: Booking): boolean => {
  if (booking.status !== 'PENDING' && booking.status !== 'CONFIRMED') {
    return false;
  }

  // Check if booking is within 24 hours
  const startDate = new Date(booking.start_at);
  const now = new Date();
  const hoursUntilStart = (startDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  return hoursUntilStart > 24;
};

const getStatusBadgeClasses = (status: string): string => {
  switch (status) {
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'CONFIRMED':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'COMPLETED':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'CANCELLED':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const categorizeBookings = (bookings: Booking[]) => {
  const now = new Date();
  
  return {
    upcoming: bookings.filter(b => 
      (b.status === 'PENDING' || b.status === 'CONFIRMED') && 
      new Date(b.start_at) >= now
    ),
    past: bookings.filter(b => 
      b.status === 'COMPLETED' || 
      (new Date(b.start_at) < now && b.status !== 'CANCELLED')
    ),
    cancelled: bookings.filter(b => b.status === 'CANCELLED')
  };
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_BookingsList: React.FC = () => {
  // ======================================================================
  // STATE MANAGEMENT
  // ======================================================================

  // CRITICAL: Individual selectors (no object destructuring)
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Local state
  const [filterStatus, setFilterStatus] = useState<string | null>(
    searchParams.get('status') || null
  );
  const [bookingToCancel, setBookingToCancel] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // ======================================================================
  // DATA FETCHING
  // ======================================================================

  const {
    data: bookingsData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['bookings', currentUser?.id, filterStatus],
    queryFn: () => fetchBookings(currentUser!.id, authToken!, filterStatus),
    enabled: !!currentUser && !!authToken,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    refetchOnWindowFocus: false
  });

  const cancelBookingMutation = useMutation({
    mutationFn: (bookingId: string) => cancelBooking(bookingId, authToken!),
    onSuccess: () => {
      // Invalidate and refetch bookings
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      
      // Show success notification
      setNotification({
        type: 'success',
        message: 'Booking cancelled successfully'
      });
      
      // Clear notification after 3 seconds
      setTimeout(() => setNotification(null), 3000);
      
      // Close confirmation dialog
      setBookingToCancel(null);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to cancel booking';
      setNotification({
        type: 'error',
        message: errorMessage
      });
      setTimeout(() => setNotification(null), 5000);
    }
  });

  // ======================================================================
  // DERIVED STATE
  // ======================================================================

  const bookings = useMemo(() => bookingsData?.bookings || [], [bookingsData]);
  const categorizedBookings = useMemo(() => categorizeBookings(bookings), [bookings]);

  // ======================================================================
  // EVENT HANDLERS
  // ======================================================================

  const handleFilterChange = (newFilter: string | null) => {
    setFilterStatus(newFilter);
    
    // Update URL params
    if (newFilter) {
      setSearchParams({ status: newFilter });
    } else {
      setSearchParams({});
    }
  };

  const handleCancelBooking = (bookingId: string) => {
    setBookingToCancel(bookingId);
  };

  const confirmCancelBooking = () => {
    if (bookingToCancel) {
      cancelBookingMutation.mutate(bookingToCancel);
    }
  };

  const handleViewDetails = (booking: Booking) => {
    if (booking.order_id) {
      navigate(`/app/orders/${booking.order_id}`);
    } else {
      // Could navigate to a booking detail page or show modal
      console.log('View booking details:', booking.id);
    }
  };

  // ======================================================================
  // EFFECTS
  // ======================================================================

  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam !== filterStatus) {
      setFilterStatus(statusParam);
    }
  }, [searchParams]);

  // ======================================================================
  // RENDER HELPERS
  // ======================================================================

  const renderBookingCard = (booking: Booking) => {
    const canCancel = canCancelBooking(booking);
    const startDate = new Date(booking.start_at);
    const now = new Date();
    const hoursUntilStart = (startDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    return (
      <article
        key={booking.id}
        className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
      >
        <div className="p-6">
          {/* Emergency Badge */}
          {booking.is_emergency && (
            <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-semibold">
              <AlertTriangle className="w-4 h-4" />
              <span>EMERGENCY BOOKING</span>
            </div>
          )}

          {/* Service Name */}
          <h3 className="text-xl font-bold text-gray-900 mb-3">
            {booking.service_name || 'Service Booking'}
          </h3>

          {/* Date & Time */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-gray-700">
              <Calendar className="w-5 h-5 text-gray-400" />
              <span className="font-medium">{formatBookingDate(booking.start_at)}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <Clock className="w-5 h-5 text-gray-400" />
              <span>
                {formatBookingTime(booking.start_at)} - {formatBookingTime(booking.end_at)}
              </span>
            </div>
          </div>

          {/* Status Badge */}
          <div className="mb-4">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border ${getStatusBadgeClasses(
                booking.status
              )}`}
            >
              {booking.status === 'COMPLETED' && <CheckCircle className="w-4 h-4" />}
              {booking.status === 'CANCELLED' && <XCircle className="w-4 h-4" />}
              {booking.status.replace('_', ' ')}
            </span>
          </div>

          {/* Urgent Fee Display */}
          {booking.is_emergency && booking.urgent_fee_amt && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-900">
                <span className="font-semibold">Urgent Fee:</span> €
                {Number(booking.urgent_fee_amt || 0).toFixed(2)}
                {booking.urgent_fee_pct && ` (${booking.urgent_fee_pct}%)`}
              </p>
            </div>
          )}

          {/* Cancellation Warning */}
          {!canCancel &&
            (booking.status === 'PENDING' || booking.status === 'CONFIRMED') &&
            hoursUntilStart > 0 && (
              <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-700">
                  <AlertTriangle className="w-4 h-4 inline mr-1 text-yellow-600" />
                  Cannot cancel within 24 hours of booking
                </p>
              </div>
            )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mt-5">
            <button
              onClick={() => handleViewDetails(booking)}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors duration-200"
            >
              <ExternalLink className="w-4 h-4" />
              View Details
            </button>

            {(booking.status === 'PENDING' || booking.status === 'CONFIRMED') && (
              <button
                onClick={() => handleCancelBooking(booking.id)}
                disabled={!canCancel}
                className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-colors duration-200 ${
                  canCancel
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
                title={
                  !canCancel
                    ? 'Cannot cancel within 24 hours of booking'
                    : 'Cancel booking'
                }
              >
                <XCircle className="w-4 h-4" />
                Cancel
              </button>
            )}
          </div>
        </div>
      </article>
    );
  };

  const renderEmptyState = () => {
    const getEmptyMessage = () => {
      if (filterStatus === 'PENDING') return "You don't have any pending bookings.";
      if (filterStatus === 'CONFIRMED') return "You don't have any confirmed bookings.";
      if (filterStatus === 'COMPLETED') return "You haven't completed any bookings yet.";
      if (filterStatus === 'CANCELLED') return "You don't have any cancelled bookings.";
      return "You don't have any bookings yet.";
    };

    return (
      <div className="text-center py-20">
        <Calendar className="w-20 h-20 text-gray-300 mx-auto mb-6" />
        <h3 className="text-2xl font-bold text-gray-900 mb-3">{getEmptyMessage()}</h3>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          {!filterStatus &&
            "Ready to schedule a service? Start by creating a custom quote for your project."}
        </p>
        {!filterStatus && (
          <Link
            to="/app/quotes/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-400 text-black rounded-lg font-bold hover:bg-yellow-500 transition-colors duration-200"
          >
            Create New Quote
          </Link>
        )}
      </div>
    );
  };

  // ======================================================================
  // MAIN RENDER
  // ======================================================================

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                  My Bookings
                </h1>
                <p className="text-gray-600">
                  Manage your scheduled appointments and booking history
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Notification */}
        {notification && (
          <div
            className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg animate-slide-in ${
              notification.type === 'success'
                ? 'bg-green-600 text-white'
                : 'bg-red-600 text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              {notification.type === 'success' ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
              <span className="font-medium">{notification.message}</span>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex gap-1 overflow-x-auto">
              <button
                onClick={() => handleFilterChange(null)}
                className={`px-6 py-4 font-semibold whitespace-nowrap transition-colors duration-200 border-b-2 ${
                  filterStatus === null
                    ? 'border-yellow-400 text-gray-900'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                All Bookings ({bookings.length})
              </button>
              <button
                onClick={() => handleFilterChange('PENDING')}
                className={`px-6 py-4 font-semibold whitespace-nowrap transition-colors duration-200 border-b-2 ${
                  filterStatus === 'PENDING'
                    ? 'border-yellow-400 text-gray-900'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Upcoming ({categorizedBookings.upcoming.length})
              </button>
              <button
                onClick={() => handleFilterChange('COMPLETED')}
                className={`px-6 py-4 font-semibold whitespace-nowrap transition-colors duration-200 border-b-2 ${
                  filterStatus === 'COMPLETED'
                    ? 'border-yellow-400 text-gray-900'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Past ({categorizedBookings.past.length})
              </button>
              <button
                onClick={() => handleFilterChange('CANCELLED')}
                className={`px-6 py-4 font-semibold whitespace-nowrap transition-colors duration-200 border-b-2 ${
                  filterStatus === 'CANCELLED'
                    ? 'border-yellow-400 text-gray-900'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Cancelled ({categorizedBookings.cancelled.length})
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-10 h-10 text-gray-400 animate-spin" />
              <span className="ml-3 text-gray-600 text-lg">Loading bookings...</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <XCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-red-900 mb-2">
                Failed to Load Bookings
              </h3>
              <p className="text-red-700 mb-4">
                {(error as any)?.response?.data?.message ||
                  'An error occurred while fetching your bookings.'}
              </p>
              <button
                onClick={() => refetch()}
                className="px-6 py-2.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors duration-200"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Bookings Grid */}
          {!isLoading && !error && bookings.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bookings.map(booking => renderBookingCard(booking))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && bookings.length === 0 && renderEmptyState()}
        </div>

        {/* Cancellation Confirmation Dialog */}
        {bookingToCancel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Cancel Booking?</h3>
              </div>

              <p className="text-gray-700 mb-6">
                Are you sure you want to cancel this booking? This action cannot be undone.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setBookingToCancel(null)}
                  disabled={cancelBookingMutation.isPending}
                  className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-900 rounded-lg font-semibold hover:bg-gray-300 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Keep Booking
                </button>
                <button
                  onClick={confirmCancelBooking}
                  disabled={cancelBookingMutation.isPending}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cancelBookingMutation.isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Cancelling...
                    </span>
                  ) : (
                    'Yes, Cancel'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default UV_BookingsList;