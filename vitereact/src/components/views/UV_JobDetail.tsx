import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import {
  User,
  FileText,
  Image,
  MessageSquare,
  CheckCircle,
  Clock,
  Upload,
  Send,
  Download,
  AlertCircle,
  Phone,
  Mail,
  Building2,
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS (Based on Zod Schemas)
// ============================================================================

interface OrderDetails {
  id: string;
  order_number: string;
  customer_id: string;
  service_id: string;
  tier_id: string;
  assigned_staff_id: string | null;
  status: 'QUOTE_REQUESTED' | 'QUOTE_APPROVED' | 'IN_PRODUCTION' | 'PROOF_SENT' | 'REVISION_REQUESTED' | 'COMPLETED' | 'CANCELLED';
  due_at: string | null;
  subtotal: string; // PostgreSQL NUMERIC returns as string
  tax_amount: string;
  total_amount: string;
  deposit_amount: string;
  balance_due: string;
  revision_count: number;
  created_at: string;
  updated_at: string;
}

interface CustomerInfo {
  id: string;
  name: string;
  email: string;
  customer_profile?: {
    phone: string | null;
    company_name: string | null;
  };
}

interface TierDeliverable {
  id: string;
  deliverable_group: string;
  deliverable_label: string;
  is_complete: boolean;
  completed_by_staff_id: string | null;
  completed_at: string | null;
  notes: string | null;
  progress_id: string; // orderDeliverablesProgress.id for updating
}

interface UploadedFile {
  id: string;
  owner_id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  dpi_warning: boolean;
  created_at: string;
}

interface ProofVersion {
  id: string;
  version_number: number;
  file_url: string;
  uploaded_by_staff_id: string;
  status: 'SENT' | 'APPROVED' | 'NEEDS_REVISION';
  staff_note: string | null;
  customer_comment: string | null;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  sender_id: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

interface MessageThread {
  id: string;
  order_id: string | null;
  messages: Message[];
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchOrderDetails = async (orderId: string, token: string): Promise<OrderDetails> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/orders/${orderId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.data;
};

const fetchCustomerInfo = async (customerId: string, token: string): Promise<CustomerInfo> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/users/${customerId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.data;
};

const fetchUploadedFiles = async (orderId: string, token: string): Promise<UploadedFile[]> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/uploads`,
    {
      params: { order_id: orderId },
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.data.uploads || [];
};

const fetchProofVersions = async (orderId: string, token: string): Promise<ProofVersion[]> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/orders/${orderId}/proofs`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.data.proofs || [];
};

const fetchTierDeliverables = async (orderId: string, token: string): Promise<TierDeliverable[]> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/orders/${orderId}/deliverables-progress`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.data.progress || [];
};

const fetchMessageThread = async (orderId: string, token: string): Promise<MessageThread | null> => {
  // First, find thread by order_id
  const threadsResponse = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/message-threads`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  
  const threads = threadsResponse.data.threads || [];
  const thread = threads.find((t: any) => t.order_id === orderId);
  
  if (!thread) return null;
  
  // Fetch messages for this thread
  const messagesResponse = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/message-threads/${thread.id}/messages`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  
  return {
    id: thread.id,
    order_id: thread.order_id,
    messages: messagesResponse.data.messages || [],
  };
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_JobDetail: React.FC = () => {
  const { order_id } = useParams<{ order_id: string }>();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // CRITICAL: Individual Zustand selectors
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);

  // Local state for forms
  const [newProofUpload, setNewProofUpload] = useState<{
    file: File | null;
    staff_note: string;
    is_uploading: boolean;
  }>({
    file: null,
    staff_note: '',
    is_uploading: false,
  });

  const [statusUpdateForm, setStatusUpdateForm] = useState<{
    new_status: string;
    notes: string;
    is_updating: boolean;
  }>({
    new_status: '',
    notes: '',
    is_updating: false,
  });

  const [newMessageText, setNewMessageText] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Auto-dismiss notifications
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Scroll to section if URL param exists
  useEffect(() => {
    const section = searchParams.get('section');
    if (section) {
      const element = document.getElementById(section);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [searchParams]);

  // ============================================================================
  // DATA FETCHING (React Query)
  // ============================================================================

  const { data: orderDetails, isLoading: isLoadingOrder } = useQuery({
    queryKey: ['order', order_id],
    queryFn: () => fetchOrderDetails(order_id!, authToken!),
    enabled: !!order_id && !!authToken,
    staleTime: 60000,
  });

  const { data: customerInfo, isLoading: isLoadingCustomer } = useQuery({
    queryKey: ['customer', orderDetails?.customer_id],
    queryFn: () => fetchCustomerInfo(orderDetails!.customer_id, authToken!),
    enabled: !!orderDetails?.customer_id && !!authToken,
    staleTime: 60000,
  });

  const { data: uploadedFiles = [], isLoading: isLoadingFiles } = useQuery({
    queryKey: ['uploads', order_id],
    queryFn: () => fetchUploadedFiles(order_id!, authToken!),
    enabled: !!order_id && !!authToken,
    staleTime: 60000,
  });

  const { data: proofVersions = [], isLoading: isLoadingProofs } = useQuery({
    queryKey: ['proofs', order_id],
    queryFn: () => fetchProofVersions(order_id!, authToken!),
    enabled: !!order_id && !!authToken,
    staleTime: 60000,
  });

  const { data: tierDeliverables = [], isLoading: isLoadingDeliverables } = useQuery({
    queryKey: ['deliverables', order_id],
    queryFn: () => fetchTierDeliverables(order_id!, authToken!),
    enabled: !!order_id && !!authToken,
    staleTime: 60000,
  });

  const { data: messageThread, isLoading: isLoadingMessages } = useQuery({
    queryKey: ['messages', order_id],
    queryFn: () => fetchMessageThread(order_id!, authToken!),
    enabled: !!order_id && !!authToken,
    staleTime: 30000,
  });

  // ============================================================================
  // MUTATIONS
  // ============================================================================

  const uploadProofMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/orders/${order_id}/proofs`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proofs', order_id] });
      setNewProofUpload({ file: null, staff_note: '', is_uploading: false });
      setNotification({ type: 'success', message: 'Proof uploaded successfully!' });
    },
    onError: (error: any) => {
      setNotification({ type: 'error', message: error.response?.data?.message || 'Failed to upload proof' });
      setNewProofUpload(prev => ({ ...prev, is_uploading: false }));
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const response = await axios.put(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/orders/${order_id}`,
        { status },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', order_id] });
      setStatusUpdateForm({ new_status: '', notes: '', is_updating: false });
      setNotification({ type: 'success', message: 'Order status updated successfully!' });
    },
    onError: (error: any) => {
      setNotification({ type: 'error', message: error.response?.data?.message || 'Failed to update status' });
      setStatusUpdateForm(prev => ({ ...prev, is_updating: false }));
    },
  });

  const markDeliverableCompleteMutation = useMutation({
    mutationFn: async ({ progressId, isComplete }: { progressId: string; isComplete: boolean }) => {
      const response = await axios.put(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/order-deliverables-progress/${progressId}`,
        {
          is_complete: isComplete,
          completed_by_staff_id: isComplete ? currentUser?.id : null,
          completed_at: isComplete ? new Date().toISOString() : null,
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliverables', order_id] });
    },
    onError: (error: any) => {
      setNotification({ type: 'error', message: error.response?.data?.message || 'Failed to update deliverable' });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (body: string) => {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/message-threads/${messageThread?.id}/messages`,
        { body },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', order_id] });
      setNewMessageText('');
      setNotification({ type: 'success', message: 'Message sent successfully!' });
    },
    onError: (error: any) => {
      setNotification({ type: 'error', message: error.response?.data?.message || 'Failed to send message' });
    },
  });

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleProofUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProofUpload.file) {
      setNotification({ type: 'error', message: 'Please select a file to upload' });
      return;
    }

    setNewProofUpload(prev => ({ ...prev, is_uploading: true }));

    const formData = new FormData();
    formData.append('file', newProofUpload.file);
    formData.append('staff_note', newProofUpload.staff_note);

    uploadProofMutation.mutate(formData);
  };

  const handleStatusUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusUpdateForm.new_status) {
      setNotification({ type: 'error', message: 'Please select a status' });
      return;
    }

    setStatusUpdateForm(prev => ({ ...prev, is_updating: true }));
    updateStatusMutation.mutate(statusUpdateForm.new_status);
  };

  const handleDeliverableToggle = (progressId: string, currentStatus: boolean) => {
    markDeliverableCompleteMutation.mutate({
      progressId,
      isComplete: !currentStatus,
    });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim()) {
      setNotification({ type: 'error', message: 'Please enter a message' });
      return;
    }

    sendMessageMutation.mutate(newMessageText);
  };

  const formatCurrency = (value: string | number) => {
    return `€${Number(value || 0).toFixed(2)}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      QUOTE_REQUESTED: 'bg-gray-100 text-gray-800',
      QUOTE_APPROVED: 'bg-blue-100 text-blue-800',
      IN_PRODUCTION: 'bg-yellow-100 text-black',
      PROOF_SENT: 'bg-purple-100 text-purple-800',
      REVISION_REQUESTED: 'bg-orange-100 text-orange-800',
      COMPLETED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // ============================================================================
  // LOADING STATE
  // ============================================================================

  if (isLoadingOrder) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-black mx-auto mb-4"></div>
            <p className="text-gray-600">Loading job details...</p>
          </div>
        </div>
      </>
    );
  }

  if (!orderDetails) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <p className="text-gray-900 font-semibold text-lg">Job not found</p>
            <p className="text-gray-600 mt-2">The job you're looking for doesn't exist.</p>
          </div>
        </div>
      </>
    );
  }

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Notification */}
          {notification && (
            <div className="fixed top-4 right-4 z-50 animate-slide-in">
              <div
                className={`px-6 py-4 rounded-lg shadow-lg ${
                  notification.type === 'success'
                    ? 'bg-green-600 text-white'
                    : 'bg-red-600 text-white'
                }`}
              >
                {notification.message}
              </div>
            </div>
          )}

          {/* Job Header */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">
                    Job #{orderDetails.order_number}
                  </h1>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(
                      orderDetails.status
                    )}`}
                  >
                    {orderDetails.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Created: {formatDate(orderDetails.created_at)}
                  </span>
                  {orderDetails.due_at && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4 text-red-600" />
                      Due: {formatDate(orderDetails.due_at)}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(orderDetails.total_amount)}
                </p>
                {Number(orderDetails.balance_due || 0) > 0 && (
                  <p className="text-sm text-red-600">
                    Balance Due: {formatCurrency(orderDetails.balance_due)}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Customer Information */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6" id="customer">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Customer Information
                </h2>
                {isLoadingCustomer ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-black mx-auto"></div>
                  </div>
                ) : customerInfo ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Name</p>
                      <p className="font-semibold text-gray-900">{customerInfo.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-600" />
                      <a
                        href={`mailto:${customerInfo.email}`}
                        className="text-blue-600 hover:underline"
                      >
                        {customerInfo.email}
                      </a>
                    </div>
                    {customerInfo.customer_profile?.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-600" />
                        <a
                          href={`tel:${customerInfo.customer_profile.phone}`}
                          className="text-blue-600 hover:underline"
                        >
                          {customerInfo.customer_profile.phone}
                        </a>
                      </div>
                    )}
                    {customerInfo.customer_profile?.company_name && (
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-600" />
                        <p className="text-gray-900">
                          {customerInfo.customer_profile.company_name}
                        </p>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              {/* Tier Deliverables Checklist */}
              <div
                className="bg-white rounded-xl shadow-lg border border-gray-100 p-6"
                id="deliverables"
              >
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Tier Deliverables
                </h2>
                {isLoadingDeliverables ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-black mx-auto"></div>
                  </div>
                ) : tierDeliverables.length > 0 ? (
                  <div className="space-y-4">
                    {Object.entries(
                      tierDeliverables.reduce((acc, deliverable) => {
                        const group = deliverable.deliverable_group;
                        if (!acc[group]) acc[group] = [];
                        acc[group].push(deliverable);
                        return acc;
                      }, {} as Record<string, TierDeliverable[]>)
                    ).map(([group, items]) => (
                      <div key={group}>
                        <h3 className="font-semibold text-gray-900 mb-2">{group}</h3>
                        <div className="space-y-2">
                          {items.map((deliverable) => (
                            <label
                              key={deliverable.id}
                              className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={deliverable.is_complete}
                                onChange={() =>
                                  handleDeliverableToggle(
                                    deliverable.progress_id,
                                    deliverable.is_complete
                                  )
                                }
                                className="mt-1 w-5 h-5 rounded border-gray-300 text-black focus:ring-yellow-400"
                              />
                              <div className="flex-1">
                                <p
                                  className={`font-medium ${
                                    deliverable.is_complete
                                      ? 'text-gray-600 line-through'
                                      : 'text-gray-900'
                                  }`}
                                >
                                  {deliverable.deliverable_label}
                                </p>
                                {deliverable.completed_at && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    Completed: {formatDate(deliverable.completed_at)}
                                  </p>
                                )}
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 text-center py-8">
                    No deliverables found for this tier
                  </p>
                )}
              </div>

              {/* Project Files */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6" id="files">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Project Files
                </h2>
                {isLoadingFiles ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-black mx-auto"></div>
                  </div>
                ) : uploadedFiles.length > 0 ? (
                  <div className="space-y-3">
                    {uploadedFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <FileText className="w-5 h-5 text-gray-600" />
                          <div>
                            <p className="font-medium text-gray-900">{file.file_name}</p>
                            <p className="text-sm text-gray-600">
                              {formatFileSize(file.file_size)} • Uploaded{' '}
                              {formatDate(file.created_at)}
                            </p>
                            {file.dpi_warning && (
                              <p className="text-xs text-red-600 mt-1">
                                ⚠️ Low DPI warning
                              </p>
                            )}
                          </div>
                        </div>
                        <a
                          href={file.file_url}
                          download
                          className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 text-center py-8">No files uploaded yet</p>
                )}
              </div>

              {/* Proofs Management */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6" id="proofs">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Image className="w-5 h-5" />
                  Proofs Management
                </h2>

                {/* Upload New Proof */}
                <form onSubmit={handleProofUpload} className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">Upload New Proof</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Proof File
                      </label>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) =>
                          setNewProofUpload((prev) => ({
                            ...prev,
                            file: e.target.files?.[0] || null,
                          }))
                        }
                        className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-white focus:outline-none focus:border-black"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Staff Note (Optional)
                      </label>
                      <textarea
                        value={newProofUpload.staff_note}
                        onChange={(e) =>
                          setNewProofUpload((prev) => ({
                            ...prev,
                            staff_note: e.target.value,
                          }))
                        }
                        rows={2}
                        placeholder="Add notes about this proof..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!newProofUpload.file || newProofUpload.is_uploading}
                      className="w-full px-6 py-3 bg-yellow-400 text-black font-semibold rounded-lg hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {newProofUpload.is_uploading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-black"></div>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-5 h-5" />
                          Upload Proof
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* Proof History */}
                <h3 className="font-semibold text-gray-900 mb-3">Proof History</h3>
                {isLoadingProofs ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-black mx-auto"></div>
                  </div>
                ) : proofVersions.length > 0 ? (
                  <div className="space-y-3">
                    {proofVersions
                      .sort((a, b) => b.version_number - a.version_number)
                      .map((proof) => (
                        <div
                          key={proof.id}
                          className="p-4 rounded-lg border border-gray-200"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="px-3 py-1 bg-black text-white text-xs font-semibold rounded-full">
                                V{proof.version_number}
                              </span>
                              <span
                                className={`px-3 py-1 text-xs font-medium rounded-full ${
                                  proof.status === 'APPROVED'
                                    ? 'bg-green-100 text-green-800'
                                    : proof.status === 'NEEDS_REVISION'
                                    ? 'bg-orange-100 text-orange-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {proof.status.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <a
                              href={proof.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                            >
                              View File
                              <Download className="w-4 h-4" />
                            </a>
                          </div>
                          {proof.staff_note && (
                            <p className="text-sm text-gray-600 mb-1">
                              <strong>Staff Note:</strong> {proof.staff_note}
                            </p>
                          )}
                          {proof.customer_comment && (
                            <p className="text-sm text-gray-600 mb-1">
                              <strong>Customer Comment:</strong> {proof.customer_comment}
                            </p>
                          )}
                          <p className="text-xs text-gray-500">
                            Uploaded: {formatDate(proof.created_at)}
                          </p>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-gray-600 text-center py-8">No proofs uploaded yet</p>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Status Update */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Update Status</h2>
                <form onSubmit={handleStatusUpdate} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      New Status
                    </label>
                    <select
                      value={statusUpdateForm.new_status}
                      onChange={(e) =>
                        setStatusUpdateForm((prev) => ({
                          ...prev,
                          new_status: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
                    >
                      <option value="">Select status...</option>
                      <option value="QUOTE_APPROVED">Quote Approved</option>
                      <option value="IN_PRODUCTION">In Production</option>
                      <option value="PROOF_SENT">Proof Sent</option>
                      <option value="REVISION_REQUESTED">Revision Requested</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={
                      !statusUpdateForm.new_status || statusUpdateForm.is_updating
                    }
                    className="w-full px-6 py-3 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {statusUpdateForm.is_updating ? 'Updating...' : 'Update Status'}
                  </button>
                </form>
              </div>

              {/* Messages */}
              <div
                className="bg-white rounded-xl shadow-lg border border-gray-100 p-6"
                id="messages"
              >
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Messages
                </h2>
                {isLoadingMessages ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-black mx-auto"></div>
                  </div>
                ) : messageThread ? (
                  <>
                    <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
                      {messageThread.messages.length > 0 ? (
                        messageThread.messages.map((message) => (
                          <div
                            key={message.id}
                            className={`p-3 rounded-lg ${
                              message.sender_id === currentUser?.id
                                ? 'bg-black text-white ml-8'
                                : 'bg-gray-100 text-gray-900 mr-8'
                            }`}
                          >
                            <p className="text-sm">{message.body}</p>
                            <p className="text-xs opacity-70 mt-1">
                              {formatDate(message.created_at)}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-600 text-center py-4">
                          No messages yet
                        </p>
                      )}
                    </div>
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <input
                        type="text"
                        value={newMessageText}
                        onChange={(e) => setNewMessageText(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
                      />
                      <button
                        type="submit"
                        disabled={!newMessageText.trim() || sendMessageMutation.isPending}
                        className="px-6 py-2 bg-yellow-400 text-black font-semibold rounded-lg hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </form>
                  </>
                ) : (
                  <p className="text-gray-600 text-center py-8">
                    No message thread found
                  </p>
                )}
              </div>

              {/* Quick Stats */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Job Stats</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Revision Count</span>
                    <span className="font-semibold text-gray-900">
                      {orderDetails.revision_count}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Deposit Paid</span>
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(orderDetails.deposit_amount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(orderDetails.subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax</span>
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(orderDetails.tax_amount)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-3 border-t border-gray-200">
                    <span className="text-gray-900 font-semibold">Total</span>
                    <span className="font-bold text-gray-900">
                      {formatCurrency(orderDetails.total_amount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_JobDetail;