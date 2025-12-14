import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { Calendar, ChevronLeft, ChevronRight, Clock, MapPin, AlertTriangle } from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface CalendarBooking {
  id: string;
  start_at: string;
  end_at: string;
  customer_id: string;
  customer_name: string;
  order_id: string;
  service_name: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  is_emergency: boolean;
  urgent_fee_pct: number | null;
  location_id: string | null;
}

interface CapacityIndicator {
  date: string;
  standard_slots_used: number;
  emergency_slots_used: number;
  max_standard_slots: number;
  max_emergency_slots: number;
}

interface Service {
  id: string;
  name: string;
}

// ============================================================================
// DATE UTILITY FUNCTIONS
// ============================================================================

const getStartOfWeek = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  return new Date(d.setDate(diff));
};

const getEndOfWeek = (date: Date): Date => {
  const start = getStartOfWeek(date);
  return new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
};

const getStartOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

const getEndOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
};

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const formatDateForAPI = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const getDateRangeForView = (currentDate: Date, view: string): { start: Date; end: Date } => {
  switch (view) {
    case 'month':
      return { start: getStartOfMonth(currentDate), end: getEndOfMonth(currentDate) };
    case 'day':
      return { start: currentDate, end: currentDate };
    case 'week':
    default:
      return { start: getStartOfWeek(currentDate), end: getEndOfWeek(currentDate) };
  }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_StaffCalendar: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // CRITICAL: Individual selectors to avoid infinite loops
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const staffPermissions = currentUser?.staff_profile?.permissions || {};

  // URL-driven state
  const urlView = searchParams.get('view') || 'week';
  const urlDate = searchParams.get('date') || formatDateForAPI(new Date());
  const urlServiceFilter = searchParams.get('service_type') || null;

  // Local state
  const [calendar_view, setCalendarView] = useState<string>(urlView);
  const [current_date, setCurrentDate] = useState<Date>(new Date(urlDate));
  const [selected_service_filter, setSelectedServiceFilter] = useState<string | null>(urlServiceFilter);
  const [selected_booking, setSelectedBooking] = useState<CalendarBooking | null>(null);

  // Calculate date range based on view
  const dateRange = useMemo(() => {
    return getDateRangeForView(current_date, calendar_view);
  }, [current_date, calendar_view]);

  // ============================================================================
  // API CALLS
  // ============================================================================

  // Fetch calendar bookings
  const { data: bookingsData, isLoading: isLoadingBookings, error: bookingsError } = useQuery({
    queryKey: ['calendar_bookings', formatDateForAPI(dateRange.start), formatDateForAPI(dateRange.end), selected_service_filter],
    queryFn: async () => {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/bookings`,
        {
          params: {
            start_date: formatDateForAPI(dateRange.start),
            end_date: formatDateForAPI(dateRange.end),
            status: 'CONFIRMED',
            ...(selected_service_filter && { service_id: selected_service_filter }),
          },
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      return response.data.bookings.map((booking: any) => ({
        id: booking.id,
        start_at: booking.start_at,
        end_at: booking.end_at,
        customer_id: booking.customer_id,
        customer_name: booking.customer_name || 'Unknown Customer',
        order_id: booking.order_id,
        service_name: booking.service_name || 'Service',
        status: booking.status,
        is_emergency: booking.is_emergency,
        urgent_fee_pct: booking.urgent_fee_pct,
        location_id: booking.location_id,
      })) as CalendarBooking[];
    },
    enabled: !!authToken,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  // Fetch capacity data
  const { data: capacityData } = useQuery({
    queryKey: ['calendar_capacity'],
    queryFn: async () => {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/calendar-capacity`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      // Process capacity rules into daily indicators
      const capacityByDate: Record<string, CapacityIndicator> = {};
      const rules = response.data.capacity || [];

      // For each day in current view range
      let currentDay = new Date(dateRange.start);
      while (currentDay <= dateRange.end) {
        const dayOfWeek = currentDay.getDay();
        const dateKey = formatDateForAPI(currentDay);

        // Find matching capacity rule for this day of week
        const matchingRule = rules.find((rule: any) => rule.day_of_week === dayOfWeek && rule.is_active);

        if (matchingRule) {
          capacityByDate[dateKey] = {
            date: dateKey,
            max_standard_slots: Number(matchingRule.max_standard_slots || 0),
            max_emergency_slots: Number(matchingRule.max_emergency_slots || 0),
            standard_slots_used: 0,
            emergency_slots_used: 0,
          };
        } else {
          capacityByDate[dateKey] = {
            date: dateKey,
            max_standard_slots: 0,
            max_emergency_slots: 0,
            standard_slots_used: 0,
            emergency_slots_used: 0,
          };
        }

        currentDay = addDays(currentDay, 1);
      }

      // Count bookings per day
      if (bookingsData) {
        bookingsData.forEach((booking: CalendarBooking) => {
          const bookingDate = formatDateForAPI(new Date(booking.start_at));
          if (capacityByDate[bookingDate]) {
            if (booking.is_emergency) {
              capacityByDate[bookingDate].emergency_slots_used += 1;
            } else {
              capacityByDate[bookingDate].standard_slots_used += 1;
            }
          }
        });
      }

      return capacityByDate;
    },
    enabled: !!authToken && !!bookingsData,
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });

  // Fetch services for filter dropdown
  const { data: servicesData } = useQuery({
    queryKey: ['services_list'],
    queryFn: async () => {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/services`,
        {
          params: {
            is_active: true,
          },
        }
      );
      return response.data.services as Service[];
    },
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleViewChange = (newView: string) => {
    setCalendarView(newView);
    const params = new URLSearchParams(searchParams);
    params.set('view', newView);
    setSearchParams(params);
  };

  const handleDateNavigate = (direction: 'prev' | 'next') => {
    let newDate: Date;
    switch (calendar_view) {
      case 'month':
        newDate = new Date(current_date);
        newDate.setMonth(current_date.getMonth() + (direction === 'next' ? 1 : -1));
        break;
      case 'day':
        newDate = addDays(current_date, direction === 'next' ? 1 : -1);
        break;
      case 'week':
      default:
        newDate = addDays(current_date, direction === 'next' ? 7 : -7);
        break;
    }
    setCurrentDate(newDate);
    const params = new URLSearchParams(searchParams);
    params.set('date', formatDateForAPI(newDate));
    setSearchParams(params);
  };

  const handleDatePick = (dateString: string) => {
    const newDate = new Date(dateString);
    setCurrentDate(newDate);
    const params = new URLSearchParams(searchParams);
    params.set('date', formatDateForAPI(newDate));
    setSearchParams(params);
  };

  const handleServiceFilter = (serviceId: string | null) => {
    setSelectedServiceFilter(serviceId);
    const params = new URLSearchParams(searchParams);
    if (serviceId) {
      params.set('service_type', serviceId);
    } else {
      params.delete('service_type');
    }
    setSearchParams(params);
  };

  const handleBookingClick = (booking: CalendarBooking) => {
    setSelectedBooking(booking);
  };

  const closeBookingModal = () => {
    setSelectedBooking(null);
  };

  // Get booking color classes
  const getBookingColorClass = (booking: CalendarBooking): string => {
    if (booking.is_emergency) {
      return 'bg-red-100 border-red-500 text-red-900';
    }
    switch (booking.status) {
      case 'CONFIRMED':
        return 'bg-green-100 border-green-500 text-green-900';
      case 'PENDING':
        return 'bg-yellow-100 border-yellow-500 text-yellow-900';
      default:
        return 'bg-gray-100 border-gray-500 text-gray-900';
    }
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderWeekView = () => {
    const weekDays = [];
    let currentDay = new Date(dateRange.start);

    for (let i = 0; i < 7; i++) {
      weekDays.push(new Date(currentDay));
      currentDay = addDays(currentDay, 1);
    }

    return (
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day, index) => {
          const dateKey = formatDateForAPI(day);
          const dayBookings = (bookingsData || []).filter((booking: CalendarBooking) => {
            const bookingDate = formatDateForAPI(new Date(booking.start_at));
            return bookingDate === dateKey;
          });
          const capacity = capacityData?.[dateKey];

          return (
            <div key={index} className="border border-gray-200 rounded-lg bg-white min-h-[300px]">
              {/* Day header */}
              <div className="p-3 border-b border-gray-200 bg-gray-50">
                <div className="text-sm font-semibold text-gray-900">
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className="text-lg font-bold text-gray-900">
                  {day.getDate()}
                </div>
                {capacity && (
                  <div className="text-xs text-gray-600 mt-1">
                    {capacity.standard_slots_used + capacity.emergency_slots_used}/
                    {capacity.max_standard_slots + capacity.max_emergency_slots} slots
                  </div>
                )}
              </div>

              {/* Bookings */}
              <div className="p-2 space-y-2">
                {dayBookings.length === 0 ? (
                  <div className="text-xs text-gray-500 text-center py-4">No bookings</div>
                ) : (
                  dayBookings.map((booking: CalendarBooking) => (
                    <button
                      key={booking.id}
                      onClick={() => handleBookingClick(booking)}
                      className={`w-full text-left p-2 rounded border-l-4 text-xs transition-all hover:shadow-md ${getBookingColorClass(
                        booking
                      )}`}
                    >
                      <div className="font-semibold truncate">{formatTime(booking.start_at)}</div>
                      <div className="truncate">{booking.customer_name}</div>
                      <div className="truncate text-[10px] opacity-75">{booking.service_name}</div>
                      {booking.is_emergency && (
                        <div className="flex items-center gap-1 mt-1">
                          <AlertTriangle className="h-3 w-3" />
                          <span className="text-[10px] font-bold">EMERGENCY</span>
                        </div>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderMonthView = () => {
    const monthStart = getStartOfMonth(current_date);
    const monthEnd = getEndOfMonth(current_date);
    const calendarStart = getStartOfWeek(monthStart);
    const calendarEnd = getEndOfWeek(monthEnd);

    const weeks = [];
    let currentWeekStart = new Date(calendarStart);

    while (currentWeekStart <= calendarEnd) {
      const weekDays = [];
      for (let i = 0; i < 7; i++) {
        weekDays.push(addDays(currentWeekStart, i));
      }
      weeks.push(weekDays);
      currentWeekStart = addDays(currentWeekStart, 7);
    }

    return (
      <div className="space-y-2">
        {/* Day labels */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <div key={day} className="text-center text-sm font-semibold text-gray-700">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-2">
            {week.map((day, dayIndex) => {
              const dateKey = formatDateForAPI(day);
              const isCurrentMonth = day.getMonth() === current_date.getMonth();
              const dayBookings = (bookingsData || []).filter((booking: CalendarBooking) => {
                const bookingDate = formatDateForAPI(new Date(booking.start_at));
                return bookingDate === dateKey;
              });

              return (
                <button
                  key={dayIndex}
                  onClick={() => handleDatePick(dateKey)}
                  className={`border border-gray-200 rounded-lg p-3 min-h-[80px] text-left transition-all hover:border-black ${
                    isCurrentMonth ? 'bg-white' : 'bg-gray-50 opacity-50'
                  }`}
                >
                  <div className="text-sm font-semibold text-gray-900">{day.getDate()}</div>
                  {dayBookings.length > 0 && (
                    <div className="mt-1">
                      <div className="text-xs bg-black text-white rounded px-1 py-0.5 inline-block">
                        {dayBookings.length} booking{dayBookings.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  const renderDayView = () => {
    const dateKey = formatDateForAPI(current_date);
    const dayBookings = (bookingsData || []).filter((booking: CalendarBooking) => {
      const bookingDate = formatDateForAPI(new Date(booking.start_at));
      return bookingDate === dateKey;
    });
    const capacity = capacityData?.[dateKey];

    return (
      <div className="space-y-4">
        {/* Day header with capacity */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                {current_date.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </h3>
            </div>
            {capacity && (
              <div className="text-right">
                <div className="text-sm text-gray-600">Capacity</div>
                <div className="text-2xl font-bold text-gray-900">
                  {capacity.standard_slots_used + capacity.emergency_slots_used}/
                  {capacity.max_standard_slots + capacity.max_emergency_slots}
                </div>
                <div className="text-xs text-gray-500">slots used</div>
              </div>
            )}
          </div>
        </div>

        {/* Bookings list */}
        <div className="space-y-3">
          {dayBookings.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No bookings for this day</p>
            </div>
          ) : (
            dayBookings.map((booking: CalendarBooking) => (
              <button
                key={booking.id}
                onClick={() => handleBookingClick(booking)}
                className={`w-full text-left p-6 rounded-lg border-l-4 transition-all hover:shadow-lg ${getBookingColorClass(
                  booking
                )}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Clock className="h-5 w-5" />
                      <span className="text-lg font-bold">
                        {formatTime(booking.start_at)} - {formatTime(booking.end_at)}
                      </span>
                    </div>
                    <div className="text-xl font-bold mb-1">{booking.customer_name}</div>
                    <div className="text-sm opacity-75">{booking.service_name}</div>
                    {booking.location_id && (
                      <div className="flex items-center gap-1 mt-2 text-xs">
                        <MapPin className="h-3 w-3" />
                        <span>Location booking</span>
                      </div>
                    )}
                  </div>
                  {booking.is_emergency && (
                    <div className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      EMERGENCY
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  const is_loading_calendar = isLoadingBookings;

  return (
    <>
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Staff Calendar</h1>
            <p className="text-gray-600">View and manage bookings and capacity</p>
          </div>

          {/* Controls Bar */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              {/* Date Navigation */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleDateNavigate('prev')}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                  aria-label="Previous"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                <input
                  type="date"
                  value={formatDateForAPI(current_date)}
                  onChange={(e) => handleDatePick(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                />

                <button
                  onClick={() => handleDateNavigate('next')}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                  aria-label="Next"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>

                <button
                  onClick={() => handleDatePick(formatDateForAPI(new Date()))}
                  className="px-4 py-2 bg-gray-100 text-gray-900 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Today
                </button>
              </div>

              {/* View Toggle & Filters */}
              <div className="flex items-center gap-3">
                {/* Service Filter */}
                <select
                  value={selected_service_filter || ''}
                  onChange={(e) => handleServiceFilter(e.target.value || null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                >
                  <option value="">All Services</option>
                  {(servicesData || []).map((service: Service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>

                {/* View Toggle */}
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                  {['Day', 'Week', 'Month'].map((view) => (
                    <button
                      key={view}
                      onClick={() => handleViewChange(view.toLowerCase())}
                      className={`px-4 py-2 rounded-md font-medium transition-colors ${
                        calendar_view === view.toLowerCase()
                          ? 'bg-black text-white'
                          : 'text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {view}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Calendar Display */}
          {is_loading_calendar ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
              <p className="text-gray-600">Loading calendar...</p>
            </div>
          ) : bookingsError ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <p className="text-red-700">Failed to load calendar data. Please try again.</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              {calendar_view === 'day' && renderDayView()}
              {calendar_view === 'week' && renderWeekView()}
              {calendar_view === 'month' && renderMonthView()}
            </div>
          )}

          {/* Legend */}
          <div className="mt-6 bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="font-semibold text-gray-700">Legend:</span>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-100 border-2 border-green-500 rounded"></div>
                <span className="text-gray-700">Confirmed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-100 border-2 border-yellow-500 rounded"></div>
                <span className="text-gray-700">Pending</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-100 border-2 border-red-500 rounded"></div>
                <span className="text-gray-700">Emergency</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Detail Modal */}
      {selected_booking && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={closeBookingModal}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-2xl font-bold text-gray-900">Booking Details</h3>
              <button
                onClick={closeBookingModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Customer Info */}
              <div>
                <div className="text-sm text-gray-600 mb-1">Customer</div>
                <div className="text-lg font-semibold text-gray-900">{selected_booking.customer_name}</div>
              </div>

              {/* Service Info */}
              <div>
                <div className="text-sm text-gray-600 mb-1">Service</div>
                <div className="text-lg font-semibold text-gray-900">{selected_booking.service_name}</div>
              </div>

              {/* Time Info */}
              <div>
                <div className="text-sm text-gray-600 mb-1">Time</div>
                <div className="flex items-center gap-2 text-gray-900">
                  <Clock className="h-5 w-5" />
                  <span>
                    {formatTime(selected_booking.start_at)} - {formatTime(selected_booking.end_at)}
                  </span>
                </div>
              </div>

              {/* Status Badge */}
              <div>
                <div className="text-sm text-gray-600 mb-1">Status</div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      selected_booking.is_emergency
                        ? 'bg-red-600 text-white'
                        : selected_booking.status === 'CONFIRMED'
                        ? 'bg-green-600 text-white'
                        : 'bg-yellow-600 text-white'
                    }`}
                  >
                    {selected_booking.is_emergency ? 'EMERGENCY' : selected_booking.status}
                  </span>
                  {selected_booking.is_emergency && selected_booking.urgent_fee_pct && (
                    <span className="text-sm text-gray-600">
                      (+{Number(selected_booking.urgent_fee_pct || 0).toFixed(0)}% fee)
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <Link
                  to={`/staff/jobs/${selected_booking.order_id}`}
                  className="flex-1 bg-black text-white px-4 py-3 rounded-lg font-semibold text-center hover:bg-gray-800 transition-colors"
                >
                  View Job
                </Link>
                <button
                  onClick={closeBookingModal}
                  className="flex-1 bg-gray-100 text-gray-900 px-4 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UV_StaffCalendar;