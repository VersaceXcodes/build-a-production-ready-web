import React, { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '@/store/main';
import axios from 'axios';
import { FileText, Calendar, DollarSign, ChevronRight, Plus, Filter, X } from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS (from Zod schemas)
// ============================================================================

interface Quote {
  id: string;
  customer_id: string;
  service_id: string;
  tier_id: string | null;
  status: 'REQUESTED' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  estimate_subtotal: number | null;
  final_subtotal: number | null;
  notes: string | null;
  admin_notes: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

interface Service {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string;
  requires_booking: boolean;
  requires_proof: boolean;
  is_top_seller: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface QuotesResponse {
  quotes: Quote[];
  total: number;
}

interface ServicesResponse {
  services: Service[];
  total: number;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchQuotes = async (
  authToken: string,
  customerId: string,
  status?: string | null,
  serviceId?: string | null,
  limit: number = 20,
  offset: number = 0
): Promise<QuotesResponse> => {
  const params = new URLSearchParams();
  params.append('customer_id', customerId);
  if (status && status !== 'all') params.append('status', status.toUpperCase());
  if (serviceId) params.append('service_id', serviceId);
  params.append('limit', limit.toString());
  params.append('offset', offset.toString());
  params.append('sort_order', 'desc');

  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/quotes?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    }
  );

  return response.data;
};

const fetchServices = async (authToken: string): Promise<ServicesResponse> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/services?is_active=true`,
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

const UV_QuotesList: React.FC = () => {
  // =========================================================================
  // ZUSTAND STATE (Individual selectors to prevent infinite loops)
  // =========================================================================
  const currentUser = useAppStore((state) => state.authentication_state.current_user);
  const authToken = useAppStore((state) => state.authentication_state.auth_token);

  // =========================================================================
  // URL PARAMS MANAGEMENT
  // =========================================================================
  const [searchParams, setSearchParams] = useSearchParams();
  const activeFilterStatus = searchParams.get('status') || 'all';
  const activeFilterServiceId = searchParams.get('service_id') || null;

  // =========================================================================
  // PAGINATION STATE
  // =========================================================================
  const [currentPage, setCurrentPage] = React.useState(0);
  const limit = 20;
  const offset = currentPage * limit;

  // =========================================================================
  // DATA FETCHING (React Query)
  // =========================================================================

  // Fetch quotes with current filters
  const {
    data: quotesData,
    isLoading: isLoadingQuotes,
    error: quotesError,
    refetch: refetchQuotes,
  } = useQuery({
    queryKey: ['quotes', currentUser?.id, activeFilterStatus, activeFilterServiceId, offset, limit],
    queryFn: () =>
      fetchQuotes(
        authToken!,
        currentUser!.id,
        activeFilterStatus,
        activeFilterServiceId,
        limit,
        offset
      ),
    enabled: !!authToken && !!currentUser,
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false,
  });

  // Fetch services for lookup (cached)
  const { data: servicesData } = useQuery({
    queryKey: ['services', 'active'],
    queryFn: () => fetchServices(authToken!),
    enabled: !!authToken,
    staleTime: 300000, // 5 minutes (services rarely change)
    refetchOnWindowFocus: false,
  });

  // =========================================================================
  // DERIVED DATA
  // =========================================================================

  const quotes = quotesData?.quotes || [];
  const totalQuotes = quotesData?.total || 0;
  const totalPages = Math.ceil(totalQuotes / limit);

  // Create service lookup map
  const serviceMap = useMemo(() => {
    if (!servicesData?.services) return new Map<string, string>();
    return new Map(servicesData.services.map((s) => [s.id, s.name]));
  }, [servicesData]);

  // Status filter options
  const statusFilters = [
    { value: 'all', label: 'All Quotes', count: totalQuotes },
    { value: 'requested', label: 'Pending Review', count: 0 },
    { value: 'pending', label: 'Awaiting Info', count: 0 },
    { value: 'approved', label: 'Finalized', count: 0 },
    { value: 'rejected', label: 'Declined', count: 0 },
    { value: 'expired', label: 'Expired', count: 0 },
  ];

  // =========================================================================
  // EVENT HANDLERS
  // =========================================================================

  const handleStatusFilter = (status: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (status === 'all') {
      newParams.delete('status');
    } else {
      newParams.set('status', status);
    }
    setSearchParams(newParams);
    setCurrentPage(0); // Reset pagination
  };

  const handleServiceFilter = (serviceId: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (serviceId === 'all') {
      newParams.delete('service_id');
    } else {
      newParams.set('service_id', serviceId);
    }
    setSearchParams(newParams);
    setCurrentPage(0);
  };

  const handleClearFilters = () => {
    setSearchParams({});
    setCurrentPage(0);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // =========================================================================
  // HELPER FUNCTIONS
  // =========================================================================

  const getStatusBadgeClasses = (status: string): string => {
    const baseClasses = 'inline-flex items-center px-3 py-1 rounded-lg text-sm font-semibold';
    
    switch (status) {
      case 'REQUESTED':
        return `${baseClasses} bg-yellow-100 text-yellow-900 border border-yellow-300`;
      case 'PENDING':
        return `${baseClasses} bg-blue-100 text-blue-900 border border-blue-300`;
      case 'APPROVED':
        return `${baseClasses} bg-green-100 text-green-900 border border-green-300`;
      case 'REJECTED':
        return `${baseClasses} bg-red-100 text-red-900 border border-red-300`;
      case 'EXPIRED':
        return `${baseClasses} bg-gray-100 text-gray-900 border border-gray-300`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-900 border border-gray-300`;
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'REQUESTED':
        return 'Pending Review';
      case 'PENDING':
        return 'Awaiting Info';
      case 'APPROVED':
        return 'Finalized';
      case 'REJECTED':
        return 'Declined';
      case 'EXPIRED':
        return 'Expired';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const isDraft = (quote: Quote): boolean => {
    return quote.status === 'REQUESTED' && !quote.estimate_subtotal && !quote.final_subtotal;
  };

  // =========================================================================
  // RENDER HELPERS
  // =========================================================================

  const renderLoadingState = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse"
        >
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderEmptyState = () => {
    const hasFilters = activeFilterStatus !== 'all' || activeFilterServiceId;

    return (
      <div className="text-center py-16 px-4">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-6">
          <FileText className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-3">
          {hasFilters ? 'No quotes found' : 'No quotes yet'}
        </h3>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          {hasFilters
            ? 'Try adjusting your filters to see more quotes.'
            : 'Start by creating your first quote to get custom pricing for your project.'}
        </p>
        {hasFilters ? (
          <button
            onClick={handleClearFilters}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
            Clear Filters
          </button>
        ) : (
          <Link
            to="/app/quotes/new"
            className="inline-flex items-center gap-2 px-8 py-4 bg-yellow-400 text-gray-900 rounded-lg font-bold hover:bg-yellow-500 transition-all shadow-lg hover:shadow-xl"
          >
            <Plus className="w-5 h-5" />
            Create Your First Quote
          </Link>
        )}
      </div>
    );
  };

  const renderErrorState = () => (
    <div className="text-center py-16 px-4">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 mb-6">
        <X className="w-10 h-10 text-red-600" />
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-3">Failed to load quotes</h3>
      <p className="text-gray-600 mb-8 max-w-md mx-auto">
        {quotesError instanceof Error ? quotesError.message : 'Something went wrong. Please try again.'}
      </p>
      <button
        onClick={() => refetchQuotes()}
        className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors"
      >
        Try Again
      </button>
    </div>
  );

  const renderQuoteCard = (quote: Quote) => {
    const serviceName = serviceMap.get(quote.service_id) || 'Unknown Service';
    const isQuoteDraft = isDraft(quote);

    return (
      <div
        key={quote.id}
        className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-gray-300 transition-all"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-2">{serviceName}</h3>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(quote.created_at)}</span>
            </div>
          </div>
          <span className={getStatusBadgeClasses(quote.status)}>
            {getStatusLabel(quote.status)}
          </span>
        </div>

        {/* Quote Details */}
        <div className="space-y-3 mb-6">
          {quote.estimate_subtotal && (
            <div className="flex items-center gap-2 text-gray-700">
              <DollarSign className="w-4 h-4 text-gray-400" />
              <span className="text-sm">
                <span className="font-semibold">Estimate:</span>{' '}
                {formatCurrency(quote.estimate_subtotal)}
              </span>
            </div>
          )}

          {quote.final_subtotal && (
            <div className="flex items-center gap-2 text-gray-700">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="text-sm">
                <span className="font-semibold">Final Price:</span>{' '}
                <span className="text-green-600 font-bold">
                  {formatCurrency(quote.final_subtotal)}
                </span>
              </span>
            </div>
          )}

          {quote.expires_at && (
            <div className="flex items-center gap-2 text-gray-700">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-sm">
                <span className="font-semibold">Expires:</span> {formatDate(quote.expires_at)}
              </span>
            </div>
          )}

          {quote.notes && (
            <p className="text-sm text-gray-600 line-clamp-2">{quote.notes}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {isQuoteDraft ? (
            <Link
              to={`/app/quotes/new?draft_id=${quote.id}`}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-yellow-400 text-gray-900 rounded-lg font-semibold hover:bg-yellow-500 transition-colors"
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </Link>
          ) : (
            <Link
              to={`/app/quotes/${quote.id}`}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors"
            >
              View Details
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    );
  };

  // =========================================================================
  // MAIN RENDER
  // =========================================================================

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">My Quotes</h1>
                <p className="text-gray-600">
                  Track and manage your quote requests
                </p>
              </div>
              <Link
                to="/app/quotes/new"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-yellow-400 text-gray-900 rounded-lg font-bold hover:bg-yellow-500 transition-all shadow-lg hover:shadow-xl"
              >
                <Plus className="w-5 h-5" />
                Create New Quote
              </Link>
            </div>
          </div>

          {/* Filters Section */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
            {/* Status Filters (Tabs) */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filter by Status
              </h3>
              <div className="flex flex-wrap gap-2">
                {statusFilters.map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => handleStatusFilter(filter.value)}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                      activeFilterStatus === filter.value
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Service Filter */}
            {servicesData && servicesData.services.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Filter by Service
                </h3>
                <select
                  value={activeFilterServiceId || 'all'}
                  onChange={(e) => handleServiceFilter(e.target.value)}
                  className="w-full sm:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                >
                  <option value="all">All Services</option>
                  {servicesData.services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Active Filters Indicator */}
            {(activeFilterStatus !== 'all' || activeFilterServiceId) && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    Active filters applied
                  </span>
                  <button
                    onClick={handleClearFilters}
                    className="text-sm text-gray-900 font-semibold hover:text-gray-700 flex items-center gap-1"
                  >
                    <X className="w-4 h-4" />
                    Clear All
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Results Count */}
          {!isLoadingQuotes && quotes.length > 0 && (
            <div className="mb-6">
              <p className="text-sm text-gray-600">
                Showing {quotes.length} of {totalQuotes} quote{totalQuotes !== 1 ? 's' : ''}
              </p>
            </div>
          )}

          {/* Content Area */}
          {isLoadingQuotes ? (
            renderLoadingState()
          ) : quotesError ? (
            renderErrorState()
          ) : quotes.length === 0 ? (
            renderEmptyState()
          ) : (
            <>
              {/* Quote Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {quotes.map(renderQuoteCard)}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 0}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  
                  <div className="flex items-center gap-2">
                    {Array.from({ length: totalPages }, (_, i) => i).map((page) => {
                      // Show first page, last page, current page, and pages around current
                      const showPage =
                        page === 0 ||
                        page === totalPages - 1 ||
                        Math.abs(page - currentPage) <= 1;

                      if (!showPage) {
                        // Show ellipsis
                        if (page === 1 || page === totalPages - 2) {
                          return (
                            <span key={page} className="px-2 text-gray-500">
                              ...
                            </span>
                          );
                        }
                        return null;
                      }

                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`w-10 h-10 rounded-lg font-semibold transition-colors ${
                            currentPage === page
                              ? 'bg-gray-900 text-white'
                              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {page + 1}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages - 1}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default UV_QuotesList;