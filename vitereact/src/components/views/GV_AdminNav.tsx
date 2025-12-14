import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import {
  LayoutDashboard,
  Package,
  DollarSign,
  Layers,
  Calendar,
  FileText,
  ShoppingCart,
  Users,
  FileEdit,
  Settings,
  Building2,
  Archive,
  BarChart3,
  ChevronDown,
  ChevronRight,
  X,
  Menu,
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface NotificationCounts {
  quotes_awaiting_finalization: number;
  orders_requiring_action: number;
  inventory_low_stock: number;
  system_alerts: number;
}

interface Quote {
  id: string;
  status: string;
  due_at?: string;
}

interface Order {
  id: string;
  status: string;
  due_at?: string;
  balance_due: number;
}

interface InventoryItem {
  id: string;
  qty_on_hand: number;
  reorder_point: number;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchQuotesAwaitingFinalization = async (token: string): Promise<number> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/quotes`,
    {
      params: {
        status: 'REQUESTED',
        limit: 100,
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data.quotes?.length || 0;
};

const fetchOrdersRequiringAction = async (token: string): Promise<number> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/orders`,
    {
      params: {
        limit: 500,
        sort_by: 'due_at',
        sort_order: 'asc',
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const orders: Order[] = response.data.orders || [];
  const now = new Date();

  const overdueOrders = orders.filter(
    (order) =>
      order.due_at &&
      new Date(order.due_at) < now &&
      !['COMPLETED', 'CANCELLED'].includes(order.status)
  ).length;

  const balanceIssues = orders.filter(
    (order) => order.balance_due > 0 && order.status !== 'QUOTE_REQUESTED'
  ).length;

  return overdueOrders + balanceIssues;
};

const fetchInventoryAlerts = async (token: string): Promise<number> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/inventory-items`,
    {
      params: {
        low_stock: true,
        limit: 100,
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const items: InventoryItem[] = response.data.items || [];
  return items.filter((item) => item.qty_on_hand <= item.reorder_point).length;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const GV_AdminNav: React.FC = () => {
  // ============================================================================
  // STATE & HOOKS
  // ============================================================================

  const location = useLocation();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['overview']);

  // CRITICAL: Individual Zustand selectors (NO object destructuring)
  const authToken = useAppStore(
    (state) => state.authentication_state.auth_token
  );
  const featureFlags = useAppStore((state) => state.feature_flags);

  // ============================================================================
  // REACT QUERY - NOTIFICATION COUNTS
  // ============================================================================

  const { data: quotesCount = 0 } = useQuery({
    queryKey: ['admin-quotes-count'],
    queryFn: () => fetchQuotesAwaitingFinalization(authToken || ''),
    enabled: !!authToken,
    staleTime: 60000, // 1 minute
    refetchInterval: 60000, // Poll every minute
    retry: 1,
  });

  const { data: ordersCount = 0 } = useQuery({
    queryKey: ['admin-orders-count'],
    queryFn: () => fetchOrdersRequiringAction(authToken || ''),
    enabled: !!authToken,
    staleTime: 60000,
    refetchInterval: 60000,
    retry: 1,
  });

  const { data: inventoryCount = 0 } = useQuery({
    queryKey: ['admin-inventory-count'],
    queryFn: () => fetchInventoryAlerts(authToken || ''),
    enabled: !!authToken && featureFlags.inventory_management,
    staleTime: 300000, // 5 minutes
    refetchInterval: 300000,
    retry: 1,
  });

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen);
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    );
  };

  const handleLinkClick = () => {
    setIsDrawerOpen(false);
  };

  // Close drawer on route change
  useEffect(() => {
    setIsDrawerOpen(false);
  }, [location.pathname]);

  // ============================================================================
  // NAVIGATION STRUCTURE
  // ============================================================================

  const isActive = (path: string) => location.pathname === path;

  const navSections = [
    {
      id: 'overview',
      title: 'Overview',
      items: [
        {
          path: '/admin',
          label: 'Dashboard',
          icon: LayoutDashboard,
          badge: null,
        },
      ],
    },
    {
      id: 'content-services',
      title: 'Content & Services',
      items: [
        {
          path: '/admin/services',
          label: 'Services',
          icon: Package,
          badge: null,
        },
        {
          path: '/admin/pricing',
          label: 'Pricing',
          icon: DollarSign,
          badge: null,
        },
        {
          path: '/admin/tiers',
          label: 'Tiers',
          icon: Layers,
          badge: null,
        },
      ],
    },
    {
      id: 'operations',
      title: 'Operations',
      items: [
        {
          path: '/admin/calendar',
          label: 'Calendar',
          icon: Calendar,
          badge: null,
        },
        {
          path: '/admin/quotes',
          label: 'Quotes',
          icon: FileText,
          badge: quotesCount > 0 ? quotesCount : null,
        },
        {
          path: '/admin/orders',
          label: 'Orders',
          icon: ShoppingCart,
          badge: ordersCount > 0 ? ordersCount : null,
        },
      ],
    },
    {
      id: 'management',
      title: 'Management',
      items: [
        {
          path: '/admin/users',
          label: 'Users',
          icon: Users,
          badge: null,
        },
        {
          path: '/admin/content',
          label: 'Content',
          icon: FileEdit,
          badge: null,
        },
      ],
    },
    {
      id: 'system',
      title: 'System',
      items: [
        {
          path: '/admin/settings',
          label: 'Settings',
          icon: Settings,
          badge: null,
        },
      ],
    },
  ];

  // Phase 2 sections (conditional based on feature flags)
  const phase2Sections = [];

  if (featureFlags.b2b_accounts || featureFlags.inventory_management || featureFlags.analytics_dashboard) {
    const phase2Items = [];

    if (featureFlags.b2b_accounts) {
      phase2Items.push({
        path: '/admin/b2b',
        label: 'B2B Accounts',
        icon: Building2,
        badge: null,
      });
    }

    if (featureFlags.inventory_management) {
      phase2Items.push({
        path: '/admin/inventory',
        label: 'Inventory',
        icon: Archive,
        badge: inventoryCount > 0 ? inventoryCount : null,
      });
    }

    if (featureFlags.analytics_dashboard) {
      phase2Items.push({
        path: '/admin/analytics',
        label: 'Analytics',
        icon: BarChart3,
        badge: null,
      });
    }

    if (phase2Items.length > 0) {
      phase2Sections.push({
        id: 'phase2',
        title: 'Advanced Features',
        items: phase2Items,
      });
    }
  }

  const allSections = [...navSections, ...phase2Sections];

  // ============================================================================
  // RENDER FUNCTIONS (INLINE)
  // ============================================================================

  const renderNavItem = (item: any) => (
    <Link
      key={item.path}
      to={item.path}
      onClick={handleLinkClick}
      className={`flex items-center justify-between px-4 py-3 text-sm font-medium transition-all duration-200 rounded-lg group ${
        isActive(item.path)
          ? 'bg-yellow-400 text-black'
          : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      <div className="flex items-center gap-3">
        <item.icon
          className={`h-5 w-5 ${
            isActive(item.path) ? 'text-black' : 'text-gray-500 group-hover:text-gray-700'
          }`}
        />
        <span>{item.label}</span>
      </div>
      {item.badge !== null && item.badge > 0 && (
        <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-2 text-xs font-bold text-black bg-yellow-400 rounded-full">
          {item.badge > 99 ? '99+' : item.badge}
        </span>
      )}
    </Link>
  );

  const renderSection = (section: any) => {
    const isExpanded = expandedSections.includes(section.id);

    return (
      <div key={section.id} className="mb-6">
        <button
          onClick={() => toggleSection(section.id)}
          className="flex items-center justify-between w-full px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors"
        >
          <span>{section.title}</span>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
        {isExpanded && (
          <div className="mt-2 space-y-1">
            {section.items.map((item: any) => renderNavItem(item))}
          </div>
        )}
      </div>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      {/* Mobile Hamburger Button */}
      <button
        onClick={toggleDrawer}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        aria-label="Toggle navigation menu"
      >
        {isDrawerOpen ? (
          <X className="h-6 w-6 text-gray-700" />
        ) : (
          <Menu className="h-6 w-6 text-gray-700" />
        )}
      </button>

      {/* Mobile Overlay */}
      {isDrawerOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={toggleDrawer}
          aria-hidden="true"
        />
      )}

      {/* Navigation Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-white border-r border-gray-200 z-40 transform transition-transform duration-300 ease-in-out ${
          isDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 w-[80vw] max-w-[320px] lg:w-[260px] overflow-y-auto`}
      >
        {/* Logo / Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-6 z-10">
          <Link to="/admin" onClick={handleLinkClick}>
            <h2 className="text-2xl font-bold text-black">SultanStamp</h2>
            <p className="text-xs text-gray-500 mt-1">Admin Portal</p>
          </Link>
        </div>

        {/* Navigation Sections */}
        <nav className="px-3 py-6">
          {allSections.map((section) => renderSection(section))}
        </nav>

        {/* Footer Info */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
          <p className="text-xs text-gray-500">
            © 2024 SultanStamp
          </p>
        </div>
      </aside>

      {/* Spacer for desktop layout (prevents content from going under sidebar) */}
      <div className="hidden lg:block w-[260px] flex-shrink-0" aria-hidden="true" />
    </>
  );
};

export default GV_AdminNav;