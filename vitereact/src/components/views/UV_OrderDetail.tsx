import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  Package, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Calendar,
  FileText,
  Image as ImageIcon,
  MessageSquare,
  CreditCard,
  Download,
  Send,
  ThumbsUp,
  AlertTriangle
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Order {
  id: string;
  order_number: string;
  quote_id: string;
  customer_id: string;
  service_id: string;
  tier_id: string;
  assigned_staff_id: string | null;
  status: string;
  due_at: string | null;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  deposit_pct: number;
  deposit_amount: number;
  balance_due: number;
  revision_count: number;
  created_at: string;
  updated_at: string;
}

interface Service {
  id: string;
  name: string;
  description: string;
  requires_booking: boolean;
  requires_proof: boolean;
}

interface TierPackage {
  id: string;
  name: string;
  slug: string;
  revision_limit: number;
  turnaround_days: number;
}

interface ProofVersion {
  id: string;
  order_id: string;
  version_number: number;
  file_url: string;
  uploaded_by_staff_id: string;
  status: string;
  staff_note: string | null;
  customer_comment: string | null;
  created_at: string;
  updated_at: string;
}

interface Payment {
  id: string;
  order_id: string;
  amount: number;
  method: string;
  status: string;
  transaction_ref: string | null;
  receipt_url: string | null;
  created_at: string;
  updated_at: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  order_id: string;
  amount_due: number;
  issued_at: string;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

interface Booking {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  is_emergency: boolean;
  urgent_fee_pct: number | null;
  urgent_fee_amt: number | null;
}

interface Upload {
  id: string;
  owner_id: string;
  quote_id: string | null;
  order_id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  dpi_warning: boolean;
  created_at: string;
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
  order_id: string;
  messages: Message[];
  created_at: string;
  updated_at: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

const UV_OrderDetail: React.FC = () => {
  const { order_id } = useParams<{ order_id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // CRITICAL: Individual Zustand selectors - NO object destructuring
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);

  // Local state
  const [newMessageText, setNewMessageText] = useState('');
  const [changeRequestComment, setChangeRequestComment] = useState('');
  const [showChangeRequestForm, setShowChangeRequestForm] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Auto-dismiss notification
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // ============================================================================
  // DATA FETCHING - React Query
  // ============================================================================

  // Fetch order details
  const { data: orderData, isLoading: isLoadingOrder, error: orderError } = useQuery<Order>({
    queryKey: ['order', order_id],
    queryFn: async () => {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/orders/${order_id}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      // CRITICAL: Transform NUMERIC fields
      return {
        ...response.data,
        subtotal: Number(response.data.subtotal || 0),
        tax_rate: Number(response.data.tax_rate || 0),
        tax_amount: Number(response.data.tax_amount || 0),
        total_amount: Number(response.data.total_amount || 0),
        deposit_pct: Number(response.data.deposit_pct || 0),
        deposit_amount: Number(response.data.deposit_amount || 0),
        balance_due: Number(response.data.balance_due || 0),
        revision_count: Number(response.data.revision_count || 0),
      };
    },
    enabled: !!order_id && !!authToken,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  // Fetch service details
  const { data: serviceData } = useQuery<Service>({
    queryKey: ['service', orderData?.service_id],
    queryFn: async () => {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/services/${orderData?.service_id}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      return response.data;
    },
    enabled: !!orderData?.service_id && !!authToken,
    staleTime: 300000,
  });

  // Fetch tier details
  const { data: tierData } = useQuery<TierPackage>({
    queryKey: ['tier', orderData?.tier_id],
    queryFn: async () => {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/tier-packages/${orderData?.tier_id}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      return {
        ...response.data,
        revision_limit: Number(response.data.revision_limit || 0),
        turnaround_days: Number(response.data.turnaround_days || 0),
      };
    },
    enabled: !!orderData?.tier_id && !!authToken,
    staleTime: 300000,
  });

  // Fetch proof versions
  const { data: proofVersions = [] } = useQuery<ProofVersion[]>({
    queryKey: ['proofs', order_id],
    queryFn: async () => {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/orders/${order_id}/proofs`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      return (response.data.proofs || []).sort((a: ProofVersion, b: ProofVersion) => 
        b.version_number - a.version_number
      );
    },
    enabled: !!order_id && !!authToken,
    staleTime: 30000,
  });

  // Fetch payment history
  const { data: paymentHistory = [] } = useQuery<Payment[]>({
    queryKey: ['payments', order_id],
    queryFn: async () => {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/payments`,
        {
          params: {
            order_id: order_id,
            sort_by: 'created_at',
            sort_order: 'desc',
          },
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      return (response.data.payments || []).map((p: Payment) => ({
        ...p,
        amount: Number(p.amount || 0),
      }));
    },
    enabled: !!order_id && !!authToken,
    staleTime: 30000,
  });

  // Fetch invoices
  const { data: invoices = [] } = useQuery<Invoice[]>({
    queryKey: ['invoices', order_id],
    queryFn: async () => {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/invoices`,
        {
          params: {
            order_id: order_id,
          },
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      return (response.data.invoices || []).map((inv: Invoice) => ({
        ...inv,
        amount_due: Number(inv.amount_due || 0),
      }));
    },
    enabled: !!order_id && !!authToken,
    staleTime: 60000,
  });

  // Fetch booking info
  const { data: bookingInfo } = useQuery<Booking | null>({
    queryKey: ['booking', order_id],
    queryFn: async () => {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/bookings`,
        {
          params: {
            order_id: order_id,
          },
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      const bookings = response.data.bookings || [];
      if (bookings.length > 0) {
        const booking = bookings[0];
        return {
          ...booking,
          urgent_fee_pct: booking.urgent_fee_pct ? Number(booking.urgent_fee_pct) : null,
          urgent_fee_amt: booking.urgent_fee_amt ? Number(booking.urgent_fee_amt) : null,
        };
      }
      return null;
    },
    enabled: !!order_id && !!authToken,
    staleTime: 60000,
  });

  // Fetch uploaded files
  const { data: uploadedFiles = [] } = useQuery<Upload[]>({
    queryKey: ['uploads', order_id],
    queryFn: async () => {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/uploads`,
        {
          params: {
            order_id: order_id,
          },
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      return (response.data.uploads || []).map((u: Upload) => ({
        ...u,
        file_size: Number(u.file_size || 0),
      }));
    },
    enabled: !!order_id && !!authToken,
    staleTime: 60000,
  });

  // Fetch message thread
  const { data: messageThread } = useQuery<MessageThread | null>({
    queryKey: ['messageThread', order_id],
    queryFn: async () => {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/message-threads`,
        {
          params: {
            order_id: order_id,
          },
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      
      const threads = response.data.threads || [];
      if (threads.length > 0) {
        const thread = threads[0];
        const messagesResponse = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/message-threads/${thread.id}/messages`,
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        );
        
        return {
          ...thread,
          messages: messagesResponse.data.messages || [],
        };
      }
      return null;
    },
    enabled: !!order_id && !!authToken,
    staleTime: 10000,
  });

  // ============================================================================
  // MUTATIONS
  // ============================================================================

  // Approve proof mutation
  const approveProofMutation = useMutation({
    mutationFn: async (proofId: string) => {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/proof-versions/${proofId}/approve`,
        {},
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', order_id] });
      queryClient.invalidateQueries({ queryKey: ['proofs', order_id] });
      setNotification({ type: 'success', message: 'Proof approved! Your order will now proceed to production.' });
    },
    onError: (error: any) => {
      setNotification({ 
        type: 'error', 
        message: error.response?.data?.message || 'Failed to approve proof. Please try again.' 
      });
    },
  });

  // Request changes mutation
  const requestChangesMutation = useMutation({
    mutationFn: async ({ proofId, comment }: { proofId: string; comment: string }) => {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/proof-versions/${proofId}/request-changes`,
        {
          customer_comment: comment,
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', order_id] });
      queryClient.invalidateQueries({ queryKey: ['proofs', order_id] });
      setChangeRequestComment('');
      setShowChangeRequestForm(false);
      setNotification({ type: 'success', message: 'Change request submitted. Our team will review and upload a revised proof.' });
    },
    onError: (error: any) => {
      setNotification({ 
        type: 'error', 
        message: error.response?.data?.message || 'Failed to submit change request. Please try again.' 
      });
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageBody: string) => {
      if (!messageThread?.id) throw new Error('No message thread found');
      
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/message-threads/${messageThread.id}/messages`,
        {
          body: messageBody,
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messageThread', order_id] });
      setNewMessageText('');
      setNotification({ type: 'success', message: 'Message sent successfully!' });
    },
    onError: (error: any) => {
      setNotification({ 
        type: 'error', 
        message: error.response?.data?.message || 'Failed to send message. Please try again.' 
      });
    },
  });

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const currentProof = useMemo(() => {
    return proofVersions.find(p => p.status === 'SENT') || proofVersions[0] || null;
  }, [proofVersions]);

  const canRequestChanges = useMemo(() => {
    if (!orderData || !tierData) return false;
    return orderData.revision_count < tierData.revision_limit;
  }, [orderData, tierData]);

  const statusTimeline = useMemo(() => {
    if (!orderData) return [];
    
    const statuses = [
      { key: 'QUOTE_REQUESTED', label: 'Quote Requested', completed: true },
      { key: 'QUOTE_APPROVED', label: 'Quote Approved', completed: ['QUOTE_APPROVED', 'IN_PRODUCTION', 'PROOF_SENT', 'REVISION_REQUESTED', 'COMPLETED'].includes(orderData.status) },
      { key: 'IN_PRODUCTION', label: 'In Production', completed: ['IN_PRODUCTION', 'PROOF_SENT', 'REVISION_REQUESTED', 'COMPLETED'].includes(orderData.status) },
      { key: 'PROOF_SENT', label: 'Proof Sent', completed: ['PROOF_SENT', 'REVISION_REQUESTED', 'COMPLETED'].includes(orderData.status) },
      { key: 'COMPLETED', label: 'Completed', completed: orderData.status === 'COMPLETED' },
    ];
    
    return statuses;
  }, [orderData]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleApproveProof = () => {
    if (!currentProof) return;
    approveProofMutation.mutate(currentProof.id);
  };

  const handleRequestChanges = () => {
    if (!currentProof || !changeRequestComment.trim()) return;
    
    if (!canRequestChanges) {
      setNotification({ 
        type: 'error', 
        message: `Revision limit reached (${orderData?.revision_count}/${tierData?.revision_limit}). Please contact support for additional revisions.` 
      });
      return;
    }
    
    requestChangesMutation.mutate({ 
      proofId: currentProof.id, 
      comment: changeRequestComment.trim() 
    });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim()) return;
    sendMessageMutation.mutate(newMessageText.trim());
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IE', { 
      style: 'currency', 
      currency: 'EUR' 
    }).format(amount);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'QUOTE_REQUESTED': 'bg-gray-100 text-gray-800',
      'QUOTE_APPROVED': 'bg-blue-100 text-blue-800',
      'IN_PRODUCTION': 'bg-yellow-100 text-yellow-800',
      'PROOF_SENT': 'bg-purple-100 text-purple-800',
      'REVISION_REQUESTED': 'bg-orange-100 text-orange-800',
      'COMPLETED': 'bg-green-100 text-green-800',
      'CANCELLED': 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // ============================================================================
  // LOADING & ERROR STATES
  // ============================================================================

  if (isLoadingOrder) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-black"></div>
            <p className="text-gray-600 text-lg">Loading order details...</p>
          </div>
        </div>
      </>
    );
  }

  if (orderError || !orderData) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
            <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h2>
            <p className="text-gray-600 mb-6">
              We couldn't find the order you're looking for. It may have been deleted or you may not have access to it.
            </p>
            <Link
              to="/app/orders"
              className="inline-block px-6 py-3 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors"
            >
              Back to Orders
            </Link>
          </div>
        </div>
      </>
    );
  }

  // Ownership validation
  if (currentUser && orderData.customer_id !== currentUser.id) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-6">
              You don't have permission to view this order.
            </p>
            <Link
              to="/app/orders"
              className="inline-block px-6 py-3 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors"
            >
              Back to Orders
            </Link>
          </div>
        </div>
      </>
    );
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 max-w-md animate-fade-in">
          <div className={`rounded-lg shadow-lg px-6 py-4 ${
            notification.type === 'success' 
              ? 'bg-green-600 text-white' 
              : 'bg-red-600 text-white'
          }`}>
            <div className="flex items-center gap-3">
              {notification.type === 'success' ? (
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 flex-shrink-0" />
              )}
              <p className="text-sm font-medium">{notification.message}</p>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          
          {/* Back Navigation */}
          <div className="mb-6">
            <Link 
              to="/app/orders"
              className="inline-flex items-center text-gray-600 hover:text-black font-medium transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Orders
            </Link>
          </div>

          {/* Order Header Card */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">
                    Order #{orderData.order_number}
                  </h1>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(orderData.status)}`}>
                    {orderData.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-lg text-gray-700">
                    <span className="font-semibold">Service:</span> {serviceData?.name || 'Loading...'}
                  </p>
                  <p className="text-lg text-gray-700">
                    <span className="font-semibold">Tier:</span> {tierData?.name || 'Loading...'}
                  </p>
                </div>
              </div>
              <div className="text-left lg:text-right space-y-2">
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="w-5 h-5" />
                  <span>Created: {formatDate(orderData.created_at)}</span>
                </div>
                {orderData.due_at && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-5 h-5" />
                    <span>Due: {formatDate(orderData.due_at)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Status Timeline */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Order Progress</h2>
            <div className="relative">
              <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200">
                <div 
                  className="h-full bg-black transition-all duration-500"
                  style={{ 
                    width: `${(statusTimeline.filter(s => s.completed).length / statusTimeline.length) * 100}%` 
                  }}
                />
              </div>
              <div className="relative flex justify-between">
                {statusTimeline.map((status, index) => (
                  <div key={status.key} className="flex flex-col items-center" style={{ width: `${100 / statusTimeline.length}%` }}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 ${
                      status.completed 
                        ? 'bg-black border-black' 
                        : 'bg-white border-gray-300'
                    }`}>
                      {status.completed ? (
                        <CheckCircle className="w-6 h-6 text-white" />
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-gray-300" />
                      )}
                    </div>
                    <p className={`mt-3 text-sm font-medium text-center ${
                      status.completed ? 'text-black' : 'text-gray-500'
                    }`}>
                      {status.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Proofs Section */}
              {serviceData?.requires_proof && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <ImageIcon className="w-6 h-6" />
                    Proofs & Approvals
                  </h2>
                  
                  {proofVersions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No proofs uploaded yet. Your design team will upload proofs for your review.</p>
                    </div>
                  ) : (
                    <>
                      {/* Current Proof */}
                      {currentProof && currentProof.status === 'SENT' && (
                        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 mb-6">
                          <div className="flex items-start gap-3 mb-4">
                            <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
                            <div>
                              <h3 className="font-bold text-gray-900 mb-1">
                                Proof Version {currentProof.version_number} - Awaiting Your Approval
                              </h3>
                              <p className="text-sm text-gray-700 mb-3">
                                Please review the proof below and approve it or request changes.
                              </p>
                              {currentProof.staff_note && (
                                <div className="bg-white rounded p-3 mb-3">
                                  <p className="text-sm font-semibold text-gray-900 mb-1">Note from Design Team:</p>
                                  <p className="text-sm text-gray-700">{currentProof.staff_note}</p>
                                </div>
                              )}
                              
                              {/* Proof Image/File */}
                              <div className="mb-4">
                                <a 
                                  href={currentProof.file_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="block"
                                >
                                  <img 
                                    src={currentProof.file_url} 
                                    alt={`Proof version ${currentProof.version_number}`}
                                    className="w-full rounded-lg border-2 border-gray-200 hover:border-black transition-colors cursor-pointer"
                                  />
                                </a>
                              </div>
                              
                              {/* Action Buttons */}
                              {!showChangeRequestForm ? (
                                <div className="flex flex-col sm:flex-row gap-3">
                                  <button
                                    onClick={handleApproveProof}
                                    disabled={approveProofMutation.isPending}
                                    className="flex-1 px-6 py-3 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                  >
                                    {approveProofMutation.isPending ? (
                                      <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                                        Approving...
                                      </>
                                    ) : (
                                      <>
                                        <ThumbsUp className="w-5 h-5" />
                                        Approve Proof
                                      </>
                                    )}
                                  </button>
                                  <button
                                    onClick={() => setShowChangeRequestForm(true)}
                                    disabled={!canRequestChanges}
                                    className="flex-1 px-6 py-3 bg-white text-black border-2 border-black font-semibold rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    Request Changes {!canRequestChanges && `(Limit Reached)`}
                                  </button>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  <div>
                                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                                      What changes would you like?
                                    </label>
                                    <textarea
                                      value={changeRequestComment}
                                      onChange={(e) => setChangeRequestComment(e.target.value)}
                                      rows={4}
                                      placeholder="Please describe the changes you'd like to see..."
                                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-black focus:ring-4 focus:ring-gray-100 transition-all"
                                    />
                                  </div>
                                  {tierData && (
                                    <p className="text-sm text-gray-600">
                                      Revisions used: {orderData.revision_count} / {tierData.revision_limit}
                                    </p>
                                  )}
                                  <div className="flex gap-3">
                                    <button
                                      onClick={handleRequestChanges}
                                      disabled={requestChangesMutation.isPending || !changeRequestComment.trim()}
                                      className="flex-1 px-6 py-3 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {requestChangesMutation.isPending ? 'Submitting...' : 'Submit Request'}
                                    </button>
                                    <button
                                      onClick={() => {
                                        setShowChangeRequestForm(false);
                                        setChangeRequestComment('');
                                      }}
                                      className="px-6 py-3 bg-gray-200 text-gray-900 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Proof History */}
                      <div>
                        <h3 className="font-bold text-gray-900 mb-3">Proof History</h3>
                        <div className="space-y-3">
                          {proofVersions.map((proof) => (
                            <div key={proof.id} className="border border-gray-200 rounded-lg p-4">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <p className="font-semibold text-gray-900">Version {proof.version_number}</p>
                                  <p className="text-sm text-gray-600">{formatDate(proof.created_at)}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                  proof.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                  proof.status === 'NEEDS_REVISION' ? 'bg-orange-100 text-orange-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {proof.status.replace(/_/g, ' ')}
                                </span>
                              </div>
                              {proof.staff_note && (
                                <p className="text-sm text-gray-700 mb-2">
                                  <span className="font-semibold">Staff Note:</span> {proof.staff_note}
                                </p>
                              )}
                              {proof.customer_comment && (
                                <p className="text-sm text-gray-700 mb-2">
                                  <span className="font-semibold">Your Comment:</span> {proof.customer_comment}
                                </p>
                              )}
                              <a 
                                href={proof.file_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-sm text-black hover:underline font-medium inline-flex items-center gap-1"
                              >
                                <Download className="w-4 h-4" />
                                View Proof
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Uploaded Files Section */}
              {uploadedFiles.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="w-6 h-6" />
                    Your Uploaded Files
                  </h2>
                  <div className="space-y-3">
                    {uploadedFiles.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-black transition-colors">
                        <div className="flex items-center gap-3">
                          <FileText className="w-8 h-8 text-gray-600" />
                          <div>
                            <p className="font-medium text-gray-900">{file.file_name}</p>
                            <p className="text-sm text-gray-600">
                              {file.file_type} • {formatFileSize(file.file_size)}
                            </p>
                            {file.dpi_warning && (
                              <p className="text-xs text-orange-600 font-medium mt-1">
                                ⚠️ Low DPI warning - may affect print quality
                              </p>
                            )}
                          </div>
                        </div>
                        <a
                          href={file.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages Section */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <MessageSquare className="w-6 h-6" />
                  Messages
                </h2>
                
                {messageThread && messageThread.messages.length > 0 ? (
                  <div className="space-y-4 mb-6">
                    {messageThread.messages.map((message) => {
                      const isCustomer = message.sender_id === currentUser?.id;
                      return (
                        <div key={message.id} className={`flex ${isCustomer ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-lg px-4 py-3 rounded-lg ${
                            isCustomer 
                              ? 'bg-black text-white' 
                              : 'bg-gray-100 text-gray-900'
                          }`}>
                            <p className="text-sm font-semibold mb-1">
                              {isCustomer ? 'You' : 'Staff'}
                            </p>
                            <p className="text-sm whitespace-pre-wrap">{message.body}</p>
                            <p className={`text-xs mt-2 ${isCustomer ? 'text-gray-300' : 'text-gray-600'}`}>
                              {formatDate(message.created_at)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-6">No messages yet. Start a conversation with our team!</p>
                )}
                
                {/* Send Message Form */}
                <form onSubmit={handleSendMessage} className="space-y-3">
                  <textarea
                    value={newMessageText}
                    onChange={(e) => setNewMessageText(e.target.value)}
                    rows={3}
                    placeholder="Type your message here..."
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-black focus:ring-4 focus:ring-gray-100 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={sendMessageMutation.isPending || !newMessageText.trim()}
                    className="px-6 py-3 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {sendMessageMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Message
                      </>
                    )}
                  </button>
                </form>
              </div>

            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-6">
              
              {/* Payment Information */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <CreditCard className="w-6 h-6" />
                  Payment Details
                </h2>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-gray-700">
                    <span>Subtotal:</span>
                    <span className="font-semibold">{formatCurrency(orderData.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>Tax ({(orderData.tax_rate * 100).toFixed(1)}%):</span>
                    <span className="font-semibold">{formatCurrency(orderData.tax_amount)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-gray-900 pt-3 border-t">
                    <span>Total:</span>
                    <span>{formatCurrency(orderData.total_amount)}</span>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-700">Deposit ({orderData.deposit_pct}%):</span>
                    <span className="font-semibold text-green-700">{formatCurrency(orderData.deposit_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Balance Due:</span>
                    <span className="font-bold text-lg text-black">{formatCurrency(orderData.balance_due)}</span>
                  </div>
                </div>
                
                {orderData.balance_due > 0 && (
                  <button
                    className="w-full px-6 py-3 bg-yellow-400 text-black font-bold rounded-lg hover:bg-yellow-500 transition-colors flex items-center justify-center gap-2"
                  >
                    <CreditCard className="w-5 h-5" />
                    Make Payment
                  </button>
                )}
                
                {/* Payment History */}
                {paymentHistory.length > 0 && (
                  <div className="mt-6 pt-6 border-t">
                    <h3 className="font-bold text-gray-900 mb-3">Payment History</h3>
                    <div className="space-y-2">
                      {paymentHistory.map((payment) => (
                        <div key={payment.id} className="flex justify-between items-start text-sm">
                          <div>
                            <p className="font-medium text-gray-900">{formatCurrency(payment.amount)}</p>
                            <p className="text-gray-600">{formatDate(payment.created_at)}</p>
                            <p className="text-gray-600">{payment.method.replace(/_/g, ' ')}</p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            payment.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                            payment.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {payment.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Booking Information */}
              {bookingInfo && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Calendar className="w-6 h-6" />
                    Appointment
                  </h2>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Date & Time</p>
                      <p className="font-semibold text-gray-900">
                        {formatDate(bookingInfo.start_at)} - {new Date(bookingInfo.end_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                        bookingInfo.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                        bookingInfo.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {bookingInfo.status}
                      </span>
                    </div>
                    
                    {bookingInfo.is_emergency && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                        <p className="text-sm font-semibold text-orange-900 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          Emergency Booking
                        </p>
                        {bookingInfo.urgent_fee_amt && (
                          <p className="text-sm text-orange-800 mt-1">
                            Urgent fee: {formatCurrency(bookingInfo.urgent_fee_amt)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Invoices */}
              {invoices.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="w-6 h-6" />
                    Invoices
                  </h2>
                  
                  <div className="space-y-3">
                    {invoices.map((invoice) => (
                      <div key={invoice.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold text-gray-900">#{invoice.invoice_number}</p>
                            <p className="text-sm text-gray-600">{formatDate(invoice.issued_at)}</p>
                          </div>
                          <p className="font-bold text-gray-900">{formatCurrency(invoice.amount_due)}</p>
                        </div>
                        {invoice.paid_at && (
                          <p className="text-sm text-green-700 font-medium mb-2">
                            ✓ Paid on {formatDate(invoice.paid_at)}
                          </p>
                        )}
                        <button
                          className="text-sm text-black hover:underline font-medium flex items-center gap-1"
                        >
                          <Download className="w-4 h-4" />
                          Download Invoice
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default UV_OrderDetail;