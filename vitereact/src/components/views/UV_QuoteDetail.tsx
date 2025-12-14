import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// ============================================================================
// TYPE DEFINITIONS (matching Zod schemas exactly)
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

interface TierPackage {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  revision_limit: number;
  turnaround_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

interface MessageThread {
  id: string;
  quote_id: string | null;
  order_id: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchQuote = async (quoteId: string, token: string): Promise<Quote> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/quotes/${quoteId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

const fetchQuoteAnswers = async (quoteId: string, token: string): Promise<QuoteAnswer[]> => {
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

const fetchUploadedFiles = async (quoteId: string, ownerId: string, token: string): Promise<Upload[]> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/uploads`,
    {
      params: {
        quote_id: quoteId,
        owner_id: ownerId,
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data.uploads || [];
};

const fetchService = async (serviceId: string): Promise<Service> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/services/${serviceId}`
  );
  return response.data;
};

const fetchTierPackage = async (tierId: string): Promise<TierPackage> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/tier-packages/${tierId}`
  );
  return response.data;
};

const fetchMessageThread = async (quoteId: string, token: string): Promise<{ thread: MessageThread; messages: Message[] }> => {
  // First try to find existing thread
  const threadsResponse = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/message-threads`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  let thread = threadsResponse.data.threads?.find((t: MessageThread) => t.quote_id === quoteId);

  // If no thread exists, create one
  if (!thread) {
    const createResponse = await axios.post(
      `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/message-threads`,
      {
        quote_id: quoteId,
        order_id: null,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    thread = createResponse.data;
  }

  // Fetch messages for this thread
  const messagesResponse = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/message-threads/${thread.id}/messages`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return {
    thread,
    messages: messagesResponse.data.messages || [],
  };
};

const sendMessage = async (threadId: string, body: string, token: string): Promise<Message> => {
  const response = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/message-threads/${threadId}/messages`,
    { body },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getStatusBadgeClasses = (status: Quote['status']): string => {
  const baseClasses = 'inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold';
  
  switch (status) {
    case 'REQUESTED':
      return `${baseClasses} bg-yellow-100 text-yellow-800 border-2 border-yellow-300`;
    case 'PENDING':
      return `${baseClasses} bg-blue-100 text-blue-800 border-2 border-blue-300`;
    case 'APPROVED':
      return `${baseClasses} bg-green-100 text-green-800 border-2 border-green-300`;
    case 'REJECTED':
      return `${baseClasses} bg-red-100 text-red-800 border-2 border-red-300`;
    case 'EXPIRED':
      return `${baseClasses} bg-gray-100 text-gray-800 border-2 border-gray-300`;
    default:
      return `${baseClasses} bg-gray-100 text-gray-800`;
  }
};

const getStatusText = (status: Quote['status']): string => {
  switch (status) {
    case 'REQUESTED':
      return 'Quote Requested';
    case 'PENDING':
      return 'Admin Reviewing';
    case 'APPROVED':
      return 'Quote Approved';
    case 'REJECTED':
      return 'Quote Rejected';
    case 'EXPIRED':
      return 'Quote Expired';
    default:
      return status;
  }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_QuoteDetail: React.FC = () => {
  // URL parameters
  const { quote_id } = useParams<{ quote_id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Zustand store - CRITICAL: Individual selectors to prevent infinite loops
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);

  // Local state for message form
  const [newMessageBody, setNewMessageBody] = useState('');

  // Redirect if not authenticated or no quote_id
  useEffect(() => {
    if (!authToken || !currentUser) {
      navigate('/login?redirect_url=/app/quotes');
    }
    if (!quote_id) {
      navigate('/app/quotes');
    }
  }, [authToken, currentUser, quote_id, navigate]);

  // React Query: Fetch quote details
  const {
    data: quote,
    isLoading: isLoadingQuote,
    error: quoteError,
  } = useQuery({
    queryKey: ['quote', quote_id],
    queryFn: () => fetchQuote(quote_id!, authToken!),
    enabled: !!quote_id && !!authToken,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  // React Query: Fetch quote answers
  const {
    data: quoteAnswers,
    isLoading: isLoadingAnswers,
  } = useQuery({
    queryKey: ['quote-answers', quote_id],
    queryFn: () => fetchQuoteAnswers(quote_id!, authToken!),
    enabled: !!quote_id && !!authToken,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  // React Query: Fetch uploaded files
  const {
    data: uploadedFiles,
    isLoading: isLoadingFiles,
  } = useQuery({
    queryKey: ['quote-files', quote_id],
    queryFn: () => fetchUploadedFiles(quote_id!, currentUser?.id!, authToken!),
    enabled: !!quote_id && !!currentUser && !!authToken,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  // React Query: Fetch service details
  const {
    data: serviceDetails,
    isLoading: isLoadingService,
  } = useQuery({
    queryKey: ['service', quote?.service_id],
    queryFn: () => fetchService(quote!.service_id),
    enabled: !!quote?.service_id,
    staleTime: 300000, // 5 minutes (service data is relatively static)
  });

  // React Query: Fetch tier details (conditional on tier_id)
  const {
    data: tierDetails,
    isLoading: isLoadingTier,
  } = useQuery({
    queryKey: ['tier-package', quote?.tier_id],
    queryFn: () => fetchTierPackage(quote!.tier_id!),
    enabled: !!quote?.tier_id,
    staleTime: 300000,
  });

  // React Query: Fetch message thread
  const {
    data: messageThreadData,
    isLoading: isLoadingMessages,
  } = useQuery({
    queryKey: ['message-thread', quote_id],
    queryFn: () => fetchMessageThread(quote_id!, authToken!),
    enabled: !!quote_id && !!authToken,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  // React Query: Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (body: string) => sendMessage(messageThreadData!.thread.id, body, authToken!),
    onSuccess: () => {
      // Refetch messages after sending
      queryClient.invalidateQueries({ queryKey: ['message-thread', quote_id] });
      setNewMessageBody('');
    },
  });

  // Handle message send
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessageBody.trim() && messageThreadData) {
      sendMessageMutation.mutate(newMessageBody.trim());
    }
  };

  // Handle proceed to booking
  const handleProceedToBooking = () => {
    // Navigate to booking flow
    navigate('/app/bookings');
  };

  // Loading state
  if (isLoadingQuote) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-black"></div>
                <p className="text-gray-600 text-lg font-medium">Loading quote details...</p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Error state
  if (quoteError || !quote) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-8 text-center">
              <h2 className="text-2xl font-bold text-red-800 mb-4">Quote Not Found</h2>
              <p className="text-red-600 mb-6">
                The quote you're looking for doesn't exist or you don't have permission to view it.
              </p>
              <Link
                to="/app/quotes"
                className="inline-block bg-black text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
              >
                Back to Quotes
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Calculate pricing if available
  const taxRate = 0.15; // 15% tax
  const subtotal = quote.final_subtotal || quote.estimate_subtotal || 0;
  const taxAmount = subtotal * taxRate;
  const totalAmount = subtotal + taxAmount;

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumb Navigation */}
          <nav className="mb-6">
            <ol className="flex items-center space-x-2 text-sm">
              <li>
                <Link to="/app" className="text-gray-600 hover:text-black transition-colors">
                  Dashboard
                </Link>
              </li>
              <li className="text-gray-400">/</li>
              <li>
                <Link to="/app/quotes" className="text-gray-600 hover:text-black transition-colors">
                  Quotes
                </Link>
              </li>
              <li className="text-gray-400">/</li>
              <li className="text-black font-semibold">Quote #{quote.id.slice(0, 8)}</li>
            </ol>
          </nav>

          {/* Header Section */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sm:p-8 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-black mb-2">
                  Quote #{quote.id.slice(0, 8)}
                </h1>
                <p className="text-gray-600">
                  Created on {formatDate(quote.created_at)}
                </p>
              </div>
              <div>
                <span className={getStatusBadgeClasses(quote.status)}>
                  {getStatusText(quote.status)}
                </span>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Quote Details */}
            <div className="lg:col-span-2 space-y-8">
              {/* Service Details Card */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sm:p-8">
                <h2 className="text-2xl font-bold text-black mb-6">Service Details</h2>
                {isLoadingService ? (
                  <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                  </div>
                ) : serviceDetails ? (
                  <div>
                    <h3 className="text-xl font-semibold text-black mb-3">{serviceDetails.name}</h3>
                    <p className="text-gray-600 leading-relaxed mb-4">{serviceDetails.description}</p>
                    <div className="flex flex-wrap gap-3">
                      {serviceDetails.requires_booking && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-300">
                          Requires Booking
                        </span>
                      )}
                      {serviceDetails.requires_proof && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 border border-purple-300">
                          Requires Proof Approval
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">Service details not available</p>
                )}
              </div>

              {/* Tier Details Card (if selected) */}
              {quote.tier_id && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sm:p-8">
                  <h2 className="text-2xl font-bold text-black mb-6">Selected Tier</h2>
                  {isLoadingTier ? (
                    <div className="animate-pulse space-y-4">
                      <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-4 bg-gray-200 rounded w-full"></div>
                    </div>
                  ) : tierDetails ? (
                    <div>
                      <h3 className="text-xl font-semibold text-black mb-3">{tierDetails.name}</h3>
                      {tierDetails.description && (
                        <p className="text-gray-600 mb-4">{tierDetails.description}</p>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <p className="text-sm text-gray-600 mb-1">Revision Limit</p>
                          <p className="text-2xl font-bold text-black">{tierDetails.revision_limit}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <p className="text-sm text-gray-600 mb-1">Turnaround Time</p>
                          <p className="text-2xl font-bold text-black">{tierDetails.turnaround_days} days</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500">Tier details not available</p>
                  )}
                </div>
              )}

              {/* Configuration Answers Card */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sm:p-8">
                <h2 className="text-2xl font-bold text-black mb-6">Your Configuration</h2>
                {isLoadingAnswers ? (
                  <div className="animate-pulse space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                        <div className="h-6 bg-gray-200 rounded w-2/3"></div>
                      </div>
                    ))}
                  </div>
                ) : quoteAnswers && quoteAnswers.length > 0 ? (
                  <div className="space-y-4">
                    {quoteAnswers.map((answer) => (
                      <div key={answer.id} className="border-b border-gray-200 pb-4 last:border-b-0 last:pb-0">
                        <p className="text-sm font-semibold text-gray-700 mb-1">
                          {answer.option_key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                        </p>
                        <p className="text-base text-black">
                          {typeof answer.value === 'object' ? JSON.stringify(answer.value) : String(answer.value)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No configuration details available</p>
                )}
              </div>

              {/* Uploaded Files Card */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sm:p-8">
                <h2 className="text-2xl font-bold text-black mb-6">Uploaded Files</h2>
                {isLoadingFiles ? (
                  <div className="animate-pulse space-y-4">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
                    ))}
                  </div>
                ) : uploadedFiles && uploadedFiles.length > 0 ? (
                  <div className="space-y-4">
                    {uploadedFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-black transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-semibold text-black truncate">{file.file_name}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <p className="text-sm text-gray-600">{formatFileSize(file.file_size)}</p>
                            <span className="text-gray-400">•</span>
                            <p className="text-sm text-gray-600">{file.file_type}</p>
                            {file.dpi_warning && (
                              <>
                                <span className="text-gray-400">•</span>
                                <span className="text-sm text-red-600 font-medium">Low DPI Warning</span>
                              </>
                            )}
                          </div>
                        </div>
                        <a
                          href={file.file_url}
                          download={file.file_name}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-4 px-4 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
                        >
                          Download
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No files uploaded</p>
                )}
              </div>

              {/* Admin Notes Card (if present) */}
              {quote.admin_notes && (
                <div className="bg-yellow-50 rounded-xl border-2 border-yellow-300 p-6 sm:p-8">
                  <h2 className="text-2xl font-bold text-black mb-4">Admin Notes</h2>
                  <p className="text-gray-800 leading-relaxed">{quote.admin_notes}</p>
                </div>
              )}
            </div>

            {/* Right Column - Pricing & Messages */}
            <div className="lg:col-span-1 space-y-8">
              {/* Pricing Card (if finalized) */}
              {(quote.status === 'APPROVED' || quote.status === 'PENDING') && subtotal > 0 && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sticky top-8">
                  <h2 className="text-xl font-bold text-black mb-6">Pricing Breakdown</h2>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                      <span className="text-gray-700">Subtotal</span>
                      <span className="text-lg font-semibold text-black">€{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                      <span className="text-gray-700">Tax (15%)</span>
                      <span className="text-lg font-semibold text-black">€{taxAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-xl font-bold text-black">Total</span>
                      <span className="text-2xl font-bold text-black">€{totalAmount.toFixed(2)}</span>
                    </div>
                  </div>

                  {quote.status === 'APPROVED' && (
                    <button
                      onClick={handleProceedToBooking}
                      className="w-full mt-6 bg-yellow-400 text-black px-6 py-4 rounded-lg font-bold text-lg hover:bg-yellow-500 transition-colors"
                    >
                      Proceed to Booking
                    </button>
                  )}

                  {quote.expires_at && (
                    <p className="text-sm text-gray-600 text-center mt-4">
                      Expires on {formatDate(quote.expires_at)}
                    </p>
                  )}
                </div>
              )}

              {/* Message Thread Card */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-black mb-6">Messages</h2>
                
                {isLoadingMessages ? (
                  <div className="animate-pulse space-y-4">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
                    ))}
                  </div>
                ) : messageThreadData && messageThreadData.messages.length > 0 ? (
                  <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                    {messageThreadData.messages.map((message) => (
                      <div
                        key={message.id}
                        className={`p-4 rounded-lg ${
                          message.sender_id === currentUser?.id
                            ? 'bg-black text-white ml-8'
                            : 'bg-gray-100 text-black mr-8'
                        }`}
                      >
                        <p className="text-sm leading-relaxed">{message.body}</p>
                        <p
                          className={`text-xs mt-2 ${
                            message.sender_id === currentUser?.id ? 'text-gray-400' : 'text-gray-600'
                          }`}
                        >
                          {formatDate(message.created_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 mb-6 text-center">No messages yet</p>
                )}

                {/* Send Message Form */}
                <form onSubmit={handleSendMessage} className="space-y-4">
                  <textarea
                    value={newMessageBody}
                    onChange={(e) => setNewMessageBody(e.target.value)}
                    placeholder="Type your message to admin..."
                    rows={4}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-black focus:ring-4 focus:ring-gray-200 focus:outline-none transition-all resize-none"
                  />
                  <button
                    type="submit"
                    disabled={!newMessageBody.trim() || sendMessageMutation.isPending}
                    className="w-full bg-black text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendMessageMutation.isPending ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Sending...
                      </span>
                    ) : (
                      'Send Message'
                    )}
                  </button>
                </form>

                {sendMessageMutation.isError && (
                  <p className="text-sm text-red-600 mt-2">
                    Failed to send message. Please try again.
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-4">
                <Link
                  to="/app/quotes"
                  className="block w-full text-center bg-gray-100 text-black px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors border-2 border-gray-300"
                >
                  Back to Quotes
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_QuoteDetail;