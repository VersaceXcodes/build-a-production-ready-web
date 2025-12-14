import React, { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { AlertTriangle, Clock, Filter, Search, X } from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Job {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name: string;
  service_id: string;
  service_name: string;
  tier_id: string;
  tier_name: string;
  assigned_staff_id: string | null;
  status: string;
  due_at: string | null;
  total_amount: number;
  is_emergency: boolean;
  created_at: string;
  updated_at: string;
}

interface FilterOptions {
  services: Array<{ id: string; name: string }>;
  staff_members: Array<{ id: string; name: string }>;
}

interface SortConfig {
  sort_by: 'due_at' | 'created_at';
  sort_order: 'asc' | 'desc';
}

// ============================================================================
// COMPONENT
// ============================================================================

const UV_JobQueue: React.FC = () => {
  // ========================================================================
  // STATE MANAGEMENT
  // ========================================================================
  
  // Global state - CRITICAL: Individual selectors only
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  
  const currentStaffId = currentUser?.id || '';
  const staffPermissions = currentUser?.staff_profile?.permissions || {};

  // URL parameters for filter persistence
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Local state
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    sort_by: 'due_at',
    sort_order: 'asc'
  });

  // Current filter values from URL
  const currentFilters = useMemo(() => ({
    assigned_to: searchParams.get('assigned_to') || null,
    status: searchParams.get('status') || null,
    priority: searchParams.get('priority') || null,
    due_date: searchParams.get('due_date') || null
  }), [searchParams]);

  // ========================================================================
  // API DATA FETCHING
  // ========================================================================

  // Fetch job list
  const {
    data: jobsData,
    isLoading: isLoadingJobs,
    error: jobsError,
    refetch: refetchJobs
  } = useQuery({
    queryKey: ['staff-jobs', currentFilters, sortConfig, currentStaffId],
    queryFn: async () => {
      const params: Record<string, string> = {
        limit: '100',
        sort_by: sortConfig.sort_by,
        sort_order: sortConfig.sort_order
      };

      // Apply assigned_to filter
      if (currentFilters.assigned_to === 'me') {
        params.assigned_staff_id = currentStaffId;
      } else if (currentFilters.assigned_to && currentFilters.assigned_to !== 'all') {
        params.assigned_staff_id = currentFilters.assigned_to;
      }

      // Apply status filter
      if (currentFilters.status) {
        params.status = currentFilters.status;
      }

      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/orders`,
        {
          params,
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        }
      );

      // Transform response to job list format
      const jobs: Job[] = response.data.orders.map((order: any) => ({
        id: order.id,
        order_number: order.order_number,
        customer_id: order.customer_id,
        customer_name: order.customer_name || 'Unknown Customer',
        service_id: order.service_id,
        service_name: order.service_name || 'Unknown Service',
        tier_id: order.tier_id,
        tier_name: order.tier_name || 'Unknown Tier',
        assigned_staff_id: order.assigned_staff_id,
        status: order.status,
        due_at: order.due_at,
        total_amount: Number(order.total_amount || 0),
        is_emergency: order.is_emergency || false,
        created_at: order.created_at,
        updated_at: order.updated_at
      }));

      return jobs;
    },
    enabled: !!authToken && !!currentStaffId,
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: true
  });

  // Fetch filter options
  const { data: filterOptions } = useQuery({
    queryKey: ['job-filter-options'],
    queryFn: async () => {
      const [servicesRes, staffRes] = await Promise.all([
        axios.get(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/services`,
          {
            params: { is_active: true },
            headers: { Authorization: `Bearer ${authToken}` }
          }
        ),
        axios.get(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/users`,
          {
            params: { role: 'STAFF', status: 'ACTIVE' },
            headers: { Authorization: `Bearer ${authToken}` }
          }
        )
      ]);

      const options: FilterOptions = {
        services: servicesRes.data.services.map((s: any) => ({
          id: s.id,
          name: s.name
        })),
        staff_members: staffRes.data.users.map((u: any) => ({
          id: u.id,
          name: u.name
        }))
      };

      return options;
    },
    enabled: !!authToken,
    staleTime: 300000 // 5 minutes
  });

  // ========================================================================
  // COMPUTED STATE
  // ========================================================================

  // Process jobs with priority sorting (emergency first)
  const processedJobs = useMemo(() => {
    if (!jobsData) return [];

    let jobs = [...jobsData];

    // Apply priority filter (emergency)
    if (currentFilters.priority === 'emergency') {
      jobs = jobs.filter(job => job.is_emergency);
    }

    // Apply due date filter
    if (currentFilters.due_date) {
      const now = new Date();
      jobs = jobs.filter(job => {
        if (!job.due_at) return false;
        const dueDate = new Date(job.due_at);
        
        switch (currentFilters.due_date) {
          case 'overdue':
            return dueDate < now;
          case 'today':
            return dueDate.toDateString() === now.toDateString();
          case 'this_week':
            const weekFromNow = new Date(now);
            weekFromNow.setDate(now.getDate() + 7);
            return dueDate <= weekFromNow;
          case 'this_month':
            return dueDate.getMonth() === now.getMonth() && 
                   dueDate.getFullYear() === now.getFullYear();
          default:
            return true;
        }
      });
    }

    // Sort with emergency priority
    jobs.sort((a, b) => {
      // Emergency jobs always come first
      if (a.is_emergency && !b.is_emergency) return -1;
      if (!a.is_emergency && b.is_emergency) return 1;

      // Then sort by configured sort option
      if (sortConfig.sort_by === 'due_at') {
        if (!a.due_at) return 1;
        if (!b.due_at) return -1;
        const diff = new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
        return sortConfig.sort_order === 'asc' ? diff : -diff;
      } else {
        const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        return sortConfig.sort_order === 'asc' ? diff : -diff;
      }
    });

    return jobs;
  }, [jobsData, currentFilters, sortConfig]);

  // Job counts for badges
  const jobCounts = useMemo(() => {
    if (!jobsData) return { total: 0, assigned: 0, overdue: 0, emergency: 0 };

    const now = new Date();
    return {
      total: jobsData.length,
      assigned: jobsData.filter(j => j.assigned_staff_id === currentStaffId).length,
      overdue: jobsData.filter(j => j.due_at && new Date(j.due_at) < now).length,
      emergency: jobsData.filter(j => j.is_emergency).length
    };
  }, [jobsData, currentStaffId]);

  // ========================================================================
  // EVENT HANDLERS
  // ========================================================================

  const applyFilter = (filterName: string, value: string | null) => {
    const newParams = new URLSearchParams(searchParams);
    
    if (value) {
      newParams.set(filterName, value);
    } else {
      newParams.delete(filterName);
    }
    
    setSearchParams(newParams);
  };

  const clearAllFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const changeSort = (newSortBy: 'due_at' | 'created_at') => {
    setSortConfig(prev => ({
      sort_by: newSortBy,
      sort_order: prev.sort_by === newSortBy && prev.sort_order === 'asc' ? 'desc' : 'asc'
    }));
  };

  // ========================================================================
  // UTILITY FUNCTIONS
  // ========================================================================

  const calculateDaysUntilDue = (dueAt: string | null): string => {
    if (!dueAt) return 'No deadline';
    
    const now = new Date();
    const due = new Date(dueAt);
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    return `Due in ${diffDays} days`;
  };

  const getStatusColor = (status: string): string => {
    const statusColors: Record<string, string> = {
      'QUOTE_REQUESTED': 'bg-gray-100 text-gray-800 border-gray-300',
      'QUOTE_APPROVED': 'bg-blue-100 text-blue-800 border-blue-300',
      'IN_PRODUCTION': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'PROOF_SENT': 'bg-purple-100 text-purple-800 border-purple-300',
      'REVISION_REQUESTED': 'bg-orange-100 text-orange-800 border-orange-300',
      'COMPLETED': 'bg-green-100 text-green-800 border-green-300',
      'CANCELLED': 'bg-red-100 text-red-800 border-red-300'
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const formatStatus = (status: string): string => {
    return status.replace(/_/g, ' ').toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // ========================================================================
  // RENDER LOGIC
  // ========================================================================

  const hasActiveFilters = currentFilters.assigned_to || currentFilters.status || 
                          currentFilters.priority || currentFilters.due_date;

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Page Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Job Queue</h1>
                <p className="mt-2 text-sm text-gray-600">
                  Manage your assigned jobs and track deadlines
                </p>
              </div>
              
              {/* Quick Stats */}
              <div className="flex flex-wrap gap-3">
                <div className="bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                  <div className="text-xs text-gray-600">Total Jobs</div>
                  <div className="text-2xl font-bold text-gray-900">{jobCounts.total}</div>
                </div>
                <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
                  <div className="text-xs text-blue-600">Assigned to Me</div>
                  <div className="text-2xl font-bold text-blue-900">{jobCounts.assigned}</div>
                </div>
                {jobCounts.emergency > 0 && (
                  <div className="bg-yellow-50 px-4 py-2 rounded-lg border border-yellow-300">
                    <div className="text-xs text-yellow-800">Emergency</div>
                    <div className="text-2xl font-bold text-yellow-900">{jobCounts.emergency}</div>
                  </div>
                )}
                {jobCounts.overdue > 0 && (
                  <div className="bg-red-50 px-4 py-2 rounded-lg border border-red-200">
                    <div className="text-xs text-red-600">Overdue</div>
                    <div className="text-2xl font-bold text-red-900">{jobCounts.overdue}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Filters & Sort Bar */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Mobile Filter Toggle */}
              <button
                onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                className="sm:hidden flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg font-medium transition-colors"
              >
                <Filter className="w-5 h-5" />
                <span>Filters</span>
                {hasActiveFilters && (
                  <span className="bg-yellow-400 text-black text-xs font-bold px-2 py-0.5 rounded-full">
                    Active
                  </span>
                )}
              </button>

              {/* Desktop Filters */}
              <div className="hidden sm:flex flex-wrap items-center gap-3 flex-1">
                {/* Assigned To Filter */}
                <select
                  value={currentFilters.assigned_to || 'all'}
                  onChange={(e) => applyFilter('assigned_to', e.target.value === 'all' ? null : e.target.value)}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  <option value="all">All Jobs</option>
                  <option value="me">Assigned to Me</option>
                  {filterOptions?.staff_members.map(staff => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name}
                    </option>
                  ))}
                </select>

                {/* Status Filter */}
                <select
                  value={currentFilters.status || ''}
                  onChange={(e) => applyFilter('status', e.target.value || null)}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  <option value="">All Statuses</option>
                  <option value="QUOTE_APPROVED">Quote Approved</option>
                  <option value="IN_PRODUCTION">In Production</option>
                  <option value="PROOF_SENT">Proof Sent</option>
                  <option value="REVISION_REQUESTED">Revision Requested</option>
                  <option value="COMPLETED">Completed</option>
                </select>

                {/* Priority Filter */}
                <select
                  value={currentFilters.priority || ''}
                  onChange={(e) => applyFilter('priority', e.target.value || null)}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  <option value="">All Priorities</option>
                  <option value="emergency">Emergency Only</option>
                </select>

                {/* Due Date Filter */}
                <select
                  value={currentFilters.due_date || ''}
                  onChange={(e) => applyFilter('due_date', e.target.value || null)}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  <option value="">All Due Dates</option>
                  <option value="overdue">Overdue</option>
                  <option value="today">Due Today</option>
                  <option value="this_week">This Week</option>
                  <option value="this_month">This Month</option>
                </select>

                {/* Clear Filters */}
                {hasActiveFilters && (
                  <button
                    onClick={clearAllFilters}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Clear
                  </button>
                )}
              </div>

              {/* Sort Dropdown */}
              <select
                value={sortConfig.sort_by}
                onChange={(e) => changeSort(e.target.value as 'due_at' | 'created_at')}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <option value="due_at">Sort by Due Date</option>
                <option value="created_at">Sort by Created Date</option>
              </select>
            </div>

            {/* Mobile Filter Menu */}
            {isFilterMenuOpen && (
              <div className="sm:hidden mt-4 pt-4 border-t border-gray-200 space-y-3">
                <select
                  value={currentFilters.assigned_to || 'all'}
                  onChange={(e) => applyFilter('assigned_to', e.target.value === 'all' ? null : e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-900"
                >
                  <option value="all">All Jobs</option>
                  <option value="me">Assigned to Me</option>
                  {filterOptions?.staff_members.map(staff => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name}
                    </option>
                  ))}
                </select>

                <select
                  value={currentFilters.status || ''}
                  onChange={(e) => applyFilter('status', e.target.value || null)}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-900"
                >
                  <option value="">All Statuses</option>
                  <option value="QUOTE_APPROVED">Quote Approved</option>
                  <option value="IN_PRODUCTION">In Production</option>
                  <option value="PROOF_SENT">Proof Sent</option>
                  <option value="REVISION_REQUESTED">Revision Requested</option>
                  <option value="COMPLETED">Completed</option>
                </select>

                <select
                  value={currentFilters.priority || ''}
                  onChange={(e) => applyFilter('priority', e.target.value || null)}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-900"
                >
                  <option value="">All Priorities</option>
                  <option value="emergency">Emergency Only</option>
                </select>

                <select
                  value={currentFilters.due_date || ''}
                  onChange={(e) => applyFilter('due_date', e.target.value || null)}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-900"
                >
                  <option value="">All Due Dates</option>
                  <option value="overdue">Overdue</option>
                  <option value="today">Due Today</option>
                  <option value="this_week">This Week</option>
                  <option value="this_month">This Month</option>
                </select>

                {hasActiveFilters && (
                  <button
                    onClick={clearAllFilters}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Clear All Filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Loading State */}
          {isLoadingJobs && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-yellow-400"></div>
              <p className="mt-4 text-gray-600 font-medium">Loading jobs...</p>
            </div>
          )}

          {/* Error State */}
          {jobsError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <div className="flex justify-center mb-4">
                <AlertTriangle className="w-12 h-12 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-red-900 mb-2">Failed to Load Jobs</h3>
              <p className="text-red-700 mb-4">
                {jobsError instanceof Error ? jobsError.message : 'An error occurred while fetching jobs.'}
              </p>
              <button
                onClick={() => refetchJobs()}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Empty State - No Jobs */}
          {!isLoadingJobs && !jobsError && processedJobs.length === 0 && !hasActiveFilters && (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
              <div className="flex justify-center mb-6">
                <Search className="w-16 h-16 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No Jobs Yet</h3>
              <p className="text-gray-600 mb-6">
                You don't have any jobs assigned to you at the moment.
              </p>
              <Link
                to="/staff"
                className="inline-block px-6 py-3 bg-black hover:bg-gray-800 text-white rounded-lg font-medium transition-colors"
              >
                Return to Dashboard
              </Link>
            </div>
          )}

          {/* Empty State - Filtered */}
          {!isLoadingJobs && !jobsError && processedJobs.length === 0 && hasActiveFilters && (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
              <div className="flex justify-center mb-6">
                <Search className="w-16 h-16 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No Matching Jobs</h3>
              <p className="text-gray-600 mb-6">
                No jobs match your current filters. Try adjusting your search criteria.
              </p>
              <button
                onClick={clearAllFilters}
                className="inline-block px-6 py-3 bg-black hover:bg-gray-800 text-white rounded-lg font-medium transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          )}

          {/* Job Cards Grid */}
          {!isLoadingJobs && !jobsError && processedJobs.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {processedJobs.map((job) => (
                <div
                  key={job.id}
                  className={`bg-white rounded-xl border-2 overflow-hidden transition-all duration-200 hover:shadow-xl ${
                    job.is_emergency 
                      ? 'border-yellow-400 shadow-lg shadow-yellow-100' 
                      : 'border-gray-200 hover:border-yellow-400'
                  }`}
                >
                  {/* Emergency Banner */}
                  {job.is_emergency && (
                    <div className="bg-yellow-400 px-4 py-2 flex items-center justify-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-black" />
                      <span className="text-black font-bold text-sm uppercase tracking-wide">
                        Emergency Job
                      </span>
                    </div>
                  )}

                  <div className="p-6">
                    {/* Header Row */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">
                          {job.order_number}
                        </h3>
                        <p className="text-sm text-gray-600">{job.customer_name}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(job.status)}`}>
                        {formatStatus(job.status)}
                      </span>
                    </div>

                    {/* Service & Tier Badges */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="px-3 py-1 bg-gray-100 text-gray-900 rounded-full text-xs font-medium border border-gray-300">
                        {job.service_name}
                      </span>
                      <span className="px-3 py-1 bg-black text-white rounded-full text-xs font-medium">
                        {job.tier_name}
                      </span>
                    </div>

                    {/* Due Date */}
                    {job.due_at && (
                      <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-200">
                        <Clock className={`w-5 h-5 ${
                          new Date(job.due_at) < new Date() ? 'text-red-600' : 'text-gray-600'
                        }`} />
                        <span className={`text-sm font-medium ${
                          new Date(job.due_at) < new Date() ? 'text-red-600' : 'text-gray-900'
                        }`}>
                          {calculateDaysUntilDue(job.due_at)}
                        </span>
                      </div>
                    )}

                    {/* Action Button */}
                    <Link
                      to={`/staff/jobs/${job.id}`}
                      className="block w-full px-6 py-3 bg-yellow-400 hover:bg-yellow-500 text-black rounded-lg font-bold text-center transition-colors"
                    >
                      View Job Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default UV_JobQueue;