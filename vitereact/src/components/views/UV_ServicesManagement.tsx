import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  Check, 
  AlertCircle,
  Settings,
  List,
  FolderOpen,
  Star,
  Calendar,
  FileText,
  GripVertical
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
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
  category_name?: string;
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
  created_at: string;
  updated_at: string;
}

interface CategoryFormData {
  id: string | null;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
}

interface ServiceFormData {
  id: string | null;
  category_id: string;
  name: string;
  slug: string;
  description: string;
  requires_booking: boolean;
  requires_proof: boolean;
  is_top_seller: boolean;
  is_active: boolean;
}

interface OptionFormData {
  key: string;
  label: string;
  field_type: 'text' | 'select' | 'number' | 'textarea' | 'checkbox';
  required: boolean;
  choices: string[] | null;
  pricing_impact: Record<string, number> | null;
  sort_order: number;
}

interface Notification {
  type: 'success' | 'error';
  message: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_ServicesManagement: React.FC = () => {
  // URL Params
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');

  // Global State (Individual Zustand selectors)
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const currentUser = useAppStore(state => state.authentication_state.current_user);

  // Query Client
  const queryClient = useQueryClient();

  // Local State
  const [activeTab, setActiveTab] = useState<'categories' | 'services'>(
    urlTab === 'categories' ? 'categories' : 'services'
  );
  const [notification, setNotification] = useState<Notification | null>(null);

  // Category Modal State
  const [editCategoryModal, setEditCategoryModal] = useState({
    is_open: false,
    category_data: {
      id: null as string | null,
      name: '',
      slug: '',
      sort_order: 0,
      is_active: true
    } as CategoryFormData,
    is_saving: false,
    error: null as string | null
  });

  // Service Modal State
  const [editServiceModal, setEditServiceModal] = useState({
    is_open: false,
    service_data: {
      id: null as string | null,
      category_id: '',
      name: '',
      slug: '',
      description: '',
      requires_booking: false,
      requires_proof: false,
      is_top_seller: false,
      is_active: true
    } as ServiceFormData,
    is_saving: false,
    error: null as string | null
  });

  // Service Options State
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [addOptionForm, setAddOptionForm] = useState({
    is_open: false,
    option_data: {
      key: '',
      label: '',
      field_type: 'text' as const,
      required: false,
      choices: null as string[] | null,
      pricing_impact: null as Record<string, number> | null,
      sort_order: 0
    } as OptionFormData,
    is_saving: false
  });
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);
  const [choicesInput, setChoicesInput] = useState('');

  // Sync tab with URL
  useEffect(() => {
    if (urlTab && (urlTab === 'categories' || urlTab === 'services')) {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  // Auto-dismiss notifications
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // ============================================================================
  // API FUNCTIONS
  // ============================================================================

  // Fetch Service Categories
  const { data: serviceCategories = [], isLoading: isLoadingCategories } = useQuery({
    queryKey: ['service-categories'],
    queryFn: async () => {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/service-categories`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      return response.data.categories as ServiceCategory[];
    },
    enabled: !!authToken,
    staleTime: 60000,
    refetchOnWindowFocus: false
  });

  // Fetch Services
  const { data: servicesList = [], isLoading: isLoadingServices } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/services`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      // Join category names
      const servicesWithCategories = response.data.services.map((service: Service) => ({
        ...service,
        category_name: serviceCategories.find(cat => cat.id === service.category_id)?.name || 'Unknown'
      }));
      
      return servicesWithCategories as Service[];
    },
    enabled: !!authToken && serviceCategories.length > 0,
    staleTime: 60000,
    refetchOnWindowFocus: false
  });

  // Fetch Service Options
  const { data: serviceOptions = [], isLoading: isLoadingOptions } = useQuery({
    queryKey: ['service-options', selectedServiceId],
    queryFn: async () => {
      if (!selectedServiceId) return [];
      
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/services/${selectedServiceId}/options`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      return response.data.options as ServiceOption[];
    },
    enabled: !!authToken && !!selectedServiceId,
    staleTime: 60000,
    refetchOnWindowFocus: false
  });

  // Create Category Mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (data: Omit<CategoryFormData, 'id'>) => {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/service-categories`,
        data,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-categories'] });
      setNotification({ type: 'success', message: 'Category created successfully!' });
      setEditCategoryModal({
        is_open: false,
        category_data: { id: null, name: '', slug: '', sort_order: 0, is_active: true },
        is_saving: false,
        error: null
      });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to create category';
      setEditCategoryModal(prev => ({ ...prev, error: message, is_saving: false }));
    }
  });

  // Update Category Mutation
  const updateCategoryMutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      const response = await axios.put(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/service-categories/${data.id}`,
        {
          name: data.name,
          slug: data.slug,
          sort_order: data.sort_order,
          is_active: data.is_active
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-categories'] });
      setNotification({ type: 'success', message: 'Category updated successfully!' });
      setEditCategoryModal({
        is_open: false,
        category_data: { id: null, name: '', slug: '', sort_order: 0, is_active: true },
        is_saving: false,
        error: null
      });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to update category';
      setEditCategoryModal(prev => ({ ...prev, error: message, is_saving: false }));
    }
  });

  // Delete Category Mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      await axios.delete(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/service-categories/${categoryId}`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-categories'] });
      setNotification({ type: 'success', message: 'Category deleted successfully!' });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to delete category';
      setNotification({ type: 'error', message });
    }
  });

  // Create Service Mutation
  const createServiceMutation = useMutation({
    mutationFn: async (data: Omit<ServiceFormData, 'id'>) => {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/services`,
        data,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      setNotification({ type: 'success', message: 'Service created successfully!' });
      setEditServiceModal({
        is_open: false,
        service_data: {
          id: null,
          category_id: '',
          name: '',
          slug: '',
          description: '',
          requires_booking: false,
          requires_proof: false,
          is_top_seller: false,
          is_active: true
        },
        is_saving: false,
        error: null
      });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to create service';
      setEditServiceModal(prev => ({ ...prev, error: message, is_saving: false }));
    }
  });

  // Update Service Mutation
  const updateServiceMutation = useMutation({
    mutationFn: async (data: ServiceFormData) => {
      const response = await axios.put(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/services/${data.id}`,
        {
          category_id: data.category_id,
          name: data.name,
          slug: data.slug,
          description: data.description,
          requires_booking: data.requires_booking,
          requires_proof: data.requires_proof,
          is_top_seller: data.is_top_seller,
          is_active: data.is_active
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      setNotification({ type: 'success', message: 'Service updated successfully!' });
      setEditServiceModal({
        is_open: false,
        service_data: {
          id: null,
          category_id: '',
          name: '',
          slug: '',
          description: '',
          requires_booking: false,
          requires_proof: false,
          is_top_seller: false,
          is_active: true
        },
        is_saving: false,
        error: null
      });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to update service';
      setEditServiceModal(prev => ({ ...prev, error: message, is_saving: false }));
    }
  });

  // Delete Service Mutation
  const deleteServiceMutation = useMutation({
    mutationFn: async (serviceId: string) => {
      await axios.delete(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/services/${serviceId}`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      setNotification({ type: 'success', message: 'Service deleted successfully!' });
      if (selectedServiceId) {
        setSelectedServiceId(null);
      }
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to delete service';
      setNotification({ type: 'error', message });
    }
  });

  // Create Service Option Mutation
  const createOptionMutation = useMutation({
    mutationFn: async (data: OptionFormData) => {
      if (!selectedServiceId) throw new Error('No service selected');
      
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/services/${selectedServiceId}/options`,
        data,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-options', selectedServiceId] });
      setNotification({ type: 'success', message: 'Service option created successfully!' });
      setAddOptionForm({
        is_open: false,
        option_data: {
          key: '',
          label: '',
          field_type: 'text',
          required: false,
          choices: null,
          pricing_impact: null,
          sort_order: 0
        },
        is_saving: false
      });
      setChoicesInput('');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to create option';
      setNotification({ type: 'error', message });
      setAddOptionForm(prev => ({ ...prev, is_saving: false }));
    }
  });

  // Update Service Option Mutation
  const updateOptionMutation = useMutation({
    mutationFn: async ({ optionId, data }: { optionId: string; data: OptionFormData }) => {
      const response = await axios.put(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/service-options/${optionId}`,
        data,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-options', selectedServiceId] });
      setNotification({ type: 'success', message: 'Service option updated successfully!' });
      setEditingOptionId(null);
      setAddOptionForm({
        is_open: false,
        option_data: {
          key: '',
          label: '',
          field_type: 'text',
          required: false,
          choices: null,
          pricing_impact: null,
          sort_order: 0
        },
        is_saving: false
      });
      setChoicesInput('');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to update option';
      setNotification({ type: 'error', message });
      setAddOptionForm(prev => ({ ...prev, is_saving: false }));
    }
  });

  // Delete Service Option Mutation
  const deleteOptionMutation = useMutation({
    mutationFn: async (optionId: string) => {
      await axios.delete(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/service-options/${optionId}`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-options', selectedServiceId] });
      setNotification({ type: 'success', message: 'Service option deleted successfully!' });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to delete option';
      setNotification({ type: 'error', message });
    }
  });

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleTabChange = (tab: 'categories' | 'services') => {
    setActiveTab(tab);
    setSearchParams({ tab });
    setSelectedServiceId(null);
  };

  const openAddCategoryModal = () => {
    setEditCategoryModal({
      is_open: true,
      category_data: {
        id: null,
        name: '',
        slug: '',
        sort_order: serviceCategories.length,
        is_active: true
      },
      is_saving: false,
      error: null
    });
  };

  const openEditCategoryModal = (category: ServiceCategory) => {
    setEditCategoryModal({
      is_open: true,
      category_data: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        sort_order: category.sort_order,
        is_active: category.is_active
      },
      is_saving: false,
      error: null
    });
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditCategoryModal(prev => ({ ...prev, error: null, is_saving: true }));

    // Validation
    if (!editCategoryModal.category_data.name.trim()) {
      setEditCategoryModal(prev => ({
        ...prev,
        error: 'Category name is required',
        is_saving: false
      }));
      return;
    }

    if (!editCategoryModal.category_data.slug.trim() || !/^[a-z0-9-]+$/.test(editCategoryModal.category_data.slug)) {
      setEditCategoryModal(prev => ({
        ...prev,
        error: 'Slug must contain only lowercase letters, numbers, and hyphens',
        is_saving: false
      }));
      return;
    }

    if (editCategoryModal.category_data.id) {
      updateCategoryMutation.mutate(editCategoryModal.category_data);
    } else {
      const { id, ...dataWithoutId } = editCategoryModal.category_data;
      createCategoryMutation.mutate(dataWithoutId);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this category? This action cannot be undone.');
    if (confirmed) {
      deleteCategoryMutation.mutate(categoryId);
    }
  };

  const openAddServiceModal = () => {
    setEditServiceModal({
      is_open: true,
      service_data: {
        id: null,
        category_id: serviceCategories[0]?.id || '',
        name: '',
        slug: '',
        description: '',
        requires_booking: false,
        requires_proof: false,
        is_top_seller: false,
        is_active: true
      },
      is_saving: false,
      error: null
    });
  };

  const openEditServiceModal = (service: Service) => {
    setEditServiceModal({
      is_open: true,
      service_data: {
        id: service.id,
        category_id: service.category_id,
        name: service.name,
        slug: service.slug,
        description: service.description,
        requires_booking: service.requires_booking,
        requires_proof: service.requires_proof,
        is_top_seller: service.is_top_seller,
        is_active: service.is_active
      },
      is_saving: false,
      error: null
    });
  };

  const handleServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditServiceModal(prev => ({ ...prev, error: null, is_saving: true }));

    // Validation
    if (!editServiceModal.service_data.name.trim()) {
      setEditServiceModal(prev => ({
        ...prev,
        error: 'Service name is required',
        is_saving: false
      }));
      return;
    }

    if (!editServiceModal.service_data.slug.trim() || !/^[a-z0-9-]+$/.test(editServiceModal.service_data.slug)) {
      setEditServiceModal(prev => ({
        ...prev,
        error: 'Slug must contain only lowercase letters, numbers, and hyphens',
        is_saving: false
      }));
      return;
    }

    if (!editServiceModal.service_data.description.trim()) {
      setEditServiceModal(prev => ({
        ...prev,
        error: 'Description is required',
        is_saving: false
      }));
      return;
    }

    if (!editServiceModal.service_data.category_id) {
      setEditServiceModal(prev => ({
        ...prev,
        error: 'Please select a category',
        is_saving: false
      }));
      return;
    }

    if (editServiceModal.service_data.id) {
      updateServiceMutation.mutate(editServiceModal.service_data);
    } else {
      const { id, ...dataWithoutId } = editServiceModal.service_data;
      createServiceMutation.mutate(dataWithoutId);
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this service? This action cannot be undone.');
    if (confirmed) {
      deleteServiceMutation.mutate(serviceId);
    }
  };

  const openAddOptionModal = () => {
    setAddOptionForm({
      is_open: true,
      option_data: {
        key: '',
        label: '',
        field_type: 'text',
        required: false,
        choices: null,
        pricing_impact: null,
        sort_order: serviceOptions.length
      },
      is_saving: false
    });
    setChoicesInput('');
    setEditingOptionId(null);
  };

  const openEditOptionModal = (option: ServiceOption) => {
    setAddOptionForm({
      is_open: true,
      option_data: {
        key: option.key,
        label: option.label,
        field_type: option.field_type,
        required: option.required,
        choices: option.choices,
        pricing_impact: option.pricing_impact,
        sort_order: option.sort_order
      },
      is_saving: false
    });
    setChoicesInput(option.choices ? option.choices.join(', ') : '');
    setEditingOptionId(option.id);
  };

  const handleOptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddOptionForm(prev => ({ ...prev, is_saving: true }));

    // Validation
    if (!addOptionForm.option_data.key.trim() || !/^[a-z_]+$/.test(addOptionForm.option_data.key)) {
      setNotification({ 
        type: 'error', 
        message: 'Key must contain only lowercase letters and underscores' 
      });
      setAddOptionForm(prev => ({ ...prev, is_saving: false }));
      return;
    }

    if (!addOptionForm.option_data.label.trim()) {
      setNotification({ type: 'error', message: 'Label is required' });
      setAddOptionForm(prev => ({ ...prev, is_saving: false }));
      return;
    }

    // Process choices for select field type
    let processedData = { ...addOptionForm.option_data };
    if (processedData.field_type === 'select') {
      if (!choicesInput.trim()) {
        setNotification({ type: 'error', message: 'Choices are required for select fields' });
        setAddOptionForm(prev => ({ ...prev, is_saving: false }));
        return;
      }
      processedData.choices = choicesInput.split(',').map(c => c.trim()).filter(c => c);
    } else {
      processedData.choices = null;
    }

    if (editingOptionId) {
      updateOptionMutation.mutate({ optionId: editingOptionId, data: processedData });
    } else {
      createOptionMutation.mutate(processedData);
    }
  };

  const handleDeleteOption = async (optionId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this option? This action cannot be undone.');
    if (confirmed) {
      deleteOptionMutation.mutate(optionId);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Service Management</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Configure service catalog, categories, and options
                </p>
              </div>
              {activeTab === 'categories' && (
                <button
                  onClick={openAddCategoryModal}
                  className="inline-flex items-center px-6 py-3 bg-yellow-400 text-gray-900 font-semibold rounded-lg hover:bg-yellow-500 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add Category
                </button>
              )}
              {activeTab === 'services' && !selectedServiceId && (
                <button
                  onClick={openAddServiceModal}
                  className="inline-flex items-center px-6 py-3 bg-yellow-400 text-gray-900 font-semibold rounded-lg hover:bg-yellow-500 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add Service
                </button>
              )}
              {selectedServiceId && (
                <button
                  onClick={() => setSelectedServiceId(null)}
                  className="inline-flex items-center px-6 py-3 bg-gray-100 text-gray-900 font-semibold rounded-lg hover:bg-gray-200 transition-all duration-200 border border-gray-300"
                >
                  <X className="h-5 w-5 mr-2" />
                  Close Options Editor
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-8">
              <button
                onClick={() => handleTabChange('categories')}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'categories'
                    ? 'border-yellow-400 text-yellow-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <FolderOpen className="h-5 w-5 mr-2" />
                  Categories
                </div>
              </button>
              <button
                onClick={() => handleTabChange('services')}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'services'
                    ? 'border-yellow-400 text-yellow-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <List className="h-5 w-5 mr-2" />
                  Services
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Notification */}
        {notification && (
          <div className="fixed top-4 right-4 z-50 animate-fade-in">
            <div
              className={`px-6 py-4 rounded-lg shadow-lg flex items-center space-x-3 ${
                notification.type === 'success'
                  ? 'bg-green-600 text-white'
                  : 'bg-red-600 text-white'
              }`}
            >
              {notification.type === 'success' ? (
                <Check className="h-5 w-5 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
              )}
              <p className="font-medium">{notification.message}</p>
              <button
                onClick={() => setNotification(null)}
                className="ml-4 text-white hover:text-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === 'categories' && (
            <div className="space-y-6">
              {isLoadingCategories ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-yellow-400"></div>
                </div>
              ) : serviceCategories.length === 0 ? (
                <div className="text-center py-12">
                  <FolderOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg">No categories yet</p>
                  <p className="text-gray-500 text-sm mt-2">Create your first service category to get started</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Slug
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sort Order
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {serviceCategories
                        .sort((a, b) => a.sort_order - b.sort_order)
                        .map((category) => (
                          <tr key={category.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <GripVertical className="h-5 w-5 text-gray-400 mr-2" />
                                <div className="text-sm font-medium text-gray-900">{category.name}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-600">{category.slug}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-600">{category.sort_order}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {category.is_active ? (
                                <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                  Active
                                </span>
                              ) : (
                                <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                  Inactive
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => openEditCategoryModal(category)}
                                className="text-yellow-600 hover:text-yellow-900 mr-4 inline-flex items-center"
                              >
                                <Edit2 className="h-4 w-4 mr-1" />
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteCategory(category.id)}
                                className="text-red-600 hover:text-red-900 inline-flex items-center"
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'services' && !selectedServiceId && (
            <div className="space-y-6">
              {isLoadingServices ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-yellow-400"></div>
                </div>
              ) : servicesList.length === 0 ? (
                <div className="text-center py-12">
                  <List className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg">No services yet</p>
                  <p className="text-gray-500 text-sm mt-2">Create your first service to get started</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {servicesList.map((service) => (
                    <div
                      key={service.id}
                      className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-200"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900 mb-1">{service.name}</h3>
                          <p className="text-sm text-gray-600">{service.category_name}</p>
                        </div>
                        {service.is_top_seller && (
                          <Star className="h-5 w-5 text-yellow-400 fill-current flex-shrink-0 ml-2" />
                        )}
                      </div>

                      <p className="text-sm text-gray-600 mb-4 line-clamp-3">{service.description}</p>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {service.requires_booking && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            Booking Required
                          </span>
                        )}
                        {service.requires_proof && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800 flex items-center">
                            <FileText className="h-3 w-3 mr-1" />
                            Proof Required
                          </span>
                        )}
                        {service.is_active ? (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                            Inactive
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                        <button
                          onClick={() => setSelectedServiceId(service.id)}
                          className="inline-flex items-center text-sm font-medium text-yellow-600 hover:text-yellow-700"
                        >
                          <Settings className="h-4 w-4 mr-1" />
                          Configure Options
                        </button>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => openEditServiceModal(service)}
                            className="p-2 text-gray-600 hover:text-yellow-600 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteService(service.id)}
                            className="p-2 text-gray-600 hover:text-red-600 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'services' && selectedServiceId && (
            <div className="space-y-6">
              {/* Service Options Header */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Service Options Editor</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Configure form fields for {servicesList.find(s => s.id === selectedServiceId)?.name}
                    </p>
                  </div>
                  <button
                    onClick={openAddOptionModal}
                    className="inline-flex items-center px-4 py-2 bg-yellow-400 text-gray-900 font-semibold rounded-lg hover:bg-yellow-500 transition-all duration-200"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Add Option
                  </button>
                </div>
              </div>

              {/* Service Options List */}
              {isLoadingOptions ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-yellow-400"></div>
                </div>
              ) : serviceOptions.length === 0 ? (
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center">
                  <Settings className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg">No options configured yet</p>
                  <p className="text-gray-500 text-sm mt-2">Add form fields that customers will fill in the quote builder</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {serviceOptions
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((option) => (
                      <div
                        key={option.id}
                        className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-200"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <GripVertical className="h-5 w-5 text-gray-400" />
                              <h3 className="text-lg font-bold text-gray-900">{option.label}</h3>
                              {option.required && (
                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                                  Required
                                </span>
                              )}
                            </div>
                            <div className="ml-8 space-y-2">
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Key:</span> {option.key}
                              </p>
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Type:</span> {option.field_type}
                              </p>
                              {option.choices && (
                                <p className="text-sm text-gray-600">
                                  <span className="font-medium">Choices:</span> {option.choices.join(', ')}
                                </p>
                              )}
                              {option.pricing_impact && (
                                <p className="text-sm text-gray-600">
                                  <span className="font-medium">Pricing Impact:</span> Configured
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <button
                              onClick={() => openEditOptionModal(option)}
                              className="p-2 text-gray-600 hover:text-yellow-600 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteOption(option.id)}
                              className="p-2 text-gray-600 hover:text-red-600 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Category Edit Modal */}
        {editCategoryModal.is_open && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75" onClick={() => setEditCategoryModal(prev => ({ ...prev, is_open: false }))}></div>

              <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <form onSubmit={handleCategorySubmit}>
                  <div className="bg-white px-6 pt-6 pb-4">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-2xl font-bold text-gray-900">
                        {editCategoryModal.category_data.id ? 'Edit Category' : 'Add Category'}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setEditCategoryModal(prev => ({ ...prev, is_open: false }))}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-6 w-6" />
                      </button>
                    </div>

                    {editCategoryModal.error && (
                      <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
                        <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                        <p className="text-sm">{editCategoryModal.error}</p>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-900 mb-2">
                          Category Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={editCategoryModal.category_data.name}
                          onChange={(e) => {
                            setEditCategoryModal(prev => ({
                              ...prev,
                              category_data: { ...prev.category_data, name: e.target.value },
                              error: null
                            }));
                          }}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 transition-all"
                          placeholder="e.g., Vehicle Graphics"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-900 mb-2">
                          Slug *
                        </label>
                        <input
                          type="text"
                          required
                          value={editCategoryModal.category_data.slug}
                          onChange={(e) => {
                            setEditCategoryModal(prev => ({
                              ...prev,
                              category_data: { ...prev.category_data, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') },
                              error: null
                            }));
                          }}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 transition-all"
                          placeholder="e.g., vehicle-graphics"
                        />
                        <p className="mt-1 text-xs text-gray-500">Lowercase letters, numbers, and hyphens only</p>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-900 mb-2">
                          Sort Order
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={editCategoryModal.category_data.sort_order}
                          onChange={(e) => {
                            setEditCategoryModal(prev => ({
                              ...prev,
                              category_data: { ...prev.category_data, sort_order: parseInt(e.target.value) || 0 },
                              error: null
                            }));
                          }}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 transition-all"
                        />
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="category-active"
                          checked={editCategoryModal.category_data.is_active}
                          onChange={(e) => {
                            setEditCategoryModal(prev => ({
                              ...prev,
                              category_data: { ...prev.category_data, is_active: e.target.checked },
                              error: null
                            }));
                          }}
                          className="h-5 w-5 text-yellow-400 border-gray-300 rounded focus:ring-yellow-400"
                        />
                        <label htmlFor="category-active" className="ml-3 text-sm font-medium text-gray-900">
                          Active
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 px-6 py-4 flex items-center justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setEditCategoryModal(prev => ({ ...prev, is_open: false }))}
                      className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-900 font-semibold rounded-lg hover:bg-gray-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={editCategoryModal.is_saving}
                      className="px-6 py-3 bg-yellow-400 text-gray-900 font-semibold rounded-lg hover:bg-yellow-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {editCategoryModal.is_saving ? 'Saving...' : 'Save Category'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Service Edit Modal */}
        {editServiceModal.is_open && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75" onClick={() => setEditServiceModal(prev => ({ ...prev, is_open: false }))}></div>

              <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
                <form onSubmit={handleServiceSubmit}>
                  <div className="bg-white px-6 pt-6 pb-4 max-h-[80vh] overflow-y-auto">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-2xl font-bold text-gray-900">
                        {editServiceModal.service_data.id ? 'Edit Service' : 'Add Service'}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setEditServiceModal(prev => ({ ...prev, is_open: false }))}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-6 w-6" />
                      </button>
                    </div>

                    {editServiceModal.error && (
                      <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
                        <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                        <p className="text-sm">{editServiceModal.error}</p>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-gray-900 mb-2">
                            Service Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={editServiceModal.service_data.name}
                            onChange={(e) => {
                              setEditServiceModal(prev => ({
                                ...prev,
                                service_data: { ...prev.service_data, name: e.target.value },
                                error: null
                              }));
                            }}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 transition-all"
                            placeholder="e.g., Premium Business Cards"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-gray-900 mb-2">
                            Category *
                          </label>
                          <select
                            required
                            value={editServiceModal.service_data.category_id}
                            onChange={(e) => {
                              setEditServiceModal(prev => ({
                                ...prev,
                                service_data: { ...prev.service_data, category_id: e.target.value },
                                error: null
                              }));
                            }}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 transition-all"
                          >
                            <option value="">Select category</option>
                            {serviceCategories
                              .filter(cat => cat.is_active)
                              .map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                              ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-900 mb-2">
                          Slug *
                        </label>
                        <input
                          type="text"
                          required
                          value={editServiceModal.service_data.slug}
                          onChange={(e) => {
                            setEditServiceModal(prev => ({
                              ...prev,
                              service_data: { ...prev.service_data, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') },
                              error: null
                            }));
                          }}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 transition-all"
                          placeholder="e.g., premium-business-cards"
                        />
                        <p className="mt-1 text-xs text-gray-500">Lowercase letters, numbers, and hyphens only</p>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-900 mb-2">
                          Description *
                        </label>
                        <textarea
                          required
                          rows={4}
                          value={editServiceModal.service_data.description}
                          onChange={(e) => {
                            setEditServiceModal(prev => ({
                              ...prev,
                              service_data: { ...prev.service_data, description: e.target.value },
                              error: null
                            }));
                          }}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 transition-all resize-none"
                          placeholder="Detailed service description..."
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="service-booking"
                            checked={editServiceModal.service_data.requires_booking}
                            onChange={(e) => {
                              setEditServiceModal(prev => ({
                                ...prev,
                                service_data: { ...prev.service_data, requires_booking: e.target.checked },
                                error: null
                              }));
                            }}
                            className="h-5 w-5 text-yellow-400 border-gray-300 rounded focus:ring-yellow-400"
                          />
                          <label htmlFor="service-booking" className="ml-3 text-sm font-medium text-gray-900">
                            Requires Booking
                          </label>
                        </div>

                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="service-proof"
                            checked={editServiceModal.service_data.requires_proof}
                            onChange={(e) => {
                              setEditServiceModal(prev => ({
                                ...prev,
                                service_data: { ...prev.service_data, requires_proof: e.target.checked },
                                error: null
                              }));
                            }}
                            className="h-5 w-5 text-yellow-400 border-gray-300 rounded focus:ring-yellow-400"
                          />
                          <label htmlFor="service-proof" className="ml-3 text-sm font-medium text-gray-900">
                            Requires Proof
                          </label>
                        </div>

                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="service-top-seller"
                            checked={editServiceModal.service_data.is_top_seller}
                            onChange={(e) => {
                              setEditServiceModal(prev => ({
                                ...prev,
                                service_data: { ...prev.service_data, is_top_seller: e.target.checked },
                                error: null
                              }));
                            }}
                            className="h-5 w-5 text-yellow-400 border-gray-300 rounded focus:ring-yellow-400"
                          />
                          <label htmlFor="service-top-seller" className="ml-3 text-sm font-medium text-gray-900">
                            Top Seller
                          </label>
                        </div>

                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="service-active"
                            checked={editServiceModal.service_data.is_active}
                            onChange={(e) => {
                              setEditServiceModal(prev => ({
                                ...prev,
                                service_data: { ...prev.service_data, is_active: e.target.checked },
                                error: null
                              }));
                            }}
                            className="h-5 w-5 text-yellow-400 border-gray-300 rounded focus:ring-yellow-400"
                          />
                          <label htmlFor="service-active" className="ml-3 text-sm font-medium text-gray-900">
                            Active
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 px-6 py-4 flex items-center justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setEditServiceModal(prev => ({ ...prev, is_open: false }))}
                      className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-900 font-semibold rounded-lg hover:bg-gray-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={editServiceModal.is_saving}
                      className="px-6 py-3 bg-yellow-400 text-gray-900 font-semibold rounded-lg hover:bg-yellow-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {editServiceModal.is_saving ? 'Saving...' : 'Save Service'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Service Option Modal */}
        {addOptionForm.is_open && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75" onClick={() => {
                setAddOptionForm(prev => ({ ...prev, is_open: false }));
                setEditingOptionId(null);
              }}></div>

              <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                <form onSubmit={handleOptionSubmit}>
                  <div className="bg-white px-6 pt-6 pb-4">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-2xl font-bold text-gray-900">
                        {editingOptionId ? 'Edit Service Option' : 'Add Service Option'}
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          setAddOptionForm(prev => ({ ...prev, is_open: false }));
                          setEditingOptionId(null);
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-6 w-6" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-gray-900 mb-2">
                            Field Key *
                          </label>
                          <input
                            type="text"
                            required
                            value={addOptionForm.option_data.key}
                            onChange={(e) => {
                              setAddOptionForm(prev => ({
                                ...prev,
                                option_data: { ...prev.option_data, key: e.target.value.toLowerCase().replace(/[^a-z_]/g, '_') }
                              }));
                            }}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 transition-all"
                            placeholder="e.g., quantity"
                          />
                          <p className="mt-1 text-xs text-gray-500">Lowercase letters and underscores only</p>
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-gray-900 mb-2">
                            Field Label *
                          </label>
                          <input
                            type="text"
                            required
                            value={addOptionForm.option_data.label}
                            onChange={(e) => {
                              setAddOptionForm(prev => ({
                                ...prev,
                                option_data: { ...prev.option_data, label: e.target.value }
                              }));
                            }}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 transition-all"
                            placeholder="e.g., Quantity"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-gray-900 mb-2">
                            Field Type *
                          </label>
                          <select
                            required
                            value={addOptionForm.option_data.field_type}
                            onChange={(e) => {
                              setAddOptionForm(prev => ({
                                ...prev,
                                option_data: { 
                                  ...prev.option_data, 
                                  field_type: e.target.value as any,
                                  choices: e.target.value === 'select' ? prev.option_data.choices : null
                                }
                              }));
                            }}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 transition-all"
                          >
                            <option value="text">Text</option>
                            <option value="select">Select Dropdown</option>
                            <option value="number">Number</option>
                            <option value="textarea">Textarea</option>
                            <option value="checkbox">Checkbox</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-gray-900 mb-2">
                            Sort Order
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={addOptionForm.option_data.sort_order}
                            onChange={(e) => {
                              setAddOptionForm(prev => ({
                                ...prev,
                                option_data: { ...prev.option_data, sort_order: parseInt(e.target.value) || 0 }
                              }));
                            }}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 transition-all"
                          />
                        </div>
                      </div>

                      {addOptionForm.option_data.field_type === 'select' && (
                        <div>
                          <label className="block text-sm font-bold text-gray-900 mb-2">
                            Choices (comma-separated) *
                          </label>
                          <input
                            type="text"
                            required
                            value={choicesInput}
                            onChange={(e) => setChoicesInput(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 transition-all"
                            placeholder="e.g., Small, Medium, Large"
                          />
                          <p className="mt-1 text-xs text-gray-500">Separate options with commas</p>
                        </div>
                      )}

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="option-required"
                          checked={addOptionForm.option_data.required}
                          onChange={(e) => {
                            setAddOptionForm(prev => ({
                              ...prev,
                              option_data: { ...prev.option_data, required: e.target.checked }
                            }));
                          }}
                          className="h-5 w-5 text-yellow-400 border-gray-300 rounded focus:ring-yellow-400"
                        />
                        <label htmlFor="option-required" className="ml-3 text-sm font-medium text-gray-900">
                          Required Field
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 px-6 py-4 flex items-center justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setAddOptionForm(prev => ({ ...prev, is_open: false }));
                        setEditingOptionId(null);
                      }}
                      className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-900 font-semibold rounded-lg hover:bg-gray-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={addOptionForm.is_saving}
                      className="px-6 py-3 bg-yellow-400 text-gray-900 font-semibold rounded-lg hover:bg-yellow-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {addOptionForm.is_saving ? 'Saving...' : 'Save Option'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default UV_ServicesManagement;