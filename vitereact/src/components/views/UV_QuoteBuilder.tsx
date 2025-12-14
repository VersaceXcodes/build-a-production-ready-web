import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  CheckCircle, 
  Circle, 
  ChevronLeft, 
  ChevronRight, 
  Upload, 
  X, 
  FileText,
  AlertCircle,
  Loader,
  Check
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

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
}

interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
}

interface ServiceOption {
  id: string;
  service_id: string;
  key: string;
  label: string;
  field_type: 'text' | 'select' | 'number' | 'textarea' | 'checkbox';
  required: boolean;
  choices: string[] | null;
  pricing_impact: Record<string, number> | null;
  sort_order: number;
}

interface TierPackage {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  revision_limit: number;
  turnaround_days: number;
  is_active: boolean;
}

interface UploadedFile {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  dpi_warning: boolean;
  upload_progress: number;
  upload_status: 'pending' | 'uploading' | 'completed' | 'failed';
}

interface Quote {
  id: string;
  customer_id: string;
  service_id: string;
  tier_id: string | null;
  status: string;
  estimate_subtotal: number | null;
  final_subtotal: number | null;
  notes: string | null;
  admin_notes: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_QuoteBuilder: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // URL params
  const urlServiceId = searchParams.get('service_id');
  const urlStep = searchParams.get('step');
  const urlDraftId = searchParams.get('draft_id');

  // Global state access (individual selectors to prevent infinite loops)
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);

  // Wizard state
  const [wizardStep, setWizardStep] = useState<number>(urlStep ? parseInt(urlStep) : 1);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);
  const [projectAnswers, setProjectAnswers] = useState<Record<string, any>>({});
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [availableTiers, setAvailableTiers] = useState<TierPackage[]>([]);
  const [selectedTier, setSelectedTier] = useState<TierPackage | null>(null);
  const [specialNotes, setSpecialNotes] = useState<string>('');
  const [draftQuoteId, setDraftQuoteId] = useState<string | null>(urlDraftId);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  // File upload state
  const [isDragging, setIsDragging] = useState(false);

  // API base URL
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

  // ============================================================================
  // API QUERIES
  // ============================================================================

  // Fetch services list
  const { data: servicesData, isLoading: isLoadingServices } = useQuery({
    queryKey: ['services', 'active'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/services`, {
        params: { is_active: true }
      });
      return response.data;
    },
    staleTime: 300000, // 5 minutes
    enabled: wizardStep === 1
  });

  // Fetch service categories
  const { data: categoriesData } = useQuery({
    queryKey: ['service-categories', 'active'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/service-categories`, {
        params: { is_active: true }
      });
      return response.data;
    },
    staleTime: 300000,
    enabled: wizardStep === 1
  });

  // Fetch service options when service is selected
  const { data: optionsData, isLoading: isLoadingOptions } = useQuery({
    queryKey: ['service-options', selectedService?.id],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/services/${selectedService?.id}/options`);
      return response.data;
    },
    enabled: !!selectedService && wizardStep === 2,
    staleTime: 300000
  });

  // Fetch tier packages
  const { data: tiersData, isLoading: isLoadingTiers } = useQuery({
    queryKey: ['tier-packages', 'active'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/tier-packages`, {
        params: { is_active: true }
      });
      return response.data;
    },
    enabled: wizardStep === 4,
    staleTime: 300000
  });

  // Fetch draft quote if resuming
  const { data: draftQuoteData } = useQuery({
    queryKey: ['quote', draftQuoteId],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/quotes/${draftQuoteId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });
      return response.data;
    },
    enabled: !!draftQuoteId && !!authToken,
    staleTime: 60000
  });

  // ============================================================================
  // API MUTATIONS
  // ============================================================================

  // Create/update draft quote
  const saveDraftMutation = useMutation({
    mutationFn: async (quoteData: any) => {
      if (draftQuoteId) {
        const response = await axios.put(
          `${API_BASE_URL}/api/quotes/${draftQuoteId}`,
          quoteData,
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        return response.data;
      } else {
        const response = await axios.post(
          `${API_BASE_URL}/api/quotes`,
          quoteData,
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        return response.data;
      }
    },
    onSuccess: (data) => {
      if (!draftQuoteId) {
        setDraftQuoteId(data.id);
      }
      queryClient.invalidateQueries({ queryKey: ['quote', data.id] });
    }
  });

  // Submit quote answers
  const submitAnswersMutation = useMutation({
    mutationFn: async (answers: any) => {
      const response = await axios.post(
        `${API_BASE_URL}/api/quotes/${draftQuoteId}/answers`,
        { answers },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    }
  });

  // Upload file
  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('owner_id', currentUser?.id || '');
      if (draftQuoteId) {
        formData.append('quote_id', draftQuoteId);
      }

      const response = await axios.post(
        `${API_BASE_URL}/api/uploads`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      setUploadedFiles(prev => [...prev, {
        id: data.id,
        file_name: data.file_name,
        file_type: data.file_type,
        file_size: data.file_size,
        file_url: data.file_url,
        dpi_warning: data.dpi_warning,
        upload_progress: 100,
        upload_status: 'completed'
      }]);
      setNotification({ type: 'success', message: 'File uploaded successfully!' });
      setTimeout(() => setNotification(null), 3000);
    },
    onError: () => {
      setNotification({ type: 'error', message: 'File upload failed. Please try again.' });
      setTimeout(() => setNotification(null), 3000);
    }
  });

  // Delete file
  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      await axios.delete(`${API_BASE_URL}/api/uploads/${fileId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });
    },
    onSuccess: (_, fileId) => {
      setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
      setNotification({ type: 'success', message: 'File removed successfully!' });
      setTimeout(() => setNotification(null), 3000);
    }
  });

  // Finalize quote submission
  const finalizeQuoteMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.put(
        `${API_BASE_URL}/api/quotes/${draftQuoteId}`,
        { 
          status: 'REQUESTED',
          notes: specialNotes
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      setNotification({ type: 'success', message: 'Quote submitted successfully!' });
      setTimeout(() => {
        navigate(`/app/quotes/${data.id}`);
      }, 1500);
    },
    onError: () => {
      setNotification({ type: 'error', message: 'Failed to submit quote. Please try again.' });
      setTimeout(() => setNotification(null), 3000);
    }
  });

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Initialize service from URL param
  useEffect(() => {
    if (urlServiceId && servicesData?.services) {
      const service = servicesData.services.find((s: Service) => s.id === urlServiceId);
      if (service) {
        setSelectedService(service);
        setWizardStep(2);
      }
    }
  }, [urlServiceId, servicesData]);

  // Load service options when service is selected
  useEffect(() => {
    if (optionsData?.options) {
      const sortedOptions = [...optionsData.options].sort((a, b) => a.sort_order - b.sort_order);
      setServiceOptions(sortedOptions);
      
      // Initialize project answers with default values
      const initialAnswers: Record<string, any> = {};
      sortedOptions.forEach(opt => {
        initialAnswers[opt.key] = opt.field_type === 'checkbox' ? false : '';
      });
      setProjectAnswers(initialAnswers);
    }
  }, [optionsData]);

  // Load tier packages
  useEffect(() => {
    if (tiersData?.tiers) {
      setAvailableTiers(tiersData.tiers);
    }
  }, [tiersData]);

  // Load draft quote data
  useEffect(() => {
    if (draftQuoteData) {
      setSpecialNotes(draftQuoteData.notes || '');
      // Load other draft data as needed
    }
  }, [draftQuoteData]);

  // Auto-save draft on step completion
  useEffect(() => {
    if (isAuthenticated && selectedService && wizardStep >= 2) {
      const autoSaveTimeout = setTimeout(() => {
        handleSaveDraft();
      }, 5000); // Auto-save after 5 seconds of inactivity

      return () => clearTimeout(autoSaveTimeout);
    }
  }, [projectAnswers, selectedTier, specialNotes]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    setWizardStep(2);
    setValidationErrors({});
  };

  const handleProjectAnswerChange = (key: string, value: any) => {
    setProjectAnswers(prev => ({
      ...prev,
      [key]: value
    }));
    // Clear validation error for this field
    if (validationErrors[key]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    if (!isAuthenticated) {
      setNotification({ type: 'error', message: 'Please log in to upload files.' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg'];
      if (!allowedTypes.includes(file.type)) {
        setNotification({ type: 'error', message: 'Only PDF, PNG, and JPEG files are allowed.' });
        setTimeout(() => setNotification(null), 3000);
        continue;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setNotification({ type: 'error', message: 'File size must be less than 10MB.' });
        setTimeout(() => setNotification(null), 3000);
        continue;
      }

      // Upload file
      uploadFileMutation.mutate(file);
    }
  };

  const handleFileRemove = (fileId: string) => {
    deleteFileMutation.mutate(fileId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleTierSelect = (tier: TierPackage) => {
    setSelectedTier(tier);
    setValidationErrors({});
  };

  const handleSaveDraft = async () => {
    if (!isAuthenticated || !currentUser || !selectedService) return;

    const quoteData = {
      customer_id: currentUser.id,
      service_id: selectedService.id,
      tier_id: selectedTier?.id || null,
      notes: specialNotes || null
    };

    saveDraftMutation.mutate(quoteData);

    // Save answers if we have a draft quote ID
    if (draftQuoteId && Object.keys(projectAnswers).length > 0) {
      const answersArray = Object.entries(projectAnswers).map(([key, value]) => ({
        option_key: key,
        value: value
      }));
      submitAnswersMutation.mutate(answersArray);
    }
  };

  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!selectedService) {
          errors.service = 'Please select a service';
        }
        break;
      case 2:
        serviceOptions.forEach(option => {
          if (option.required && !projectAnswers[option.key]) {
            errors[option.key] = `${option.label} is required`;
          }
        });
        break;
      case 3:
        // Files are optional
        break;
      case 4:
        if (!selectedTier) {
          errors.tier = 'Please select a tier package';
        }
        break;
      case 5:
        // Special notes are optional
        break;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep(wizardStep)) {
      if (wizardStep < 5) {
        setWizardStep(wizardStep + 1);
      }
    } else {
      setNotification({ type: 'error', message: 'Please fix the errors before continuing.' });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handlePreviousStep = () => {
    if (wizardStep > 1) {
      setWizardStep(wizardStep - 1);
    }
  };

  const handleGoToStep = (step: number) => {
    if (step <= wizardStep) {
      setWizardStep(step);
    }
  };

  const handleSubmitQuote = async () => {
    if (!isAuthenticated) {
      setNotification({ type: 'error', message: 'Please log in to submit your quote.' });
      setTimeout(() => {
        navigate(`/login?redirect_url=/app/quotes/new`);
      }, 1500);
      return;
    }

    if (!validateStep(5)) {
      return;
    }

    // Save final draft before submission
    await handleSaveDraft();

    // Submit quote
    finalizeQuoteMutation.mutate();
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const groupServicesByCategory = () => {
    if (!servicesData?.services || !categoriesData?.categories) {
      return [];
    }

    return categoriesData.categories.map((category: ServiceCategory) => ({
      category,
      services: servicesData.services.filter((s: Service) => s.category_id === category.id)
    })).filter((group: any) => group.services.length > 0);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Build Your Quote
            </h1>
            <p className="text-gray-600">
              Follow the steps below to configure your custom quote
            </p>
          </div>

          {/* Step Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {[1, 2, 3, 4, 5].map((step) => (
                <div key={step} className="flex-1">
                  <div className="flex items-center">
                    <div className="relative">
                      <button
                        onClick={() => handleGoToStep(step)}
                        disabled={step > wizardStep}
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                          step < wizardStep
                            ? 'bg-yellow-400 text-gray-900'
                            : step === wizardStep
                            ? 'bg-gray-900 text-white ring-4 ring-yellow-400'
                            : 'bg-gray-200 text-gray-400'
                        } ${step <= wizardStep ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                      >
                        {step < wizardStep ? <Check className="w-5 h-5" /> : step}
                      </button>
                      <div className="absolute top-12 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                        <p className={`text-xs font-medium ${
                          step === wizardStep ? 'text-gray-900' : 'text-gray-500'
                        }`}>
                          {step === 1 && 'Service'}
                          {step === 2 && 'Details'}
                          {step === 3 && 'Files'}
                          {step === 4 && 'Tier'}
                          {step === 5 && 'Review'}
                        </p>
                      </div>
                    </div>
                    {step < 5 && (
                      <div className={`flex-1 h-1 mx-2 ${
                        step < wizardStep ? 'bg-yellow-400' : 'bg-gray-200'
                      }`} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notification */}
          {notification && (
            <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 ${
              notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
            }`}>
              {notification.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <span>{notification.message}</span>
            </div>
          )}

          {/* Step Content */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 md:p-8 mb-6">
            {/* Step 1: Service Selection */}
            {wizardStep === 1 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Select Your Service
                </h2>
                
                {isLoadingServices ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader className="w-8 h-8 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <div className="space-y-8">
                    {groupServicesByCategory().map((group: any) => (
                      <div key={group.category.id}>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                          {group.category.name}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {group.services.map((service: Service) => (
                            <button
                              key={service.id}
                              onClick={() => handleServiceSelect(service)}
                              className={`text-left p-4 rounded-lg border-2 transition-all ${
                                selectedService?.id === service.id
                                  ? 'border-yellow-400 bg-yellow-50'
                                  : 'border-gray-200 hover:border-gray-300 bg-white'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-gray-900 mb-1">
                                    {service.name}
                                  </h4>
                                  <p className="text-sm text-gray-600 line-clamp-2">
                                    {service.description}
                                  </p>
                                </div>
                                {selectedService?.id === service.id && (
                                  <CheckCircle className="w-6 h-6 text-yellow-400 ml-2 flex-shrink-0" />
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {validationErrors.service && (
                  <p className="text-red-600 text-sm mt-4 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {validationErrors.service}
                  </p>
                )}
              </div>
            )}

            {/* Step 2: Project Details */}
            {wizardStep === 2 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Project Details
                </h2>
                <p className="text-gray-600 mb-6">
                  Selected Service: <span className="font-semibold">{selectedService?.name}</span>
                </p>

                {isLoadingOptions ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader className="w-8 h-8 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {serviceOptions.map((option) => (
                      <div key={option.id}>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                          {option.label}
                          {option.required && <span className="text-red-600 ml-1">*</span>}
                        </label>

                        {option.field_type === 'text' && (
                          <input
                            type="text"
                            value={projectAnswers[option.key] || ''}
                            onChange={(e) => handleProjectAnswerChange(option.key, e.target.value)}
                            className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:ring-4 focus:ring-yellow-100 ${
                              validationErrors[option.key]
                                ? 'border-red-500'
                                : 'border-gray-200 focus:border-yellow-400'
                            }`}
                            placeholder={option.label}
                          />
                        )}

                        {option.field_type === 'number' && (
                          <input
                            type="number"
                            value={projectAnswers[option.key] || ''}
                            onChange={(e) => handleProjectAnswerChange(option.key, e.target.value)}
                            className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:ring-4 focus:ring-yellow-100 ${
                              validationErrors[option.key]
                                ? 'border-red-500'
                                : 'border-gray-200 focus:border-yellow-400'
                            }`}
                            placeholder={option.label}
                          />
                        )}

                        {option.field_type === 'select' && option.choices && (
                          <select
                            value={projectAnswers[option.key] || ''}
                            onChange={(e) => handleProjectAnswerChange(option.key, e.target.value)}
                            className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:ring-4 focus:ring-yellow-100 ${
                              validationErrors[option.key]
                                ? 'border-red-500'
                                : 'border-gray-200 focus:border-yellow-400'
                            }`}
                          >
                            <option value="">Select {option.label}</option>
                            {option.choices.map((choice) => (
                              <option key={choice} value={choice}>
                                {choice}
                              </option>
                            ))}
                          </select>
                        )}

                        {option.field_type === 'textarea' && (
                          <textarea
                            value={projectAnswers[option.key] || ''}
                            onChange={(e) => handleProjectAnswerChange(option.key, e.target.value)}
                            rows={4}
                            className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:ring-4 focus:ring-yellow-100 ${
                              validationErrors[option.key]
                                ? 'border-red-500'
                                : 'border-gray-200 focus:border-yellow-400'
                            }`}
                            placeholder={option.label}
                          />
                        )}

                        {option.field_type === 'checkbox' && (
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={projectAnswers[option.key] || false}
                              onChange={(e) => handleProjectAnswerChange(option.key, e.target.checked)}
                              className="w-5 h-5 rounded border-gray-300 text-yellow-400 focus:ring-yellow-400"
                            />
                            <span className="text-gray-700">{option.label}</span>
                          </label>
                        )}

                        {validationErrors[option.key] && (
                          <p className="text-red-600 text-sm mt-2 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            {validationErrors[option.key]}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: File Upload */}
            {wizardStep === 3 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Upload Your Files
                </h2>
                <p className="text-gray-600 mb-6">
                  Upload design files, logos, or reference materials (Optional)
                </p>

                {/* File Upload Area */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragging
                      ? 'border-yellow-400 bg-yellow-50'
                      : 'border-gray-300 bg-gray-50'
                  }`}
                >
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-700 font-medium mb-2">
                    Drag and drop files here, or click to browse
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    Accepted formats: PDF, PNG, JPEG (Max 10MB per file)
                  </p>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => handleFileSelect(e.target.files)}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="inline-block px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 cursor-pointer transition-colors"
                  >
                    Choose Files
                  </label>
                </div>

                {/* Uploaded Files List */}
                {uploadedFiles.length > 0 && (
                  <div className="mt-6 space-y-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Uploaded Files ({uploadedFiles.length})
                    </h3>
                    {uploadedFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <FileText className="w-6 h-6 text-gray-400" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {file.file_name}
                            </p>
                            <p className="text-sm text-gray-500">
                              {formatFileSize(file.file_size)}
                            </p>
                          </div>
                          {file.dpi_warning && (
                            <div className="flex items-center gap-1 text-yellow-600 text-sm">
                              <AlertCircle className="w-4 h-4" />
                              <span>Low DPI</span>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleFileRemove(file.id)}
                          disabled={deleteFileMutation.isPending}
                          className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* File Requirements */}
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">
                    File Requirements
                  </h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Minimum 300 DPI for print quality</li>
                    <li>• CMYK color mode preferred</li>
                    <li>• Include bleed area if applicable</li>
                    <li>• Vector formats recommended for logos</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Step 4: Tier Selection */}
            {wizardStep === 4 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Choose Your Package
                </h2>
                <p className="text-gray-600 mb-6">
                  Select a service tier that best fits your needs
                </p>

                {isLoadingTiers ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader className="w-8 h-8 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {availableTiers.map((tier) => (
                      <button
                        key={tier.id}
                        onClick={() => handleTierSelect(tier)}
                        className={`text-left p-6 rounded-xl border-2 transition-all ${
                          selectedTier?.id === tier.id
                            ? 'border-yellow-400 bg-yellow-50 ring-4 ring-yellow-100'
                            : 'border-gray-200 hover:border-gray-300 bg-white hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <h3 className="text-xl font-bold text-gray-900">
                            {tier.name}
                          </h3>
                          {selectedTier?.id === tier.id && (
                            <CheckCircle className="w-6 h-6 text-yellow-400" />
                          )}
                        </div>
                        
                        {tier.description && (
                          <p className="text-gray-600 text-sm mb-4">
                            {tier.description}
                          </p>
                        )}

                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm">
                            <Circle className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-700">
                              <strong>{tier.revision_limit}</strong> revisions included
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Circle className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-700">
                              <strong>{tier.turnaround_days}</strong> day turnaround
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {validationErrors.tier && (
                  <p className="text-red-600 text-sm mt-4 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {validationErrors.tier}
                  </p>
                )}
              </div>
            )}

            {/* Step 5: Review & Submit */}
            {wizardStep === 5 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Review Your Quote
                </h2>

                {/* Quote Summary */}
                <div className="space-y-6">
                  {/* Service */}
                  <div className="pb-4 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-500 mb-2">
                      SERVICE
                    </h3>
                    <p className="text-lg font-semibold text-gray-900">
                      {selectedService?.name}
                    </p>
                  </div>

                  {/* Project Details */}
                  <div className="pb-4 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-500 mb-3">
                      PROJECT DETAILS
                    </h3>
                    <div className="space-y-2">
                      {serviceOptions.map((option) => (
                        <div key={option.id} className="flex items-start gap-2">
                          <span className="text-gray-600 min-w-[120px]">
                            {option.label}:
                          </span>
                          <span className="font-medium text-gray-900">
                            {option.field_type === 'checkbox'
                              ? projectAnswers[option.key] ? 'Yes' : 'No'
                              : projectAnswers[option.key] || '-'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Files */}
                  {uploadedFiles.length > 0 && (
                    <div className="pb-4 border-b border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-500 mb-3">
                        UPLOADED FILES
                      </h3>
                      <div className="space-y-2">
                        {uploadedFiles.map((file) => (
                          <div key={file.id} className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-700 text-sm">
                              {file.file_name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tier */}
                  <div className="pb-4 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-500 mb-2">
                      PACKAGE
                    </h3>
                    <p className="text-lg font-semibold text-gray-900">
                      {selectedTier?.name}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {selectedTier?.revision_limit} revisions • {selectedTier?.turnaround_days} day turnaround
                    </p>
                  </div>

                  {/* Special Notes */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-500 mb-2">
                      SPECIAL REQUESTS (OPTIONAL)
                    </label>
                    <textarea
                      value={specialNotes}
                      onChange={(e) => setSpecialNotes(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-yellow-400 focus:outline-none focus:ring-4 focus:ring-yellow-100"
                      placeholder="Any special requirements or notes for your project..."
                    />
                  </div>

                  {/* Pricing Disclaimer */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-900">
                      <strong>Note:</strong> Final pricing will be provided by our team after reviewing your requirements. You'll receive a detailed quote within 24 hours.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between">
            <button
              onClick={handlePreviousStep}
              disabled={wizardStep === 1}
              className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-gray-900 text-gray-900 font-semibold rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
              Back
            </button>

            {wizardStep < 5 ? (
              <button
                onClick={handleNextStep}
                className="flex items-center gap-2 px-6 py-3 bg-yellow-400 text-gray-900 font-semibold rounded-lg hover:bg-yellow-500 transition-colors"
              >
                Next
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleSubmitQuote}
                disabled={finalizeQuoteMutation.isPending}
                className="flex items-center gap-2 px-6 py-3 bg-yellow-400 text-gray-900 font-semibold rounded-lg hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {finalizeQuoteMutation.isPending ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit Quote
                    <Check className="w-5 h-5" />
                  </>
                )}
              </button>
            )}
          </div>

          {/* Auto-save Indicator */}
          {saveDraftMutation.isPending && (
            <div className="text-center mt-4">
              <p className="text-sm text-gray-500 flex items-center justify-center gap-2">
                <Loader className="w-4 h-4 animate-spin" />
                Saving draft...
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default UV_QuoteBuilder;