import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Home, ClipboardList, Calendar, MessageCircle, User } from 'lucide-react';
import { useAppStore } from '@/store/main';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface StaffJobCounts {
  assigned_jobs_pending: number;
  today_bookings: number;
  unread_messages: number;
}

interface Order {
  id: string;
  order_number: string;
  assigned_staff_id: string | null;
  status: string;
  due_at: string | null;
}

interface Booking {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
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
// NAVIGATION CONFIGURATION
// ============================================================================

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  route: string;
  badgeKey: keyof StaffJobCounts | null;
}

const navigationItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: Home,
    route: '/staff',
    badgeKey: null,
  },
  {
    id: 'jobs',
    label: 'Jobs',
    icon: ClipboardList,
    route: '/staff/jobs',
    badgeKey: 'assigned_jobs_pending',
  },
  {
    id: 'calendar',
    label: 'Calendar',
    icon: Calendar,
    route: '/staff/calendar',
    badgeKey: 'today_bookings',
  },
  {
    id: 'messages',
    label: 'Messages',
    icon: MessageCircle,
    route: '/staff/messages',
    badgeKey: 'unread_messages',
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: User,
    route: '/staff/profile',
    badgeKey: null,
  },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const GV_StaffNav: React.FC = () => {
  const location = useLocation();

  // CRITICAL: Individual selectors, no object destructuring to avoid infinite loops
  const authToken = useAppStore((state) => state.authentication_state.auth_token);
  const currentUser = useAppStore((state) => state.authentication_state.current_user);
  const staffProfile = currentUser?.staff_profile;
  const staffId = staffProfile?.id || '';

  // ============================================================================
  // API CALLS - FETCH ASSIGNED JOBS COUNT
  // ============================================================================

  const fetchAssignedJobs = async (): Promise<number> => {
    if (!authToken || !staffId) {
      return 0;
    }

    try {
      const response = await axios.get<OrdersResponse>(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/orders`,
        {
          params: {
            assigned_staff_id: staffId,
            status: 'IN_PRODUCTION,PROOF_SENT',
            limit: 100,
          },
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      // Count jobs requiring action (IN_PRODUCTION or PROOF_SENT status)
      const jobsRequiringAction = response.data.orders.filter(
        (order) => order.status === 'IN_PRODUCTION' || order.status === 'PROOF_SENT'
      );

      return jobsRequiringAction.length;
    } catch (error) {
      console.error('Error fetching assigned jobs:', error);
      return 0;
    }
  };

  const {
    data: assignedJobsCount = 0,
    isLoading: isLoadingJobs,
    error: jobsError,
  } = useQuery({
    queryKey: ['staff-assigned-jobs', staffId],
    queryFn: fetchAssignedJobs,
    enabled: !!authToken && !!staffId,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
    retry: 1,
    refetchInterval: 60000, // Refresh every 60 seconds
  });

  // ============================================================================
  // API CALLS - FETCH TODAY'S BOOKINGS COUNT
  // ============================================================================

  const fetchTodayBookings = async (): Promise<number> => {
    if (!authToken) {
      return 0;
    }

    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

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

      return response.data.bookings.length;
    } catch (error) {
      console.error('Error fetching today bookings:', error);
      return 0;
    }
  };

  const {
    data: todayBookingsCount = 0,
    isLoading: isLoadingBookings,
    error: bookingsError,
  } = useQuery({
    queryKey: ['staff-today-bookings', new Date().toISOString().split('T')[0]],
    queryFn: fetchTodayBookings,
    enabled: !!authToken,
    staleTime: 30000,
    refetchOnWindowFocus: true,
    retry: 1,
    refetchInterval: 60000,
  });

  // ============================================================================
  // API CALLS - FETCH UNREAD MESSAGES COUNT
  // ============================================================================

  const fetchUnreadMessages = async (): Promise<number> => {
    // NOTE: MISSING ENDPOINT - Need proper staff message counts endpoint
    // Placeholder implementation returning 0 until backend endpoint is available
    // TODO: Implement GET /api/staff/message-counts endpoint in backend
    return 0;
  };

  const {
    data: unreadMessagesCount = 0,
    isLoading: isLoadingMessages,
    error: messagesError,
  } = useQuery({
    queryKey: ['staff-unread-messages', staffId],
    queryFn: fetchUnreadMessages,
    enabled: !!authToken && !!staffId,
    staleTime: 30000,
    refetchOnWindowFocus: true,
    retry: 1,
    refetchInterval: 60000,
  });

  // ============================================================================
  // AGGREGATE COUNTS
  // ============================================================================

  const staffJobCounts: StaffJobCounts = {
    assigned_jobs_pending: assignedJobsCount,
    today_bookings: todayBookingsCount,
    unread_messages: unreadMessagesCount,
  };

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const isActiveRoute = (route: string): boolean => {
    if (route === '/staff') {
      return location.pathname === '/staff';
    }
    return location.pathname.startsWith(route);
  };

  const getBadgeCount = (badgeKey: keyof StaffJobCounts | null): number => {
    if (!badgeKey) return 0;
    return staffJobCounts[badgeKey] || 0;
  };

  const getAriaLabel = (item: NavItem): string => {
    const badgeCount = getBadgeCount(item.badgeKey);
    if (badgeCount > 0) {
      return `${item.label}, ${badgeCount} pending`;
    }
    return item.label;
  };

  // ============================================================================
  // RENDER NAVIGATION ITEM
  // ============================================================================

  const renderNavItem = (item: NavItem, isMobile: boolean = false) => {
    const Icon = item.icon;
    const isActive = isActiveRoute(item.route);
    const badgeCount = getBadgeCount(item.badgeKey);
    const showBadge = badgeCount > 0;

    return (
      <Link
        key={item.id}
        to={item.route}
        aria-label={getAriaLabel(item)}
        aria-current={isActive ? 'page' : undefined}
        className={`
          relative flex items-center gap-3
          ${isMobile ? 'flex-col justify-center px-2 py-3' : 'px-6 py-4'}
          font-semibold text-base transition-all duration-200
          ${
            isActive
              ? 'bg-yellow-400 text-black'
              : 'text-white hover:bg-gray-900 hover:text-white'
          }
          ${isMobile ? 'flex-1 min-w-0' : ''}
        `}
      >
        {/* Icon */}
        <Icon className={isMobile ? 'w-6 h-6' : 'w-5 h-5'} />

        {/* Label */}
        <span className={isMobile ? 'text-xs font-medium' : 'text-base'}>
          {item.label}
        </span>

        {/* Badge */}
        {showBadge && (
          <span
            className={`
              absolute flex items-center justify-center
              min-w-[20px] h-5 px-1.5
              bg-yellow-400 text-black
              text-xs font-bold rounded-full
              ${isMobile ? 'top-1 right-1/2 translate-x-4' : 'top-3 right-4'}
            `}
            aria-label={`${badgeCount} notifications`}
          >
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
      </Link>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      {/* Desktop Sidebar Navigation (≥768px) */}
      <nav
        className="hidden md:flex md:flex-col md:fixed md:left-0 md:top-0 md:h-screen md:w-60 bg-black border-r border-gray-800 z-40"
        aria-label="Staff navigation"
      >
        {/* Brand */}
        <div className="flex items-center justify-center h-20 border-b border-gray-800">
          <Link to="/staff" className="flex items-center">
            <span className="text-2xl font-bold text-white">SultanStamp</span>
          </Link>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          {navigationItems.map((item) => renderNavItem(item, false))}
        </div>

        {/* Loading Indicator (if any data is loading) */}
        {(isLoadingJobs || isLoadingBookings || isLoadingMessages) && (
          <div className="px-6 py-4 border-t border-gray-800">
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent"></div>
              <span>Updating...</span>
            </div>
          </div>
        )}
      </nav>

      {/* Mobile Bottom Tab Bar (<768px) */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800 z-40 safe-area-bottom"
        aria-label="Staff navigation"
      >
        <div className="flex items-center justify-around h-16">
          {navigationItems.map((item) => renderNavItem(item, true))}
        </div>
      </nav>

      {/* Error Messages (Development Only) */}
      {(jobsError || bookingsError || messagesError) && process.env.NODE_ENV === 'development' && (
        <div className="hidden md:block fixed bottom-4 left-4 max-w-xs bg-red-600 text-white px-4 py-2 rounded-md shadow-lg text-sm z-50">
          <p className="font-semibold">Navigation Data Error:</p>
          {jobsError && <p className="text-xs mt-1">Jobs: Failed to load</p>}
          {bookingsError && <p className="text-xs mt-1">Bookings: Failed to load</p>}
          {messagesError && <p className="text-xs mt-1">Messages: Failed to load</p>}
        </div>
      )}
    </>
  );
};

export default GV_StaffNav;