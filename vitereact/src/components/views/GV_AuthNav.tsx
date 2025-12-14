import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { Bell, User, Menu, X, ChevronDown } from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Notification {
  id: string;
  type: string;
  message: string;
  created_at: string;
  is_read: boolean;
  entity_id?: string;
}

interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  unread_count: number;
}

interface NavItem {
  label: string;
  path: string;
  badge?: number;
  show?: boolean;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchNotifications = async (authToken: string): Promise<NotificationsResponse> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/notifications`,
    {
      params: {
        limit: 10,
        sort_by: 'created_at',
        sort_order: 'desc',
      },
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    }
  );
  return response.data;
};

const markNotificationAsRead = async (notificationId: string, authToken: string): Promise<void> => {
  await axios.put(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/notifications/${notificationId}`,
    { is_read: true },
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    }
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const GV_AuthNav: React.FC = () => {
  // ======================================================================
  // ZUSTAND STORE - CRITICAL: Individual selectors only, no destructuring
  // ======================================================================
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const logoutUser = useAppStore(state => state.logout_user);
  const unreadCounts = useAppStore(state => state.notification_state.unread_counts);
  const featureFlags = useAppStore(state => state.feature_flags);
  const updateUnreadCounts = useAppStore(state => state.update_unread_counts);

  // ======================================================================
  // LOCAL STATE
  // ======================================================================
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const [userMenuDropdownOpen, setUserMenuDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ======================================================================
  // REFS
  // ======================================================================
  const notificationRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // ======================================================================
  // HOOKS
  // ======================================================================
  const navigate = useNavigate();
  const location = useLocation();

  // ======================================================================
  // REACT QUERY - NOTIFICATIONS
  // ======================================================================
  const { data: notificationsData, refetch: refetchNotifications } = useQuery({
    queryKey: ['notifications', currentUser?.id],
    queryFn: () => fetchNotifications(authToken || ''),
    enabled: !!authToken && notificationDropdownOpen,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });

  // ======================================================================
  // EFFECTS
  // ======================================================================

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationDropdownOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdowns on ESC key
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setNotificationDropdownOpen(false);
        setUserMenuDropdownOpen(false);
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setNotificationDropdownOpen(false);
    setUserMenuDropdownOpen(false);
  }, [location.pathname]);

  // Update unread counts from notifications data
  useEffect(() => {
    if (notificationsData) {
      updateUnreadCounts({
        quotes: notificationsData.notifications.filter(n => n.type === 'quote_update' && !n.is_read).length,
        orders: notificationsData.notifications.filter(n => n.type === 'order_update' && !n.is_read).length,
        messages: notificationsData.notifications.filter(n => n.type === 'new_message' && !n.is_read).length,
      });
    }
  }, [notificationsData, updateUnreadCounts]);

  // ======================================================================
  // HANDLERS
  // ======================================================================

  const handleNotificationBellClick = () => {
    setNotificationDropdownOpen(!notificationDropdownOpen);
    setUserMenuDropdownOpen(false);
    if (!notificationDropdownOpen) {
      refetchNotifications();
    }
  };

  const handleUserMenuClick = () => {
    setUserMenuDropdownOpen(!userMenuDropdownOpen);
    setNotificationDropdownOpen(false);
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!authToken) return;

    try {
      await markNotificationAsRead(notification.id, authToken);
      refetchNotifications();

      // Navigate based on notification type and entity_id
      if (notification.entity_id) {
        if (notification.type.includes('quote')) {
          navigate(`/app/quotes/${notification.entity_id}`);
        } else if (notification.type.includes('order')) {
          navigate(`/app/orders/${notification.entity_id}`);
        } else if (notification.type.includes('message')) {
          navigate(`/app/messages`);
        }
      }

      setNotificationDropdownOpen(false);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      navigate('/login');
    }
  };

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
    setNotificationDropdownOpen(false);
    setUserMenuDropdownOpen(false);
  };

  // ======================================================================
  // NAVIGATION ITEMS BY ROLE
  // ======================================================================

  const getNavigationItems = (): NavItem[] => {
    if (!currentUser) return [];

    const role = currentUser.role;

    if (role === 'CUSTOMER') {
      return [
        { label: 'Dashboard', path: '/app' },
        { label: 'Quotes', path: '/app/quotes', badge: unreadCounts.quotes },
        { label: 'Orders', path: '/app/orders', badge: unreadCounts.orders },
        { label: 'Bookings', path: '/app/bookings' },
      ];
    }

    if (role === 'STAFF') {
      return [
        { label: 'Dashboard', path: '/staff' },
        { label: 'Jobs', path: '/staff/jobs', badge: unreadCounts.jobs },
        { label: 'Calendar', path: '/staff/calendar' },
        { label: 'Messages', path: '/staff/messages', badge: unreadCounts.messages },
      ];
    }

    if (role === 'ADMIN') {
      const adminNav: NavItem[] = [
        { label: 'Dashboard', path: '/admin' },
        { label: 'Services', path: '/admin/services' },
        { label: 'Pricing', path: '/admin/pricing' },
        { label: 'Tiers', path: '/admin/tiers' },
        { label: 'Calendar', path: '/admin/calendar' },
        { label: 'Quotes', path: '/admin/quotes', badge: unreadCounts.quotes },
        { label: 'Orders', path: '/admin/orders', badge: unreadCounts.orders },
        { label: 'Users', path: '/admin/users' },
        { label: 'Content', path: '/admin/content' },
        { label: 'Settings', path: '/admin/settings' },
      ];

      // Phase 2 feature-flagged routes
      if (featureFlags.b2b_accounts) {
        adminNav.push({ label: 'B2B', path: '/admin/b2b' });
      }
      if (featureFlags.inventory_management) {
        adminNav.push({ label: 'Inventory', path: '/admin/inventory', badge: unreadCounts.inventory_alerts });
      }
      if (featureFlags.analytics_dashboard) {
        adminNav.push({ label: 'Analytics', path: '/admin/analytics' });
      }

      return adminNav;
    }

    return [];
  };

  const navigationItems = getNavigationItems();

  const getRoleHomePath = (): string => {
    if (!currentUser) return '/';
    if (currentUser.role === 'CUSTOMER') return '/app';
    if (currentUser.role === 'STAFF') return '/staff';
    if (currentUser.role === 'ADMIN') return '/admin';
    return '/';
  };

  const totalUnreadCount = Object.values(unreadCounts).reduce((sum, count) => sum + (count || 0), 0);

  // ======================================================================
  // RENDER
  // ======================================================================

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black text-white h-20 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
          <div className="flex items-center justify-between h-full">
            {/* Logo */}
            <Link to={getRoleHomePath()} className="flex items-center">
              <h1 className="text-xl sm:text-2xl font-bold text-white hover:text-yellow-400 transition-colors">
                SultanStamp
              </h1>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex lg:items-center lg:space-x-8">
              {navigationItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative px-3 py-2 text-sm font-semibold transition-colors ${
                    location.pathname === item.path
                      ? 'text-yellow-400'
                      : 'text-white hover:text-yellow-400'
                  }`}
                >
                  {item.label}
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute -top-1 -right-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-black bg-yellow-400 rounded-full">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </Link>
              ))}
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-4">
              {/* Notification Bell */}
              <div className="relative" ref={notificationRef}>
                <button
                  onClick={handleNotificationBellClick}
                  className="relative p-2 text-white hover:text-yellow-400 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400 rounded-lg"
                  aria-label="Notifications"
                >
                  <Bell className="w-6 h-6" />
                  {totalUnreadCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold text-black bg-yellow-400 rounded-full">
                      {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown */}
                {notificationDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-2xl overflow-hidden">
                    <div className="bg-black text-white px-4 py-3 border-b border-gray-200">
                      <h3 className="text-sm font-bold">Notifications</h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notificationsData && notificationsData.notifications.length > 0 ? (
                        <div className="divide-y divide-gray-200">
                          {notificationsData.notifications.map((notification) => (
                            <button
                              key={notification.id}
                              onClick={() => handleNotificationClick(notification)}
                              className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                                !notification.is_read ? 'bg-yellow-50' : ''
                              }`}
                            >
                              <p className={`text-sm ${!notification.is_read ? 'font-semibold text-black' : 'text-gray-700'}`}>
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(notification.created_at).toLocaleString()}
                              </p>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="px-4 py-8 text-center text-gray-500">
                          <p className="text-sm">No notifications</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Menu */}
              <div className="relative hidden sm:block" ref={userMenuRef}>
                <button
                  onClick={handleUserMenuClick}
                  className="flex items-center space-x-2 px-3 py-2 text-white hover:text-yellow-400 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400 rounded-lg"
                >
                  <User className="w-6 h-6" />
                  <span className="text-sm font-semibold hidden md:inline">{currentUser?.name}</span>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {/* User Dropdown */}
                {userMenuDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-2xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-200">
                      <p className="text-sm font-semibold text-gray-900">{currentUser?.name}</p>
                      <p className="text-xs text-gray-500">{currentUser?.email}</p>
                      <p className="text-xs text-gray-400 mt-1 capitalize">{currentUser?.role.toLowerCase()}</p>
                    </div>
                    <div className="py-2">
                      <Link
                        to={currentUser?.role === 'CUSTOMER' ? '/app/profile' : currentUser?.role === 'STAFF' ? '/staff/profile' : '/admin/settings'}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        Profile Settings
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={handleMobileMenuToggle}
                className="lg:hidden p-2 text-white hover:text-yellow-400 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400 rounded-lg"
                aria-label="Toggle mobile menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 top-20 bg-black bg-opacity-90 z-40">
            <div className="h-full overflow-y-auto px-4 py-6 space-y-4">
              {/* Mobile Navigation Items */}
              {navigationItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                    location.pathname === item.path
                      ? 'bg-yellow-400 text-black'
                      : 'text-white hover:bg-gray-800'
                  }`}
                >
                  <span className="text-base font-semibold">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 text-xs font-bold text-black bg-yellow-400 rounded-full">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </Link>
              ))}

              {/* Mobile User Section */}
              <div className="border-t border-gray-700 pt-4 mt-4">
                <div className="px-4 py-3 bg-gray-800 rounded-lg mb-2">
                  <p className="text-sm font-semibold text-white">{currentUser?.name}</p>
                  <p className="text-xs text-gray-400">{currentUser?.email}</p>
                  <p className="text-xs text-gray-500 mt-1 capitalize">{currentUser?.role.toLowerCase()}</p>
                </div>
                <Link
                  to={currentUser?.role === 'CUSTOMER' ? '/app/profile' : currentUser?.role === 'STAFF' ? '/staff/profile' : '/admin/settings'}
                  className="block px-4 py-3 text-white hover:bg-gray-800 rounded-lg transition-colors text-base font-semibold"
                >
                  Profile Settings
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-3 text-red-400 hover:bg-gray-800 rounded-lg transition-colors text-base font-semibold"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Spacer to prevent content from hiding under fixed nav */}
      <div className="h-20"></div>
    </>
  );
};

export default GV_AuthNav;