import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { 
  Home, 
  FileText, 
  Calendar, 
  Package, 
  MessageSquare, 
  User, 
  Menu,
  ChevronLeft,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { useAppStore } from '@/store/main';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface BadgeCounts {
  quotes: number;
  orders: number;
  bookings: number;
  messages: number;
}

interface Notification {
  id: string;
  type: string;
  message: string;
  created_at: string;
  is_read: boolean;
  entity_id?: string;
}

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ReactNode;
  badge?: number;
  mobileVisible?: boolean;
}

// ============================================================================
// NAVIGATION COMPONENT
// ============================================================================

const GV_CustomerNav: React.FC = () => {
  // ========================================================================
  // GLOBAL STATE (Individual selectors - CRITICAL for performance)
  // ========================================================================
  
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const notificationCounts = useAppStore(state => state.notification_state.unread_counts);
  const logoutUser = useAppStore(state => state.logout_user);
  
  // ========================================================================
  // LOCAL STATE
  // ========================================================================
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    const stored = localStorage.getItem('sultanstamp_sidebar_collapsed');
    return stored ? JSON.parse(stored) : false;
  });
  
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState<boolean>(false);
  const [badgeCounts, setBadgeCounts] = useState<BadgeCounts>({
    quotes: 0,
    orders: 0,
    bookings: 0,
    messages: 0
  });
  
  // ========================================================================
  // ROUTER STATE
  // ========================================================================
  
  const location = useLocation();
  
  const activeRoute = useMemo(() => {
    if (location.pathname === '/app') return 'dashboard';
    if (location.pathname.startsWith('/app/quotes')) return 'quotes';
    if (location.pathname.startsWith('/app/bookings')) return 'bookings';
    if (location.pathname.startsWith('/app/orders')) return 'orders';
    if (location.pathname.startsWith('/app/messages')) return 'messages';
    if (location.pathname.startsWith('/app/profile')) return 'profile';
    return 'dashboard';
  }, [location.pathname]);
  
  // ========================================================================
  // API INTEGRATION - FETCH BADGE COUNTS
  // ========================================================================
  
  const { data: notificationsData, isLoading: isLoadingNotifications } = useQuery({
    queryKey: ['customer-notifications', currentUser?.id],
    queryFn: async () => {
      if (!authToken) throw new Error('No auth token');
      
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/notifications`,
        {
          params: {
            is_read: false,
            limit: 50
          },
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        }
      );
      
      return response.data.notifications as Notification[];
    },
    enabled: !!authToken && !!currentUser,
    staleTime: 30000, // 30 seconds
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    refetchOnWindowFocus: true,
    retry: 1
  });
  
  // ========================================================================
  // EFFECTS
  // ========================================================================
  
  // Calculate badge counts from notifications
  useEffect(() => {
    if (notificationsData) {
      const counts: BadgeCounts = {
        quotes: 0,
        orders: 0,
        bookings: 0,
        messages: 0
      };
      
      notificationsData.forEach((notification: Notification) => {
        const lowerType = notification.type.toLowerCase();
        if (lowerType.includes('quote')) counts.quotes++;
        if (lowerType.includes('order')) counts.orders++;
        if (lowerType.includes('booking')) counts.bookings++;
        if (lowerType.includes('message')) counts.messages++;
      });
      
      setBadgeCounts(counts);
    }
  }, [notificationsData]);
  
  // Fallback to global notification counts if API fails
  useEffect(() => {
    if (!notificationsData && notificationCounts) {
      setBadgeCounts({
        quotes: notificationCounts.quotes || 0,
        orders: notificationCounts.orders || 0,
        bookings: 0, // Global store doesn't track bookings separately
        messages: notificationCounts.messages || 0
      });
    }
  }, [notificationCounts, notificationsData]);
  
  // Persist sidebar collapsed state
  useEffect(() => {
    localStorage.setItem('sultanstamp_sidebar_collapsed', JSON.stringify(isSidebarCollapsed));
  }, [isSidebarCollapsed]);
  
  // ========================================================================
  // HANDLERS
  // ========================================================================
  
  const handleToggleSidebar = () => {
    setIsSidebarCollapsed(prev => !prev);
  };
  
  const handleLogout = async () => {
    await logoutUser();
  };
  
  const handleMobileMoreToggle = () => {
    setIsMobileMoreOpen(prev => !prev);
  };
  
  // ========================================================================
  // NAVIGATION ITEMS CONFIGURATION
  // ========================================================================
  
  const navigationItems: NavItem[] = useMemo(() => [
    {
      id: 'dashboard',
      label: 'Dashboard',
      path: '/app',
      icon: <Home size={20} />,
      mobileVisible: true
    },
    {
      id: 'quotes',
      label: 'Quotes',
      path: '/app/quotes',
      icon: <FileText size={20} />,
      badge: badgeCounts.quotes,
      mobileVisible: true
    },
    {
      id: 'bookings',
      label: 'Bookings',
      path: '/app/bookings',
      icon: <Calendar size={20} />,
      badge: badgeCounts.bookings,
      mobileVisible: false // Hidden in main mobile tab bar, shown in "More"
    },
    {
      id: 'orders',
      label: 'Orders',
      path: '/app/orders',
      icon: <Package size={20} />,
      badge: badgeCounts.orders,
      mobileVisible: true
    },
    {
      id: 'messages',
      label: 'Messages',
      path: '/app/messages',
      icon: <MessageSquare size={20} />,
      badge: badgeCounts.messages,
      mobileVisible: true
    },
    {
      id: 'profile',
      label: 'Profile',
      path: '/app/profile',
      icon: <User size={20} />,
      mobileVisible: false // Hidden in main mobile tab bar, shown in "More"
    }
  ], [badgeCounts]);
  
  // Get user initials for collapsed sidebar
  const userInitials = useMemo(() => {
    if (!currentUser?.name) return 'U';
    const parts = currentUser.name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return currentUser.name.substring(0, 2).toUpperCase();
  }, [currentUser]);
  
  // ========================================================================
  // RENDER HELPERS
  // ========================================================================
  
  const renderBadge = (count?: number) => {
    if (!count || count === 0) return null;
    
    return (
      <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-yellow-400 text-black text-xs font-bold rounded-full border-2 border-white">
        {count > 99 ? '99+' : count}
      </span>
    );
  };
  
  const renderNavItem = (item: NavItem, isCollapsed: boolean = false) => {
    const isActive = activeRoute === item.id;
    
    return (
      <Link
        key={item.id}
        to={item.path}
        className={`
          relative flex items-center h-12 px-4 rounded-lg transition-all duration-200
          ${isActive 
            ? 'bg-black text-white' 
            : 'text-gray-700 hover:bg-gray-100 hover:text-black'
          }
          ${isCollapsed ? 'justify-center' : 'justify-start gap-3'}
        `}
        aria-label={item.label}
        title={isCollapsed ? item.label : undefined}
      >
        <div className="relative flex items-center justify-center">
          {item.icon}
          {!isCollapsed && renderBadge(item.badge)}
        </div>
        
        {!isCollapsed && (
          <>
            <span className="text-sm font-semibold flex-1">{item.label}</span>
            {item.badge && item.badge > 0 && (
              <span className="flex items-center justify-center min-w-[24px] h-6 px-2 bg-yellow-400 text-black text-xs font-bold rounded-full">
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            )}
          </>
        )}
        
        {isCollapsed && item.badge && item.badge > 0 && renderBadge(item.badge)}
      </Link>
    );
  };
  
  const renderMobileNavItem = (item: NavItem) => {
    const isActive = activeRoute === item.id;
    
    return (
      <Link
        key={item.id}
        to={item.path}
        className={`
          relative flex flex-col items-center justify-center h-full px-2 transition-colors duration-200
          ${isActive ? 'text-yellow-400' : 'text-gray-600 hover:text-black'}
        `}
        aria-label={item.label}
      >
        <div className="relative flex items-center justify-center">
          {React.cloneElement(item.icon as React.ReactElement, { size: 24 })}
          {item.badge && item.badge > 0 && (
            <span className="absolute -top-2 -right-2 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-yellow-400 text-black text-[10px] font-bold rounded-full border-2 border-white">
              {item.badge > 99 ? '99+' : item.badge}
            </span>
          )}
        </div>
        <span className="text-[10px] font-semibold mt-1 truncate max-w-full">
          {item.label}
        </span>
      </Link>
    );
  };
  
  // ========================================================================
  // MAIN RENDER
  // ========================================================================
  
  return (
    <>
      {/* ================================================================== */}
      {/* DESKTOP SIDEBAR (≥768px) */}
      {/* ================================================================== */}
      <aside
        className={`
          hidden md:flex flex-col h-screen bg-white border-r border-gray-200 fixed left-0 top-0 z-30
          transition-all duration-300 ease-in-out
          ${isSidebarCollapsed ? 'w-16' : 'w-60'}
        `}
      >
        {/* User Profile Section */}
        <div className={`
          flex items-center h-16 px-4 border-b border-gray-200
          ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}
        `}>
          {isSidebarCollapsed ? (
            <div className="flex items-center justify-center w-10 h-10 bg-black text-white rounded-full text-sm font-bold">
              {userInitials}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-black text-white rounded-full text-sm font-bold">
                  {userInitials}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-900 truncate max-w-[140px]">
                    {currentUser?.name || 'User'}
                  </span>
                  <span className="text-xs text-gray-500">Customer</span>
                </div>
              </div>
            </>
          )}
        </div>
        
        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navigationItems.map(item => renderNavItem(item, isSidebarCollapsed))}
        </nav>
        
        {/* Bottom Actions */}
        <div className={`
          px-3 py-4 border-t border-gray-200 space-y-1
        `}>
          {/* Sidebar Toggle Button */}
          <button
            onClick={handleToggleSidebar}
            className={`
              flex items-center w-full h-12 px-4 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-black transition-all duration-200
              ${isSidebarCollapsed ? 'justify-center' : 'justify-start gap-3'}
            `}
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isSidebarCollapsed ? (
              <ChevronRight size={20} />
            ) : (
              <>
                <ChevronLeft size={20} />
                <span className="text-sm font-semibold flex-1 text-left">Collapse</span>
              </>
            )}
          </button>
          
          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className={`
              flex items-center w-full h-12 px-4 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200
              ${isSidebarCollapsed ? 'justify-center' : 'justify-start gap-3'}
            `}
            aria-label="Sign out"
            title={isSidebarCollapsed ? 'Sign out' : undefined}
          >
            <LogOut size={20} />
            {!isSidebarCollapsed && (
              <span className="text-sm font-semibold">Sign Out</span>
            )}
          </button>
        </div>
      </aside>
      
      {/* ================================================================== */}
      {/* MOBILE BOTTOM TAB BAR (<768px) */}
      {/* ================================================================== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 z-40">
        <div className="flex items-center justify-around h-full">
          {/* Main Mobile Tabs (priority items) */}
          {navigationItems
            .filter(item => item.mobileVisible)
            .map(item => renderMobileNavItem(item))}
          
          {/* More Button (shows hidden items) */}
          <button
            onClick={handleMobileMoreToggle}
            className={`
              relative flex flex-col items-center justify-center h-full px-2 transition-colors duration-200
              ${isMobileMoreOpen ? 'text-yellow-400' : 'text-gray-600 hover:text-black'}
            `}
            aria-label="More options"
          >
            <Menu size={24} />
            <span className="text-[10px] font-semibold mt-1">More</span>
          </button>
        </div>
      </nav>
      
      {/* ================================================================== */}
      {/* MOBILE "MORE" DRAWER */}
      {/* ================================================================== */}
      {isMobileMoreOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={handleMobileMoreToggle}
          />
          
          {/* Drawer */}
          <div className="md:hidden fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 z-50 shadow-2xl animate-slide-up">
            <div className="px-4 py-6 space-y-2">
              {/* User Info */}
              <div className="flex items-center gap-3 pb-4 mb-4 border-b border-gray-200">
                <div className="flex items-center justify-center w-12 h-12 bg-black text-white rounded-full text-base font-bold">
                  {userInitials}
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-semibold text-gray-900">
                    {currentUser?.name || 'User'}
                  </span>
                  <span className="text-sm text-gray-500">{currentUser?.email}</span>
                </div>
              </div>
              
              {/* Hidden Navigation Items */}
              {navigationItems
                .filter(item => !item.mobileVisible)
                .map(item => (
                  <Link
                    key={item.id}
                    to={item.path}
                    onClick={handleMobileMoreToggle}
                    className={`
                      flex items-center gap-3 h-12 px-4 rounded-lg transition-all duration-200
                      ${activeRoute === item.id 
                        ? 'bg-black text-white' 
                        : 'text-gray-700 hover:bg-gray-100 hover:text-black'
                      }
                    `}
                  >
                    {item.icon}
                    <span className="text-sm font-semibold flex-1">{item.label}</span>
                    {item.badge && item.badge > 0 && (
                      <span className="flex items-center justify-center min-w-[24px] h-6 px-2 bg-yellow-400 text-black text-xs font-bold rounded-full">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </Link>
                ))}
              
              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full h-12 px-4 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200 mt-4"
              >
                <LogOut size={20} />
                <span className="text-sm font-semibold">Sign Out</span>
              </button>
            </div>
          </div>
        </>
      )}
      
      {/* Add slide-up animation to global styles if needed */}
      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

export default GV_CustomerNav;