import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface DateRange {
  start_date: string;
  end_date: string;
  preset: 'last_7_days' | 'last_30_days' | 'last_90_days' | 'custom';
}

interface FunnelMetrics {
  visitors: number;
  quotes_submitted: number;
  bookings_created: number;
  deposits_paid: number;
  orders_completed: number;
  conversion_rates: {
    visitor_to_quote: number;
    quote_to_booking: number;
    booking_to_payment: number;
    payment_to_completion: number;
  };
}

interface ServiceMetrics {
  top_by_revenue: Array<{
    service_name: string;
    revenue: number;
    order_count: number;
  }>;
  top_by_volume: Array<{
    service_name: string;
    order_count: number;
    avg_order_value: number;
  }>;
}

interface TurnaroundMetrics {
  by_tier: Array<{
    tier_name: string;
    avg_actual_days: number;
    promised_days: number;
    on_time_percentage: number;
  }>;
  overall_on_time_percentage: number;
}

interface EmergencyBookingMetrics {
  emergency_booking_count: number;
  standard_booking_count: number;
  urgent_fee_revenue: number;
  emergency_percentage: number;
}

interface RevenueMetrics {
  total_revenue: number;
  outstanding_amount: number;
  revenue_by_period: Array<{
    period: string;
    revenue: number;
    order_count: number;
  }>;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_AnalyticsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // CRITICAL: Individual Zustand selectors
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const featureFlags = useAppStore(state => state.feature_flags);

  // ============================================================================
  // ACCESS CONTROL
  // ============================================================================

  // Check feature flag and user role
  if (!featureFlags.analytics_dashboard) {
    navigate('/admin/settings');
    return null;
  }

  if (!currentUser || currentUser.role !== 'ADMIN') {
    navigate('/admin');
    return null;
  }

  // ============================================================================
  // LOCAL STATE
  // ============================================================================

  const getDefaultDateRange = (): DateRange => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    return {
      start_date: thirtyDaysAgo.toISOString().split('T')[0],
      end_date: today.toISOString().split('T')[0],
      preset: 'last_30_days',
    };
  };

  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const urlPreset = searchParams.get('date_range');
    if (urlPreset && ['last_7_days', 'last_30_days', 'last_90_days'].includes(urlPreset)) {
      const today = new Date();
      let daysAgo = 30;
      if (urlPreset === 'last_7_days') daysAgo = 7;
      if (urlPreset === 'last_90_days') daysAgo = 90;
      
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - daysAgo);

      return {
        start_date: startDate.toISOString().split('T')[0],
        end_date: today.toISOString().split('T')[0],
        preset: urlPreset as DateRange['preset'],
      };
    }
    return getDefaultDateRange();
  });

  const [selectedMetricFocus, setSelectedMetricFocus] = useState<string | null>(
    searchParams.get('metric')
  );
  const [exportLoading, setExportLoading] = useState(false);

  // ============================================================================
  // API CALLS WITH REACT QUERY
  // ============================================================================

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

  // Funnel Metrics
  const { data: funnelMetrics, isLoading: loadingFunnel, error: errorFunnel, refetch: refetchFunnel } = useQuery<FunnelMetrics>({
    queryKey: ['analytics-funnel', dateRange.start_date, dateRange.end_date],
    queryFn: async () => {
      const response = await axios.get(`${apiBaseUrl}/api/analytics/funnel`, {
        params: {
          start_date: dateRange.start_date,
          end_date: dateRange.end_date,
        },
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
    enabled: !!authToken,
  });

  // Service Metrics
  const { data: serviceMetrics, isLoading: loadingServices, error: errorServices, refetch: refetchServices } = useQuery<ServiceMetrics>({
    queryKey: ['analytics-services', dateRange.start_date, dateRange.end_date],
    queryFn: async () => {
      const response = await axios.get(`${apiBaseUrl}/api/analytics/services`, {
        params: {
          start_date: dateRange.start_date,
          end_date: dateRange.end_date,
        },
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
    enabled: !!authToken,
  });

  // Turnaround Metrics
  const { data: turnaroundMetrics, isLoading: loadingTurnaround, error: errorTurnaround, refetch: refetchTurnaround } = useQuery<TurnaroundMetrics>({
    queryKey: ['analytics-turnaround', dateRange.start_date, dateRange.end_date],
    queryFn: async () => {
      const response = await axios.get(`${apiBaseUrl}/api/analytics/turnaround`, {
        params: {
          start_date: dateRange.start_date,
          end_date: dateRange.end_date,
        },
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
    enabled: !!authToken,
  });

  // Emergency Booking Metrics
  const { data: emergencyMetrics, isLoading: loadingEmergency, error: errorEmergency, refetch: refetchEmergency } = useQuery<EmergencyBookingMetrics>({
    queryKey: ['analytics-emergency', dateRange.start_date, dateRange.end_date],
    queryFn: async () => {
      const response = await axios.get(`${apiBaseUrl}/api/analytics/emergency-bookings`, {
        params: {
          start_date: dateRange.start_date,
          end_date: dateRange.end_date,
        },
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
    enabled: !!authToken,
  });

  // Revenue Metrics
  const { data: revenueMetrics, isLoading: loadingRevenue, error: errorRevenue, refetch: refetchRevenue } = useQuery<RevenueMetrics>({
    queryKey: ['analytics-revenue', dateRange.start_date, dateRange.end_date],
    queryFn: async () => {
      const response = await axios.get(`${apiBaseUrl}/api/analytics/revenue`, {
        params: {
          start_date: dateRange.start_date,
          end_date: dateRange.end_date,
          group_by: 'week',
        },
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
    enabled: !!authToken,
  });

  const isLoadingAnalytics = loadingFunnel || loadingServices || loadingTurnaround || loadingEmergency || loadingRevenue;

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const keyMetrics = useMemo(() => {
    if (!revenueMetrics || !funnelMetrics) return null;

    const totalOrders = funnelMetrics.orders_completed;
    const avgOrderValue = totalOrders > 0 ? revenueMetrics.total_revenue / totalOrders : 0;
    const conversionRate = funnelMetrics.visitors > 0 
      ? (funnelMetrics.orders_completed / funnelMetrics.visitors) * 100 
      : 0;

    return {
      totalRevenue: revenueMetrics.total_revenue,
      totalOrders: totalOrders,
      avgOrderValue: avgOrderValue,
      conversionRate: conversionRate,
      outstandingBalance: revenueMetrics.outstanding_amount,
      onTimeDelivery: turnaroundMetrics?.overall_on_time_percentage || 0,
    };
  }, [revenueMetrics, funnelMetrics, turnaroundMetrics]);

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const handleDatePresetChange = (preset: DateRange['preset']) => {
    const today = new Date();
    let daysAgo = 30;

    if (preset === 'last_7_days') daysAgo = 7;
    if (preset === 'last_30_days') daysAgo = 30;
    if (preset === 'last_90_days') daysAgo = 90;

    const startDate = new Date(today);
    startDate.setDate(today.getDate() - daysAgo);

    const newRange: DateRange = {
      start_date: startDate.toISOString().split('T')[0],
      end_date: today.toISOString().split('T')[0],
      preset: preset,
    };

    setDateRange(newRange);
    setSearchParams({ date_range: preset });
  };

  const handleCustomDateChange = (field: 'start_date' | 'end_date', value: string) => {
    const newRange = {
      ...dateRange,
      [field]: value,
      preset: 'custom' as const,
    };

    // Validate dates
    if (newRange.start_date && newRange.end_date && new Date(newRange.start_date) <= new Date(newRange.end_date)) {
      setDateRange(newRange);
      setSearchParams({ date_range: 'custom' });
    }
  };

  const handleRefreshAll = () => {
    refetchFunnel();
    refetchServices();
    refetchTurnaround();
    refetchEmergency();
    refetchRevenue();
  };

  const handleExportData = () => {
    if (!funnelMetrics || !serviceMetrics || !turnaroundMetrics || !emergencyMetrics || !revenueMetrics) {
      return;
    }

    setExportLoading(true);

    try {
      // Create CSV content
      let csvContent = 'SultanStamp Analytics Export\n';
      csvContent += `Date Range: ${dateRange.start_date} to ${dateRange.end_date}\n\n`;

      // Funnel Metrics
      csvContent += 'Conversion Funnel\n';
      csvContent += 'Stage,Count,Conversion Rate\n';
      csvContent += `Visitors,${funnelMetrics.visitors},-\n`;
      csvContent += `Quotes Submitted,${funnelMetrics.quotes_submitted},${(funnelMetrics.conversion_rates.visitor_to_quote * 100).toFixed(2)}%\n`;
      csvContent += `Bookings Created,${funnelMetrics.bookings_created},${(funnelMetrics.conversion_rates.quote_to_booking * 100).toFixed(2)}%\n`;
      csvContent += `Deposits Paid,${funnelMetrics.deposits_paid},${(funnelMetrics.conversion_rates.booking_to_payment * 100).toFixed(2)}%\n`;
      csvContent += `Orders Completed,${funnelMetrics.orders_completed},${(funnelMetrics.conversion_rates.payment_to_completion * 100).toFixed(2)}%\n\n`;

      // Revenue Metrics
      csvContent += 'Revenue Summary\n';
      csvContent += `Total Revenue,€${revenueMetrics.total_revenue.toFixed(2)}\n`;
      csvContent += `Outstanding Balance,€${revenueMetrics.outstanding_amount.toFixed(2)}\n\n`;

      // Service Performance
      csvContent += 'Top Services by Revenue\n';
      csvContent += 'Service,Revenue,Order Count\n';
      serviceMetrics.top_by_revenue.forEach(service => {
        csvContent += `${service.service_name},€${service.revenue.toFixed(2)},${service.order_count}\n`;
      });
      csvContent += '\n';

      // Turnaround Analysis
      csvContent += 'Turnaround Time Analysis\n';
      csvContent += 'Tier,Avg Actual Days,Promised Days,On-Time %\n';
      turnaroundMetrics.by_tier.forEach(tier => {
        csvContent += `${tier.tier_name},${tier.avg_actual_days.toFixed(1)},${tier.promised_days},${tier.on_time_percentage.toFixed(1)}%\n`;
      });

      // Create download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `sultanstamp-analytics-${dateRange.start_date}-to-${dateRange.end_date}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setExportLoading(false);
    }
  };

  const handleFocusMetric = (metric: string) => {
    setSelectedMetricFocus(selectedMetricFocus === metric ? null : metric);
    if (selectedMetricFocus !== metric) {
      setSearchParams({ metric: metric, date_range: dateRange.preset });
    } else {
      setSearchParams({ date_range: dateRange.preset });
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">Analytics Dashboard</h1>
                <p className="mt-2 text-base text-gray-600">
                  Business intelligence and performance metrics
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleRefreshAll}
                  disabled={isLoadingAnalytics}
                  className="inline-flex items-center px-4 py-2 rounded-lg border-2 border-gray-300 bg-white text-gray-900 font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className={`w-5 h-5 mr-2 ${isLoadingAnalytics ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>

                <button
                  onClick={handleExportData}
                  disabled={exportLoading || isLoadingAnalytics || !keyMetrics}
                  className="inline-flex items-center px-6 py-2 rounded-lg bg-yellow-400 text-black font-bold hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {exportLoading ? (
                    <>
                      <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Exporting...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Export CSV
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Date Range Picker */}
            <div className="mt-6 bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Date Range</h3>
              
              {/* Preset Buttons */}
              <div className="flex flex-wrap gap-2 mb-4">
                {[
                  { value: 'last_7_days', label: 'Last 7 Days' },
                  { value: 'last_30_days', label: 'Last 30 Days' },
                  { value: 'last_90_days', label: 'Last 90 Days' },
                ].map(preset => (
                  <button
                    key={preset.value}
                    onClick={() => handleDatePresetChange(preset.value as DateRange['preset'])}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      dateRange.preset === preset.value
                        ? 'bg-black text-white'
                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Custom Date Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={dateRange.start_date}
                    onChange={(e) => handleCustomDateChange('start_date', e.target.value)}
                    max={dateRange.end_date}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={dateRange.end_date}
                    onChange={(e) => handleCustomDateChange('end_date', e.target.value)}
                    min={dateRange.start_date}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {isLoadingAnalytics && (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4">
                <svg className="animate-spin h-16 w-16 text-yellow-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-lg font-medium text-gray-900">Loading analytics data...</p>
              </div>
            </div>
          )}

          {/* Error States */}
          {(errorFunnel || errorServices || errorTurnaround || errorEmergency || errorRevenue) && !isLoadingAnalytics && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 mb-8">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="text-lg font-semibold text-red-900 mb-2">Failed to load analytics data</h3>
                  <p className="text-sm text-red-700 mb-4">
                    Some analytics data could not be loaded. Please try refreshing the page.
                  </p>
                  <button
                    onClick={handleRefreshAll}
                    className="inline-flex items-center px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Main Content */}
          {!isLoadingAnalytics && keyMetrics && (
            <>
              {/* Key Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <div
                  onClick={() => handleFocusMetric('revenue')}
                  className={`bg-white rounded-xl shadow-lg border-2 p-6 transition-all cursor-pointer hover:shadow-xl ${
                    selectedMetricFocus === 'revenue' ? 'border-yellow-400 ring-4 ring-yellow-100' : 'border-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Revenue</h3>
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-4xl font-bold text-gray-900">€{keyMetrics.totalRevenue.toFixed(2)}</p>
                  <p className="text-sm text-gray-600 mt-2">{dateRange.preset.replace('_', ' ')}</p>
                </div>

                <div
                  onClick={() => handleFocusMetric('orders')}
                  className={`bg-white rounded-xl shadow-lg border-2 p-6 transition-all cursor-pointer hover:shadow-xl ${
                    selectedMetricFocus === 'orders' ? 'border-yellow-400 ring-4 ring-yellow-100' : 'border-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Orders</h3>
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <p className="text-4xl font-bold text-gray-900">{keyMetrics.totalOrders}</p>
                  <p className="text-sm text-gray-600 mt-2">Completed orders</p>
                </div>

                <div
                  onClick={() => handleFocusMetric('aov')}
                  className={`bg-white rounded-xl shadow-lg border-2 p-6 transition-all cursor-pointer hover:shadow-xl ${
                    selectedMetricFocus === 'aov' ? 'border-yellow-400 ring-4 ring-yellow-100' : 'border-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Avg Order Value</h3>
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <p className="text-4xl font-bold text-gray-900">€{keyMetrics.avgOrderValue.toFixed(2)}</p>
                  <p className="text-sm text-gray-600 mt-2">Per completed order</p>
                </div>

                <div
                  onClick={() => handleFocusMetric('conversion')}
                  className={`bg-white rounded-xl shadow-lg border-2 p-6 transition-all cursor-pointer hover:shadow-xl ${
                    selectedMetricFocus === 'conversion' ? 'border-yellow-400 ring-4 ring-yellow-100' : 'border-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Conversion Rate</h3>
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <p className="text-4xl font-bold text-gray-900">{keyMetrics.conversionRate.toFixed(2)}%</p>
                  <p className="text-sm text-gray-600 mt-2">Visitors to orders</p>
                </div>

                <div
                  onClick={() => handleFocusMetric('outstanding')}
                  className={`bg-white rounded-xl shadow-lg border-2 p-6 transition-all cursor-pointer hover:shadow-xl ${
                    selectedMetricFocus === 'outstanding' ? 'border-yellow-400 ring-4 ring-yellow-100' : 'border-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Outstanding Balance</h3>
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-4xl font-bold text-gray-900">€{keyMetrics.outstandingBalance.toFixed(2)}</p>
                  <p className="text-sm text-gray-600 mt-2">Pending payments</p>
                </div>

                <div
                  onClick={() => handleFocusMetric('ontime')}
                  className={`bg-white rounded-xl shadow-lg border-2 p-6 transition-all cursor-pointer hover:shadow-xl ${
                    selectedMetricFocus === 'ontime' ? 'border-yellow-400 ring-4 ring-yellow-100' : 'border-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">On-Time Delivery</h3>
                    <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-4xl font-bold text-gray-900">{keyMetrics.onTimeDelivery.toFixed(1)}%</p>
                  <p className="text-sm text-gray-600 mt-2">Meeting SLA targets</p>
                </div>
              </div>

              {/* Conversion Funnel */}
              {funnelMetrics && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Conversion Funnel</h2>
                  
                  <div className="space-y-4">
                    {[
                      { label: 'Visitors', count: funnelMetrics.visitors, width: 100, color: 'bg-blue-500' },
                      { label: 'Quotes Submitted', count: funnelMetrics.quotes_submitted, width: (funnelMetrics.quotes_submitted / funnelMetrics.visitors) * 100, color: 'bg-indigo-500', rate: funnelMetrics.conversion_rates.visitor_to_quote },
                      { label: 'Bookings Created', count: funnelMetrics.bookings_created, width: (funnelMetrics.bookings_created / funnelMetrics.visitors) * 100, color: 'bg-purple-500', rate: funnelMetrics.conversion_rates.quote_to_booking },
                      { label: 'Deposits Paid', count: funnelMetrics.deposits_paid, width: (funnelMetrics.deposits_paid / funnelMetrics.visitors) * 100, color: 'bg-pink-500', rate: funnelMetrics.conversion_rates.booking_to_payment },
                      { label: 'Orders Completed', count: funnelMetrics.orders_completed, width: (funnelMetrics.orders_completed / funnelMetrics.visitors) * 100, color: 'bg-green-500', rate: funnelMetrics.conversion_rates.payment_to_completion },
                    ].map((stage, index) => (
                      <div key={index} className="group">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-gray-900">{stage.label}</span>
                          <div className="flex items-center gap-4">
                            <span className="text-lg font-bold text-gray-900">{stage.count}</span>
                            {stage.rate !== undefined && (
                              <span className="text-sm font-medium text-gray-600">
                                {(stage.rate * 100).toFixed(1)}% conversion
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden">
                          <div
                            className={`${stage.color} h-8 rounded-full transition-all duration-500 flex items-center justify-end pr-4`}
                            style={{ width: `${stage.width}%` }}
                          >
                            <span className="text-xs font-bold text-white">
                              {stage.width.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Service Performance */}
              {serviceMetrics && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                  <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Top Services by Revenue</h2>
                    
                    <div className="space-y-4">
                      {serviceMetrics.top_by_revenue.slice(0, 5).map((service, index) => {
                        const maxRevenue = serviceMetrics.top_by_revenue[0]?.revenue || 1;
                        const widthPercent = (service.revenue / maxRevenue) * 100;
                        
                        return (
                          <div key={index}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-semibold text-gray-900">{service.service_name}</span>
                              <div className="flex items-center gap-4">
                                <span className="text-sm font-medium text-gray-600">
                                  {service.order_count} orders
                                </span>
                                <span className="text-lg font-bold text-gray-900">
                                  €{service.revenue.toFixed(2)}
                                </span>
                              </div>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                              <div
                                className="bg-green-500 h-6 rounded-full transition-all duration-500"
                                style={{ width: `${widthPercent}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Top Services by Volume</h2>
                    
                    <div className="space-y-4">
                      {serviceMetrics.top_by_volume.slice(0, 5).map((service, index) => {
                        const maxCount = serviceMetrics.top_by_volume[0]?.order_count || 1;
                        const widthPercent = (service.order_count / maxCount) * 100;
                        
                        return (
                          <div key={index}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-semibold text-gray-900">{service.service_name}</span>
                              <div className="flex items-center gap-4">
                                <span className="text-sm font-medium text-gray-600">
                                  Avg €{service.avg_order_value.toFixed(2)}
                                </span>
                                <span className="text-lg font-bold text-gray-900">
                                  {service.order_count} orders
                                </span>
                              </div>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                              <div
                                className="bg-blue-500 h-6 rounded-full transition-all duration-500"
                                style={{ width: `${widthPercent}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Turnaround Time Analysis */}
              {turnaroundMetrics && turnaroundMetrics.by_tier.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Turnaround Time Analysis</h2>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                            Tier
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                            Avg Actual Days
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                            Promised Days
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                            On-Time %
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                            Performance
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {turnaroundMetrics.by_tier.map((tier, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm font-semibold text-gray-900">{tier.tier_name}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-900">{tier.avg_actual_days.toFixed(1)}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-900">{tier.promised_days}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`text-sm font-semibold ${
                                tier.on_time_percentage >= 90 ? 'text-green-600' :
                                tier.on_time_percentage >= 70 ? 'text-yellow-600' :
                                'text-red-600'
                              }`}>
                                {tier.on_time_percentage.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="w-32 bg-gray-200 rounded-full h-4 overflow-hidden">
                                <div
                                  className={`h-4 rounded-full ${
                                    tier.on_time_percentage >= 90 ? 'bg-green-500' :
                                    tier.on_time_percentage >= 70 ? 'bg-yellow-500' :
                                    'bg-red-500'
                                  }`}
                                  style={{ width: `${Math.min(tier.on_time_percentage, 100)}%` }}
                                ></div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm font-semibold text-gray-900">
                      Overall On-Time Delivery: 
                      <span className={`ml-2 text-lg ${
                        turnaroundMetrics.overall_on_time_percentage >= 90 ? 'text-green-600' :
                        turnaroundMetrics.overall_on_time_percentage >= 70 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {turnaroundMetrics.overall_on_time_percentage.toFixed(1)}%
                      </span>
                    </p>
                  </div>
                </div>
              )}

              {/* Emergency Booking Stats */}
              {emergencyMetrics && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Emergency Booking Utilization</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-6 bg-orange-50 rounded-lg border-2 border-orange-200">
                      <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">Emergency Bookings</p>
                      <p className="text-4xl font-bold text-orange-600">{emergencyMetrics.emergency_booking_count}</p>
                      <p className="text-sm text-gray-600 mt-2">
                        {emergencyMetrics.emergency_percentage.toFixed(1)}% of total
                      </p>
                    </div>

                    <div className="text-center p-6 bg-blue-50 rounded-lg border-2 border-blue-200">
                      <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">Standard Bookings</p>
                      <p className="text-4xl font-bold text-blue-600">{emergencyMetrics.standard_booking_count}</p>
                      <p className="text-sm text-gray-600 mt-2">
                        {(100 - emergencyMetrics.emergency_percentage).toFixed(1)}% of total
                      </p>
                    </div>

                    <div className="text-center p-6 bg-green-50 rounded-lg border-2 border-green-200">
                      <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">Urgent Fee Revenue</p>
                      <p className="text-4xl font-bold text-green-600">€{emergencyMetrics.urgent_fee_revenue.toFixed(2)}</p>
                      <p className="text-sm text-gray-600 mt-2">From emergency bookings</p>
                    </div>
                  </div>

                  {/* Visual comparison */}
                  <div className="mt-6">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 bg-orange-500 h-12 rounded-lg flex items-center justify-center" style={{ width: `${emergencyMetrics.emergency_percentage}%` }}>
                        <span className="text-xs font-bold text-white">Emergency {emergencyMetrics.emergency_percentage.toFixed(0)}%</span>
                      </div>
                      <div className="flex-1 bg-blue-500 h-12 rounded-lg flex items-center justify-center" style={{ width: `${100 - emergencyMetrics.emergency_percentage}%` }}>
                        <span className="text-xs font-bold text-white">Standard {(100 - emergencyMetrics.emergency_percentage).toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Revenue Trend */}
              {revenueMetrics && revenueMetrics.revenue_by_period.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Revenue Trend</h2>
                  
                  <div className="space-y-3">
                    {revenueMetrics.revenue_by_period.map((period, index) => {
                      const maxRevenue = Math.max(...revenueMetrics.revenue_by_period.map(p => p.revenue));
                      const widthPercent = (period.revenue / maxRevenue) * 100;
                      
                      return (
                        <div key={index}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-semibold text-gray-900">{period.period}</span>
                            <div className="flex items-center gap-4">
                              <span className="text-xs font-medium text-gray-600">
                                {period.order_count} orders
                              </span>
                              <span className="text-base font-bold text-gray-900">
                                €{period.revenue.toFixed(2)}
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-yellow-400 to-yellow-500 h-6 rounded-full transition-all duration-500"
                              style={{ width: `${widthPercent}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-900">Period Total:</span>
                      <span className="text-xl font-bold text-gray-900">
                        €{revenueMetrics.revenue_by_period.reduce((sum, p) => sum + p.revenue, 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default UV_AnalyticsDashboard;