import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  FileText, 
  Download, 
  X, 
  Filter, 
  Search, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertCircle,
  DollarSign,
  FileUp,
  User,
  Package,
  Calendar
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
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

interface QuoteAnswer {
  id: string;
  quote_id: string;
  option_key: string;
  value: any;
  created_at: string;
}

interface Upload {
  id: string;
  owner_id: string;
  quote_id: string | null;
  order_id: string | null;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  dpi_warning: boolean;
  created_at: string;
}

interface Service {
  id: string;
  name: string;
  slug: string;
  description: string;
}

interface QuoteFilters {
  status: string | null;
  service_id: string | null;
  date_range: string | null;
}

interface FinalizationForm {
  final_subtotal: string;
  admin_notes: string;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchQuotes = async (filters: QuoteFilters, token: string) => {
  const params: any = {
    limit: 20,
    offset: 0,
    sort_by: 'created_at',
    sort_order: 'desc',
  };

  if (filters.status) params.status = filters.status;
  if (filters.service_id) params.service_id = filters.service_id;

  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/quotes`,
    {
      params,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  // Transform NUMERIC fields from strings to numbers
  return {
    quotes: (response.data.quotes || []).map((quote: any) => ({
      ...quote,
      estimate_subtotal: quote.estimate_subtotal ? Number(quote.estimate_subtotal) : null,
      final_subtotal: quote.final_subtotal ? Number(quote.final_subtotal) : null,
    })),
    total: response.data.total,
  };
};

const fetchQuoteDetail = async (quoteId: string, token: string) => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/quotes/${quoteId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  // Transform NUMERIC fields
  return {
    ...response.data,
    estimate_subtotal: response.data.estimate_subtotal ? Number(response.data.estimate_subtotal) : null,
    final_subtotal: response.data.final_subtotal ? Number(response.data.final_subtotal) : null,
  };
};

const fetchQuoteAnswers = async (quoteId: string, token: string) => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/quotes/${quoteId}/answers`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data.answers || [];
};

const fetchQuoteUploads = async (quoteId: string, token: string) => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/uploads`,
    {
      params: {
        quote_id: quoteId,
        limit: 50,
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  // Transform NUMERIC file_size field
  return (response.data.uploads || []).map((upload: any) => ({
    ...upload,
    file_size: Number(upload.file_size || 0),
  }));
};

const fetchServices = async (token: string) => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/services`,
    {
      params: {
        is_active: true,
        limit: 100,
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data.services || [];
};

const finalizeQuoteMutation = async (
  quoteId: string,
  data: { final_subtotal: number; admin_notes: string | null },
  token: string
) => {
  const response = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/quotes/${quoteId}/finalize`,
    data,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data;
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return 'N/A';
  return `€${Number(amount || 0).toFixed(2)}`;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getStatusColor = (status: Quote['status']): string => {
  const colors = {
    REQUESTED: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    PENDING: 'bg-gray-100 text-gray-800 border-gray-200',
    APPROVED: 'bg-white text-black border-black',
    REJECTED: 'bg-black text-white border-white',
    EXPIRED: 'bg-gray-300 text-gray-700 border-gray-400',
  };
  return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
};

const getStatusIcon = (status: Quote['status']) => {
  const icons = {
    REQUESTED: <Clock className="w-4 h-4" />,
    PENDING: <AlertCircle className="w-4 h-4" />,
    APPROVED: <CheckCircle className="w-4 h-4" />,
    REJECTED: <XCircle className="w-4 h-4" />,
    EXPIRED: <XCircle className="w-4 h-4" />,
  };
  return icons[status] || <Clock className="w-4 h-4" />;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_QuotesManagement: React.FC = () => {
  // CRITICAL: Individual Zustand selectors (no object destructuring)
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const currentUser = useAppStore(state => state.authentication_state.current_user);

  // URL params state
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Local state
  const [quoteFilters, setQuoteFilters] = useState<QuoteFilters>({
    status: searchParams.get('status'),
    service_id: searchParams.get('service_id'),
    date_range: searchParams.get('date_range'),
  });

  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [finalizationForm, setFinalizationForm] = useState<FinalizationForm>({
    final_subtotal: '',
    admin_notes: '',
  });
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Query client for cache invalidation
  const queryClient = useQueryClient();

  // Sync URL params with filter state
  useEffect(() => {
    const params: any = {};
    if (quoteFilters.status) params.status = quoteFilters.status;
    if (quoteFilters.service_id) params.service_id = quoteFilters.service_id;
    if (quoteFilters.date_range) params.date_range = quoteFilters.date_range;
    setSearchParams(params);
  }, [quoteFilters, setSearchParams]);

  // Fetch quotes
  const {
    data: quotesData,
    isLoading: isLoadingQuotes,
    error: quotesError,
  } = useQuery({
    queryKey: ['quotes', quoteFilters],
    queryFn: () => fetchQuotes(quoteFilters, authToken!),
    enabled: !!authToken,
    staleTime: 60000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Fetch services for filter
  const { data: servicesData } = useQuery({
    queryKey: ['services', 'filter-options'],
    queryFn: () => fetchServices(authToken!),
    enabled: !!authToken,
    staleTime: 300000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Fetch quote detail
  const { data: selectedQuote } = useQuery({
    queryKey: ['quote', selectedQuoteId],
    queryFn: () => fetchQuoteDetail(selectedQuoteId!, authToken!),
    enabled: !!authToken && !!selectedQuoteId,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  // Fetch quote answers
  const { data: quoteAnswers } = useQuery({
    queryKey: ['quote-answers', selectedQuoteId],
    queryFn: () => fetchQuoteAnswers(selectedQuoteId!, authToken!),
    enabled: !!authToken && !!selectedQuoteId,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  // Fetch quote uploads
  const { data: quoteUploads } = useQuery({
    queryKey: ['quote-uploads', selectedQuoteId],
    queryFn: () => fetchQuoteUploads(selectedQuoteId!, authToken!),
    enabled: !!authToken && !!selectedQuoteId,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  // Finalize quote mutation
  const finalizeMutation = useMutation({
    mutationFn: (data: { quoteId: string; final_subtotal: number; admin_notes: string | null }) =>
      finalizeQuoteMutation(data.quoteId, {
        final_subtotal: data.final_subtotal,
        admin_notes: data.admin_notes,
      }, authToken!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['quote', selectedQuoteId] });
      setNotification({
        type: 'success',
        message: 'Quote finalized successfully! Invoice created and customer notified.',
      });
      setTimeout(() => setNotification(null), 5000);
      setIsModalOpen(false);
      setSelectedQuoteId(null);
      setFinalizationForm({ final_subtotal: '', admin_notes: '' });
    },
    onError: (error: any) => {
      setNotification({
        type: 'error',
        message: error.response?.data?.message || 'Failed to finalize quote. Please try again.',
      });
      setTimeout(() => setNotification(null), 5000);
    },
  });

  // Event handlers
  const handleFilterChange = (key: keyof QuoteFilters, value: string | null) => {
    setQuoteFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleClearFilters = () => {
    setQuoteFilters({
      status: null,
      service_id: null,
      date_range: null,
    });
  };

  const handleOpenQuoteDetail = (quoteId: string) => {
    setSelectedQuoteId(quoteId);
    setIsModalOpen(true);
    // Pre-fill finalization form if estimate exists
    const quote = quotesData?.quotes.find((q: Quote) => q.id === quoteId);
    if (quote?.estimate_subtotal) {
      setFinalizationForm(prev => ({
        ...prev,
        final_subtotal: quote.estimate_subtotal!.toString(),
      }));
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedQuoteId(null);
    setFinalizationForm({ final_subtotal: '', admin_notes: '' });
  };

  const handleFinalizationFormChange = (key: keyof FinalizationForm, value: string) => {
    setFinalizationForm(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleFinalizeQuote = (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalSubtotal = parseFloat(finalizationForm.final_subtotal);
    if (isNaN(finalSubtotal) || finalSubtotal <= 0) {
      setNotification({
        type: 'error',
        message: 'Please enter a valid final subtotal amount.',
      });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    finalizeMutation.mutate({
      quoteId: selectedQuoteId!,
      final_subtotal: finalSubtotal,
      admin_notes: finalizationForm.admin_notes.trim() || null,
    });
  };

  // Check if user has admin role
  if (!currentUser || currentUser.role !== 'ADMIN') {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <XCircle className="mx-auto h-12 w-12 text-red-600" />
            <h2 className="mt-4 text-xl font-bold text-gray-900">Access Denied</h2>
            <p className="mt-2 text-gray-600">You do not have permission to access this page.</p>
            <Link
              to="/admin"
              className="mt-4 inline-block px-6 py-3 bg-black text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Quote Management</h1>
            <p className="mt-2 text-gray-600">Review, finalize, and manage customer quote requests</p>
          </div>

          {/* Notification */}
          {notification && (
            <div
              className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 ${
                notification.type === 'success'
                  ? 'bg-green-600 text-white'
                  : 'bg-red-600 text-white'
              }`}
            >
              {notification.type === 'success' ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
              <span>{notification.message}</span>
              <button
                onClick={() => setNotification(null)}
                className="ml-4 hover:opacity-80"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Filter Bar */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Status Filter */}
              <div>
                <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  id="status-filter"
                  value={quoteFilters.status || ''}
                  onChange={(e) => handleFilterChange('status', e.target.value || null)}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-black focus:ring-2 focus:ring-gray-200 focus:outline-none"
                >
                  <option value="">All Statuses</option>
                  <option value="REQUESTED">Requested</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="EXPIRED">Expired</option>
                </select>
              </div>

              {/* Service Filter */}
              <div>
                <label htmlFor="service-filter" className="block text-sm font-medium text-gray-700 mb-2">
                  Service
                </label>
                <select
                  id="service-filter"
                  value={quoteFilters.service_id || ''}
                  onChange={(e) => handleFilterChange('service_id', e.target.value || null)}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-black focus:ring-2 focus:ring-gray-200 focus:outline-none"
                >
                  <option value="">All Services</option>
                  {(servicesData || []).map((service: Service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range Filter */}
              <div>
                <label htmlFor="date-filter" className="block text-sm font-medium text-gray-700 mb-2">
                  Date Range
                </label>
                <select
                  id="date-filter"
                  value={quoteFilters.date_range || ''}
                  onChange={(e) => handleFilterChange('date_range', e.target.value || null)}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-black focus:ring-2 focus:ring-gray-200 focus:outline-none"
                >
                  <option value="">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                  <option value="quarter">Last 90 Days</option>
                </select>
              </div>
            </div>

            {/* Clear Filters */}
            {(quoteFilters.status || quoteFilters.service_id || quoteFilters.date_range) && (
              <div className="mt-4">
                <button
                  onClick={handleClearFilters}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </div>

          {/* Quotes List */}
          {isLoadingQuotes ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse"
                >
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : quotesError ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <XCircle className="mx-auto h-12 w-12 text-red-600 mb-4" />
              <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Quotes</h3>
              <p className="text-red-700">
                {(quotesError as any).response?.data?.message || 'Failed to load quotes. Please try again.'}
              </p>
            </div>
          ) : !quotesData?.quotes || quotesData.quotes.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Quotes Found</h3>
              <p className="text-gray-600">
                {quoteFilters.status || quoteFilters.service_id || quoteFilters.date_range
                  ? 'Try adjusting your filters to see more results.'
                  : 'No quote requests yet. Check back later.'}
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 text-sm text-gray-600">
                Showing {quotesData.quotes.length} of {quotesData.total} quotes
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {quotesData.quotes.map((quote: Quote) => (
                  <div
                    key={quote.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow"
                  >
                    {/* Quote Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{quote.id}</h3>
                        <p className="text-sm text-gray-500">Created {formatDate(quote.created_at)}</p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
                          quote.status
                        )}`}
                      >
                        {getStatusIcon(quote.status)}
                        {quote.status}
                      </span>
                    </div>

                    {/* Quote Details */}
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">Customer:</span>
                        <span className="font-medium text-gray-900">{quote.customer_id}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm">
                        <Package className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">Service:</span>
                        <span className="font-medium text-gray-900">{quote.service_id}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">Estimate:</span>
                        <span className="font-bold text-gray-900">
                          {formatCurrency(quote.estimate_subtotal)}
                        </span>
                      </div>

                      {quote.final_subtotal && (
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-gray-600">Final:</span>
                          <span className="font-bold text-green-600">
                            {formatCurrency(quote.final_subtotal)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <button
                      onClick={() => handleOpenQuoteDetail(quote.id)}
                      className="w-full px-4 py-2 bg-black text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      View Details
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Quote Detail Modal */}
          {isModalOpen && selectedQuoteId && selectedQuote && (
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="flex min-h-screen items-center justify-center p-4">
                {/* Backdrop */}
                <div
                  className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                  onClick={handleCloseModal}
                ></div>

                {/* Modal */}
                <div className="relative bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                  {/* Modal Header */}
                  <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                    <h2 className="text-2xl font-bold text-gray-900">Quote Details - {selectedQuote.id}</h2>
                    <button
                      onClick={handleCloseModal}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="w-6 h-6 text-gray-600" />
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="p-6 space-y-6">
                    {/* Status Badge */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border ${getStatusColor(
                          selectedQuote.status
                        )}`}
                      >
                        {getStatusIcon(selectedQuote.status)}
                        {selectedQuote.status}
                      </span>
                      <div className="text-sm text-gray-600">
                        Created {formatDate(selectedQuote.created_at)}
                      </div>
                    </div>

                    {/* Customer Information */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <User className="w-5 h-5" />
                        Customer Information
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Customer ID:</span>
                          <span className="font-medium text-gray-900">{selectedQuote.customer_id}</span>
                        </div>
                      </div>
                    </div>

                    {/* Service Information */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Package className="w-5 h-5" />
                        Service Configuration
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Service ID:</span>
                          <span className="font-medium text-gray-900">{selectedQuote.service_id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Tier:</span>
                          <span className="font-medium text-gray-900">{selectedQuote.tier_id || 'Not selected'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Estimate:</span>
                          <span className="font-bold text-gray-900">
                            {formatCurrency(selectedQuote.estimate_subtotal)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Customer Answers */}
                    {quoteAnswers && quoteAnswers.length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Configuration Answers</h3>
                        <div className="space-y-3">
                          {quoteAnswers.map((answer: QuoteAnswer) => (
                            <div key={answer.id} className="bg-white rounded p-3 border border-gray-200">
                              <div className="text-sm font-medium text-gray-700 mb-1">{answer.option_key}</div>
                              <div className="text-sm text-gray-900">
                                {typeof answer.value === 'object'
                                  ? JSON.stringify(answer.value, null, 2)
                                  : String(answer.value)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Uploaded Files */}
                    {quoteUploads && quoteUploads.length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <FileUp className="w-5 h-5" />
                          Uploaded Files ({quoteUploads.length})
                        </h3>
                        <div className="space-y-2">
                          {quoteUploads.map((upload: Upload) => (
                            <div
                              key={upload.id}
                              className="bg-white rounded p-3 border border-gray-200 flex items-center justify-between"
                            >
                              <div className="flex items-center gap-3">
                                <FileText className="w-5 h-5 text-gray-600" />
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{upload.file_name}</div>
                                  <div className="text-xs text-gray-500">
                                    {formatFileSize(upload.file_size)} • {upload.file_type}
                                    {upload.dpi_warning && (
                                      <span className="ml-2 text-yellow-600 font-medium">⚠ Low DPI</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <a
                                href={upload.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 hover:bg-gray-100 rounded transition-colors"
                              >
                                <Download className="w-5 h-5 text-gray-600" />
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Customer Notes */}
                    {selectedQuote.notes && (
                      <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Customer Notes</h3>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedQuote.notes}</p>
                      </div>
                    )}

                    {/* Admin Notes (if exist) */}
                    {selectedQuote.admin_notes && (
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Admin Notes (Internal)</h3>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedQuote.admin_notes}</p>
                      </div>
                    )}

                    {/* Finalization Form (only for REQUESTED or PENDING status) */}
                    {(selectedQuote.status === 'REQUESTED' || selectedQuote.status === 'PENDING') && (
                      <form onSubmit={handleFinalizeQuote} className="bg-green-50 rounded-lg p-6 border-2 border-green-200">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          Finalize Quote
                        </h3>
                        
                        <div className="space-y-4">
                          <div>
                            <label htmlFor="final_subtotal" className="block text-sm font-medium text-gray-700 mb-2">
                              Final Subtotal (€) *
                            </label>
                            <input
                              type="number"
                              id="final_subtotal"
                              step="0.01"
                              min="0"
                              required
                              value={finalizationForm.final_subtotal}
                              onChange={(e) => handleFinalizationFormChange('final_subtotal', e.target.value)}
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-600 focus:ring-4 focus:ring-green-100 focus:outline-none"
                              placeholder="Enter final amount"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                              Estimated: {formatCurrency(selectedQuote.estimate_subtotal)}
                            </p>
                          </div>

                          <div>
                            <label htmlFor="admin_notes" className="block text-sm font-medium text-gray-700 mb-2">
                              Admin Notes (Internal)
                            </label>
                            <textarea
                              id="admin_notes"
                              rows={3}
                              value={finalizationForm.admin_notes}
                              onChange={(e) => handleFinalizationFormChange('admin_notes', e.target.value)}
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-600 focus:ring-4 focus:ring-green-100 focus:outline-none"
                              placeholder="Optional notes for internal reference..."
                            ></textarea>
                          </div>

                          <button
                            type="submit"
                            disabled={finalizeMutation.isPending}
                            className="w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                          >
                            {finalizeMutation.isPending ? (
                              <>
                                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Finalizing...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-5 h-5" />
                                Finalize Quote & Create Invoice
                              </>
                            )}
                          </button>

                          <p className="text-xs text-gray-600 text-center">
                            This will approve the quote, create an invoice, and notify the customer
                          </p>
                        </div>
                      </form>
                    )}
                  </div>

                  {/* Modal Footer */}
                  <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
                    <button
                      onClick={handleCloseModal}
                      className="px-6 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default UV_QuotesManagement;