import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  PlusCircle, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  CheckCircle, 
  AlertCircle,
  Loader,
  Package,
  Star,
  Clock,
  FileText
} from 'lucide-react';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

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

interface TierFeature {
  id: string;
  tier_id: string;
  group_name: string;
  feature_key: string;
  feature_label: string;
  feature_value: string;
  is_included: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface TierDeliverable {
  id: string;
  tier_id: string;
  deliverable_group: string;
  deliverable_label: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface TierPackageFormData {
  id: string | null;
  name: string;
  slug: string;
  description: string | null;
  revision_limit: number;
  turnaround_days: number;
  is_active: boolean;
}

interface FeatureFormData {
  tier_id: string;
  group_name: string;
  feature_key: string;
  feature_label: string;
  feature_value: string;
  is_included: boolean;
  sort_order: number;
}

interface DeliverableFormData {
  tier_id: string;
  deliverable_group: string;
  deliverable_label: string;
  sort_order: number;
}

interface NotificationState {
  type: 'success' | 'error' | null;
  message: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_TiersManagement: React.FC = () => {
  // ========================================================================
  // ZUSTAND STATE (Individual Selectors - NO object destructuring)
  // ========================================================================
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);

  // ========================================================================
  // URL PARAMS
  // ========================================================================
  const [searchParams, setSearchParams] = useSearchParams();
  const editTierParam = searchParams.get('edit_tier');

  // ========================================================================
  // REACT QUERY CLIENT
  // ========================================================================
  const queryClient = useQueryClient();

  // ========================================================================
  // LOCAL STATE
  // ========================================================================
  const [activeTab, setActiveTab] = useState<'packages' | 'features' | 'deliverables' | 'comparison'>('packages');
  const [notification, setNotification] = useState<NotificationState>({ type: null, message: '' });
  
  // Tier Package Modal State
  const [tierModalOpen, setTierModalOpen] = useState(false);
  const [tierFormData, setTierFormData] = useState<TierPackageFormData>({
    id: null,
    name: '',
    slug: '',
    description: null,
    revision_limit: 0,
    turnaround_days: 1,
    is_active: true
  });
  const [tierFormErrors, setTierFormErrors] = useState<Record<string, string>>({});

  // Feature Modal State
  const [featureModalOpen, setFeatureModalOpen] = useState(false);
  const [featureFormData, setFeatureFormData] = useState<FeatureFormData>({
    tier_id: '',
    group_name: '',
    feature_key: '',
    feature_label: '',
    feature_value: '',
    is_included: true,
    sort_order: 0
  });
  const [editingFeatureId, setEditingFeatureId] = useState<string | null>(null);

  // Deliverable Modal State
  const [deliverableModalOpen, setDeliverableModalOpen] = useState(false);
  const [deliverableFormData, setDeliverableFormData] = useState<DeliverableFormData>({
    tier_id: '',
    deliverable_group: '',
    deliverable_label: '',
    sort_order: 0
  });
  const [editingDeliverableId, setEditingDeliverableId] = useState<string | null>(null);

  // Feature Groups
  const featureGroups = [
    'turnaround',
    'rush_availability',
    'minimum_order',
    'design_service',
    'materials',
    'support_level',
    'installation',
    'revisions'
  ];

  // ========================================================================
  // API BASE URL
  // ========================================================================
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

  // ========================================================================
  // NOTIFICATION HELPER
  // ========================================================================
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification({ type: null, message: '' });
    }, 3000);
  };

  // ========================================================================
  // FETCH TIER PACKAGES
  // ========================================================================
  const { 
    data: tierPackages = [], 
    isLoading: isLoadingTiers,
    error: tiersError,
    refetch: refetchTiers
  } = useQuery<TierPackage[]>({
    queryKey: ['tier-packages'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/tier-packages`, {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });
      // CRITICAL: Convert numeric fields from strings
      return response.data.tiers.map((tier: any) => ({
        ...tier,
        revision_limit: Number(tier.revision_limit || 0),
        turnaround_days: Number(tier.turnaround_days || 0)
      }));
    },
    staleTime: 60000,
    enabled: !!authToken
  });

  // ========================================================================
  // FETCH TIER FEATURES FOR ALL TIERS
  // ========================================================================
  const { 
    data: tierFeaturesByTier = {}, 
    isLoading: isLoadingFeatures,
    refetch: refetchFeatures
  } = useQuery<Record<string, TierFeature[]>>({
    queryKey: ['tier-features-all', tierPackages],
    queryFn: async () => {
      if (!tierPackages || tierPackages.length === 0) return {};
      
      const featuresPromises = tierPackages.map(async (tier) => {
        const response = await axios.get(
          `${API_BASE_URL}/api/tier-packages/${tier.id}/features`,
          {
            headers: {
              Authorization: `Bearer ${authToken}`
            }
          }
        );
        return { tierId: tier.id, features: response.data.features };
      });
      
      const results = await Promise.all(featuresPromises);
      
      const featuresByTier: Record<string, TierFeature[]> = {};
      results.forEach(result => {
        featuresByTier[result.tierId] = result.features.map((f: any) => ({
          ...f,
          sort_order: Number(f.sort_order || 0)
        }));
      });
      
      return featuresByTier;
    },
    enabled: !!authToken && tierPackages.length > 0,
    staleTime: 60000
  });

  // ========================================================================
  // FETCH TIER DELIVERABLES FOR ALL TIERS
  // ========================================================================
  const { 
    data: tierDeliverablesByTier = {}, 
    isLoading: isLoadingDeliverables,
    refetch: refetchDeliverables
  } = useQuery<Record<string, TierDeliverable[]>>({
    queryKey: ['tier-deliverables-all', tierPackages],
    queryFn: async () => {
      if (!tierPackages || tierPackages.length === 0) return {};
      
      const deliverablesPromises = tierPackages.map(async (tier) => {
        const response = await axios.get(
          `${API_BASE_URL}/api/tier-packages/${tier.id}/deliverables`,
          {
            headers: {
              Authorization: `Bearer ${authToken}`
            }
          }
        );
        return { tierId: tier.id, deliverables: response.data.deliverables };
      });
      
      const results = await Promise.all(deliverablesPromises);
      
      const deliverablesByTier: Record<string, TierDeliverable[]> = {};
      results.forEach(result => {
        deliverablesByTier[result.tierId] = result.deliverables.map((d: any) => ({
          ...d,
          sort_order: Number(d.sort_order || 0)
        }));
      });
      
      return deliverablesByTier;
    },
    enabled: !!authToken && tierPackages.length > 0,
    staleTime: 60000
  });

  // ========================================================================
  // CREATE TIER MUTATION
  // ========================================================================
  const createTierMutation = useMutation({
    mutationFn: async (data: Omit<TierPackageFormData, 'id'>) => {
      const response = await axios.post(
        `${API_BASE_URL}/api/tier-packages`,
        data,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`
          }
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tier-packages'] });
      setTierModalOpen(false);
      resetTierForm();
      showNotification('success', 'Tier package created successfully');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to create tier package';
      showNotification('error', message);
    }
  });

  // ========================================================================
  // UPDATE TIER MUTATION
  // ========================================================================
  const updateTierMutation = useMutation({
    mutationFn: async (data: TierPackageFormData) => {
      const { id, ...updateData } = data;
      const response = await axios.put(
        `${API_BASE_URL}/api/tier-packages/${id}`,
        updateData,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`
          }
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tier-packages'] });
      setTierModalOpen(false);
      resetTierForm();
      showNotification('success', 'Tier package updated successfully');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to update tier package';
      showNotification('error', message);
    }
  });

  // ========================================================================
  // CREATE FEATURE MUTATION
  // ========================================================================
  const createFeatureMutation = useMutation({
    mutationFn: async (data: FeatureFormData) => {
      const response = await axios.post(
        `${API_BASE_URL}/api/tier-packages/${data.tier_id}/features`,
        {
          group_name: data.group_name,
          feature_key: data.feature_key,
          feature_label: data.feature_label,
          feature_value: data.feature_value,
          is_included: data.is_included,
          sort_order: data.sort_order
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`
          }
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tier-features-all'] });
      setFeatureModalOpen(false);
      resetFeatureForm();
      showNotification('success', 'Feature created successfully');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to create feature';
      showNotification('error', message);
    }
  });

  // ========================================================================
  // UPDATE FEATURE MUTATION
  // ========================================================================
  const updateFeatureMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FeatureFormData> }) => {
      const response = await axios.put(
        `${API_BASE_URL}/api/tier-features/${id}`,
        data,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`
          }
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tier-features-all'] });
      setFeatureModalOpen(false);
      resetFeatureForm();
      showNotification('success', 'Feature updated successfully');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to update feature';
      showNotification('error', message);
    }
  });

  // ========================================================================
  // DELETE FEATURE MUTATION
  // ========================================================================
  const deleteFeatureMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(
        `${API_BASE_URL}/api/tier-features/${id}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tier-features-all'] });
      showNotification('success', 'Feature deleted successfully');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to delete feature';
      showNotification('error', message);
    }
  });

  // ========================================================================
  // CREATE DELIVERABLE MUTATION
  // ========================================================================
  const createDeliverableMutation = useMutation({
    mutationFn: async (data: DeliverableFormData) => {
      const response = await axios.post(
        `${API_BASE_URL}/api/tier-packages/${data.tier_id}/deliverables`,
        {
          deliverable_group: data.deliverable_group,
          deliverable_label: data.deliverable_label,
          sort_order: data.sort_order
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`
          }
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tier-deliverables-all'] });
      setDeliverableModalOpen(false);
      resetDeliverableForm();
      showNotification('success', 'Deliverable created successfully');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to create deliverable';
      showNotification('error', message);
    }
  });

  // ========================================================================
  // UPDATE DELIVERABLE MUTATION
  // ========================================================================
  const updateDeliverableMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<DeliverableFormData> }) => {
      const response = await axios.put(
        `${API_BASE_URL}/api/tier-deliverables/${id}`,
        data,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`
          }
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tier-deliverables-all'] });
      setDeliverableModalOpen(false);
      resetDeliverableForm();
      showNotification('success', 'Deliverable updated successfully');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to update deliverable';
      showNotification('error', message);
    }
  });

  // ========================================================================
  // DELETE DELIVERABLE MUTATION
  // ========================================================================
  const deleteDeliverableMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(
        `${API_BASE_URL}/api/tier-deliverables/${id}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tier-deliverables-all'] });
      showNotification('success', 'Deliverable deleted successfully');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to delete deliverable';
      showNotification('error', message);
    }
  });

  // ========================================================================
  // FORM HANDLERS
  // ========================================================================

  const resetTierForm = () => {
    setTierFormData({
      id: null,
      name: '',
      slug: '',
      description: null,
      revision_limit: 0,
      turnaround_days: 1,
      is_active: true
    });
    setTierFormErrors({});
  };

  const resetFeatureForm = () => {
    setFeatureFormData({
      tier_id: '',
      group_name: '',
      feature_key: '',
      feature_label: '',
      feature_value: '',
      is_included: true,
      sort_order: 0
    });
    setEditingFeatureId(null);
  };

  const resetDeliverableForm = () => {
    setDeliverableFormData({
      tier_id: '',
      deliverable_group: '',
      deliverable_label: '',
      sort_order: 0
    });
    setEditingDeliverableId(null);
  };

  const handleOpenTierModal = (tier?: TierPackage) => {
    if (tier) {
      setTierFormData({
        id: tier.id,
        name: tier.name,
        slug: tier.slug,
        description: tier.description,
        revision_limit: tier.revision_limit,
        turnaround_days: tier.turnaround_days,
        is_active: tier.is_active
      });
    } else {
      resetTierForm();
    }
    setTierModalOpen(true);
  };

  const handleTierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTierFormErrors({});

    // Basic validation
    const errors: Record<string, string> = {};
    if (!tierFormData.name.trim()) errors.name = 'Name is required';
    if (!tierFormData.slug.trim()) errors.slug = 'Slug is required';
    if (tierFormData.revision_limit < 0) errors.revision_limit = 'Must be 0 or greater';
    if (tierFormData.turnaround_days < 1) errors.turnaround_days = 'Must be at least 1 day';

    if (Object.keys(errors).length > 0) {
      setTierFormErrors(errors);
      return;
    }

    if (tierFormData.id) {
      updateTierMutation.mutate(tierFormData);
    } else {
      const { id, ...createData } = tierFormData;
      createTierMutation.mutate(createData);
    }
  };

  const handleOpenFeatureModal = (tierId: string, feature?: TierFeature) => {
    if (feature) {
      setFeatureFormData({
        tier_id: feature.tier_id,
        group_name: feature.group_name,
        feature_key: feature.feature_key,
        feature_label: feature.feature_label,
        feature_value: feature.feature_value,
        is_included: feature.is_included,
        sort_order: feature.sort_order
      });
      setEditingFeatureId(feature.id);
    } else {
      resetFeatureForm();
      setFeatureFormData(prev => ({ ...prev, tier_id: tierId }));
    }
    setFeatureModalOpen(true);
  };

  const handleFeatureSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingFeatureId) {
      updateFeatureMutation.mutate({
        id: editingFeatureId,
        data: featureFormData
      });
    } else {
      createFeatureMutation.mutate(featureFormData);
    }
  };

  const handleOpenDeliverableModal = (tierId: string, deliverable?: TierDeliverable) => {
    if (deliverable) {
      setDeliverableFormData({
        tier_id: deliverable.tier_id,
        deliverable_group: deliverable.deliverable_group,
        deliverable_label: deliverable.deliverable_label,
        sort_order: deliverable.sort_order
      });
      setEditingDeliverableId(deliverable.id);
    } else {
      resetDeliverableForm();
      setDeliverableFormData(prev => ({ ...prev, tier_id: tierId }));
    }
    setDeliverableModalOpen(true);
  };

  const handleDeliverableSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingDeliverableId) {
      updateDeliverableMutation.mutate({
        id: editingDeliverableId,
        data: deliverableFormData
      });
    } else {
      createDeliverableMutation.mutate(deliverableFormData);
    }
  };

  // ========================================================================
  // HANDLE URL PARAM FOR EDITING
  // ========================================================================
  useEffect(() => {
    if (editTierParam && tierPackages.length > 0) {
      const tier = tierPackages.find(t => t.slug === editTierParam);
      if (tier) {
        handleOpenTierModal(tier);
        // Clear URL param after opening modal
        searchParams.delete('edit_tier');
        setSearchParams(searchParams);
      }
    }
  }, [editTierParam, tierPackages]);

  // ========================================================================
  // RENDER HELPERS
  // ========================================================================

  const renderLoadingState = () => (
    <div className="flex items-center justify-center py-12">
      <div className="flex flex-col items-center gap-3">
        <Loader className="w-8 h-8 animate-spin text-yellow-400" />
        <p className="text-sm text-gray-600">Loading tier management...</p>
      </div>
    </div>
  );

  const renderErrorState = (error: any, retry: () => void) => (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-red-900 mb-1">Error Loading Data</h3>
          <p className="text-sm text-red-700">
            {error?.response?.data?.message || error?.message || 'An unexpected error occurred'}
          </p>
        </div>
        <button
          onClick={retry}
          className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  );

  // ========================================================================
  // MAIN RENDER
  // ========================================================================

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className="w-8 h-8 text-black" />
                <div>
                  <h1 className="text-3xl font-bold text-black">Tier Management</h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Configure service tiers, features, and deliverables
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleOpenTierModal()}
                className="flex items-center gap-2 px-6 py-3 bg-yellow-400 text-black font-semibold rounded-lg hover:bg-yellow-500 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <PlusCircle className="w-5 h-5" />
                Create New Tier
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('packages')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'packages'
                    ? 'border-yellow-400 text-black'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Tier Packages
              </button>
              <button
                onClick={() => setActiveTab('features')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'features'
                    ? 'border-yellow-400 text-black'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Features
              </button>
              <button
                onClick={() => setActiveTab('deliverables')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'deliverables'
                    ? 'border-yellow-400 text-black'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Deliverables
              </button>
              <button
                onClick={() => setActiveTab('comparison')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'comparison'
                    ? 'border-yellow-400 text-black'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Comparison Table
              </button>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Tier Packages Tab */}
          {activeTab === 'packages' && (
            <div className="space-y-6">
              {isLoadingTiers ? (
                renderLoadingState()
              ) : tiersError ? (
                renderErrorState(tiersError, refetchTiers)
              ) : tierPackages.length === 0 ? (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-12 text-center">
                  <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Tier Packages Yet</h3>
                  <p className="text-gray-600 mb-6">
                    Create your first service tier package to get started
                  </p>
                  <button
                    onClick={() => handleOpenTierModal()}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-400 text-black font-semibold rounded-lg hover:bg-yellow-500 transition-colors"
                  >
                    <PlusCircle className="w-5 h-5" />
                    Create First Tier
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {tierPackages.map((tier) => (
                    <div
                      key={tier.id}
                      className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow duration-200"
                    >
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-black mb-1">{tier.name}</h3>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {tier.slug}
                            </span>
                          </div>
                          {tier.is_active ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-md bg-green-50 text-green-700 text-xs font-medium">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-gray-600 text-xs font-medium">
                              Inactive
                            </span>
                          )}
                        </div>
                        
                        {tier.description && (
                          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                            {tier.description}
                          </p>
                        )}

                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-700">
                              {Number(tier.turnaround_days || 0)} day{Number(tier.turnaround_days) !== 1 ? 's' : ''} turnaround
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Star className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-700">
                              {Number(tier.revision_limit || 0)} revision{Number(tier.revision_limit) !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOpenTierModal(tier)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-black text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                            Edit
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Features Tab */}
          {activeTab === 'features' && (
            <div className="space-y-6">
              {isLoadingTiers || isLoadingFeatures ? (
                renderLoadingState()
              ) : tierPackages.length === 0 ? (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-12 text-center">
                  <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Tiers Available</h3>
                  <p className="text-gray-600 mb-6">
                    Create tier packages first before adding features
                  </p>
                </div>
              ) : (
                tierPackages.map((tier) => (
                  <div key={tier.id} className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-black">{tier.name} Features</h3>
                        <button
                          onClick={() => handleOpenFeatureModal(tier.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-yellow-400 text-black text-sm font-semibold rounded-md hover:bg-yellow-500 transition-colors"
                        >
                          <PlusCircle className="w-4 h-4" />
                          Add Feature
                        </button>
                      </div>
                    </div>

                    <div className="p-6">
                      {!tierFeaturesByTier[tier.id] || tierFeaturesByTier[tier.id].length === 0 ? (
                        <div className="text-center py-8">
                          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-sm text-gray-600">No features defined for this tier</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {featureGroups.map((group) => {
                            const groupFeatures = tierFeaturesByTier[tier.id].filter(
                              (f) => f.group_name === group
                            );
                            
                            if (groupFeatures.length === 0) return null;

                            return (
                              <div key={group}>
                                <h4 className="text-sm font-semibold text-gray-900 mb-2 capitalize">
                                  {group.replace(/_/g, ' ')}
                                </h4>
                                <div className="space-y-2">
                                  {groupFeatures
                                    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
                                    .map((feature) => (
                                      <div
                                        key={feature.id}
                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                                      >
                                        <div className="flex items-center gap-3 flex-1">
                                          <input
                                            type="checkbox"
                                            checked={feature.is_included}
                                            readOnly
                                            className="w-4 h-4"
                                          />
                                          <div>
                                            <p className="text-sm font-medium text-gray-900">
                                              {feature.feature_label}
                                            </p>
                                            <p className="text-xs text-gray-600">
                                              {feature.feature_value}
                                            </p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={() => handleOpenFeatureModal(tier.id, feature)}
                                            className="p-2 text-gray-600 hover:text-black transition-colors"
                                            title="Edit feature"
                                          >
                                            <Edit2 className="w-4 h-4" />
                                          </button>
                                          <button
                                            onClick={() => {
                                              if (window.confirm('Delete this feature?')) {
                                                deleteFeatureMutation.mutate(feature.id);
                                              }
                                            }}
                                            className="p-2 text-red-600 hover:text-red-700 transition-colors"
                                            title="Delete feature"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Deliverables Tab */}
          {activeTab === 'deliverables' && (
            <div className="space-y-6">
              {isLoadingTiers || isLoadingDeliverables ? (
                renderLoadingState()
              ) : tierPackages.length === 0 ? (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-12 text-center">
                  <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Tiers Available</h3>
                  <p className="text-gray-600 mb-6">
                    Create tier packages first before adding deliverables
                  </p>
                </div>
              ) : (
                tierPackages.map((tier) => (
                  <div key={tier.id} className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-black">{tier.name} Deliverables</h3>
                        <button
                          onClick={() => handleOpenDeliverableModal(tier.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-yellow-400 text-black text-sm font-semibold rounded-md hover:bg-yellow-500 transition-colors"
                        >
                          <PlusCircle className="w-4 h-4" />
                          Add Deliverable
                        </button>
                      </div>
                    </div>

                    <div className="p-6">
                      {!tierDeliverablesByTier[tier.id] || tierDeliverablesByTier[tier.id].length === 0 ? (
                        <div className="text-center py-8">
                          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-sm text-gray-600">No deliverables defined for this tier</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {tierDeliverablesByTier[tier.id]
                            .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
                            .map((deliverable) => (
                              <div
                                key={deliverable.id}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                              >
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900">
                                    {deliverable.deliverable_label}
                                  </p>
                                  <p className="text-xs text-gray-600 mt-0.5">
                                    Group: {deliverable.deliverable_group}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleOpenDeliverableModal(tier.id, deliverable)}
                                    className="p-2 text-gray-600 hover:text-black transition-colors"
                                    title="Edit deliverable"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (window.confirm('Delete this deliverable?')) {
                                        deleteDeliverableMutation.mutate(deliverable.id);
                                      }
                                    }}
                                    className="p-2 text-red-600 hover:text-red-700 transition-colors"
                                    title="Delete deliverable"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Comparison Table Tab */}
          {activeTab === 'comparison' && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-bold text-black">Service Package Comparison</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Customer-facing tier comparison preview
                </p>
              </div>

              <div className="p-6 overflow-x-auto">
                {isLoadingTiers || isLoadingFeatures ? (
                  renderLoadingState()
                ) : tierPackages.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No tiers to compare yet</p>
                  </div>
                ) : (
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-left py-4 px-4 font-semibold text-gray-900">Feature</th>
                        {tierPackages.map((tier) => (
                          <th key={tier.id} className="text-center py-4 px-4 font-bold text-gray-900">
                            {tier.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <td className="py-3 px-4 text-sm font-medium text-gray-900">Turnaround Time</td>
                        {tierPackages.map((tier) => (
                          <td key={tier.id} className="text-center py-3 px-4 text-sm text-gray-700">
                            {Number(tier.turnaround_days || 0)} day{Number(tier.turnaround_days) !== 1 ? 's' : ''}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="py-3 px-4 text-sm font-medium text-gray-900">Revisions</td>
                        {tierPackages.map((tier) => (
                          <td key={tier.id} className="text-center py-3 px-4 text-sm text-gray-700">
                            {Number(tier.revision_limit || 0) === 0 ? 'Unlimited' : Number(tier.revision_limit || 0)}
                          </td>
                        ))}
                      </tr>
                      {featureGroups.map((group) => {
                        const hasGroupFeatures = tierPackages.some(
                          (tier) => tierFeaturesByTier[tier.id]?.some((f) => f.group_name === group)
                        );
                        
                        if (!hasGroupFeatures) return null;

                        return (
                          <tr key={group} className="border-b border-gray-200">
                            <td className="py-3 px-4 text-sm font-medium text-gray-900 capitalize">
                              {group.replace(/_/g, ' ')}
                            </td>
                            {tierPackages.map((tier) => {
                              const feature = tierFeaturesByTier[tier.id]?.find((f) => f.group_name === group);
                              return (
                                <td key={tier.id} className="text-center py-3 px-4 text-sm">
                                  {feature ? (
                                    feature.is_included ? (
                                      <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                                    ) : (
                                      <X className="w-5 h-5 text-red-400 mx-auto" />
                                    )
                                  ) : (
                                    <span className="text-gray-400">—</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Tier Package Modal */}
        {tierModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200 sticky top-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-black">
                    {tierFormData.id ? 'Edit Tier Package' : 'Create Tier Package'}
                  </h3>
                  <button
                    onClick={() => {
                      setTierModalOpen(false);
                      resetTierForm();
                    }}
                    className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleTierSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Tier Name *
                  </label>
                  <input
                    type="text"
                    value={tierFormData.name}
                    onChange={(e) => {
                      setTierFormData({ ...tierFormData, name: e.target.value });
                      setTierFormErrors({ ...tierFormErrors, name: '' });
                    }}
                    className={`w-full px-4 py-3 rounded-lg border-2 ${
                      tierFormErrors.name ? 'border-red-500' : 'border-gray-200'
                    } focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 transition-all`}
                    placeholder="e.g., Basic, Standard, Gold"
                  />
                  {tierFormErrors.name && (
                    <p className="text-sm text-red-600 mt-1">{tierFormErrors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Slug *
                  </label>
                  <input
                    type="text"
                    value={tierFormData.slug}
                    onChange={(e) => {
                      setTierFormData({ ...tierFormData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') });
                      setTierFormErrors({ ...tierFormErrors, slug: '' });
                    }}
                    className={`w-full px-4 py-3 rounded-lg border-2 ${
                      tierFormErrors.slug ? 'border-red-500' : 'border-gray-200'
                    } focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 transition-all`}
                    placeholder="e.g., basic, standard, gold"
                  />
                  {tierFormErrors.slug && (
                    <p className="text-sm text-red-600 mt-1">{tierFormErrors.slug}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Description
                  </label>
                  <textarea
                    value={tierFormData.description || ''}
                    onChange={(e) => {
                      setTierFormData({ ...tierFormData, description: e.target.value || null });
                    }}
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 transition-all"
                    placeholder="Brief description of this tier"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Revision Limit *
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={tierFormData.revision_limit}
                      onChange={(e) => {
                        setTierFormData({ ...tierFormData, revision_limit: parseInt(e.target.value) || 0 });
                        setTierFormErrors({ ...tierFormErrors, revision_limit: '' });
                      }}
                      className={`w-full px-4 py-3 rounded-lg border-2 ${
                        tierFormErrors.revision_limit ? 'border-red-500' : 'border-gray-200'
                      } focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 transition-all`}
                    />
                    {tierFormErrors.revision_limit && (
                      <p className="text-sm text-red-600 mt-1">{tierFormErrors.revision_limit}</p>
                    )}
                    <p className="text-xs text-gray-600 mt-1">Use 0 for unlimited</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Turnaround Days *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={tierFormData.turnaround_days}
                      onChange={(e) => {
                        setTierFormData({ ...tierFormData, turnaround_days: parseInt(e.target.value) || 1 });
                        setTierFormErrors({ ...tierFormErrors, turnaround_days: '' });
                      }}
                      className={`w-full px-4 py-3 rounded-lg border-2 ${
                        tierFormErrors.turnaround_days ? 'border-red-500' : 'border-gray-200'
                      } focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 transition-all`}
                    />
                    {tierFormErrors.turnaround_days && (
                      <p className="text-sm text-red-600 mt-1">{tierFormErrors.turnaround_days}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={tierFormData.is_active}
                    onChange={(e) => setTierFormData({ ...tierFormData, is_active: e.target.checked })}
                    className="w-4 h-4 text-yellow-400 rounded focus:ring-yellow-400"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium text-gray-900">
                    Active (visible to customers)
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setTierModalOpen(false);
                      resetTierForm();
                    }}
                    className="flex-1 px-6 py-3 bg-white border-2 border-gray-300 text-gray-900 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createTierMutation.isPending || updateTierMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-yellow-400 text-black font-semibold rounded-lg hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {(createTierMutation.isPending || updateTierMutation.isPending) ? (
                      <>
                        <Loader className="w-5 h-5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        {tierFormData.id ? 'Update' : 'Create'} Tier
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Feature Modal */}
        {featureModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200 sticky top-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-black">
                    {editingFeatureId ? 'Edit Feature' : 'Add Feature'}
                  </h3>
                  <button
                    onClick={() => {
                      setFeatureModalOpen(false);
                      resetFeatureForm();
                    }}
                    className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleFeatureSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Feature Group *
                  </label>
                  <select
                    value={featureFormData.group_name}
                    onChange={(e) => setFeatureFormData({ ...featureFormData, group_name: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 transition-all"
                    required
                  >
                    <option value="">Select a group</option>
                    {featureGroups.map((group) => (
                      <option key={group} value={group}>
                        {group.replace(/_/g, ' ').charAt(0).toUpperCase() + group.replace(/_/g, ' ').slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Feature Key *
                  </label>
                  <input
                    type="text"
                    value={featureFormData.feature_key}
                    onChange={(e) => setFeatureFormData({ ...featureFormData, feature_key: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 transition-all"
                    placeholder="e.g., express_delivery"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Feature Label *
                  </label>
                  <input
                    type="text"
                    value={featureFormData.feature_label}
                    onChange={(e) => setFeatureFormData({ ...featureFormData, feature_label: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 transition-all"
                    placeholder="e.g., Express Delivery"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Feature Value *
                  </label>
                  <input
                    type="text"
                    value={featureFormData.feature_value}
                    onChange={(e) => setFeatureFormData({ ...featureFormData, feature_value: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 transition-all"
                    placeholder="e.g., 2-3 business days"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={featureFormData.sort_order}
                    onChange={(e) => setFeatureFormData({ ...featureFormData, sort_order: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 transition-all"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is_included"
                    checked={featureFormData.is_included}
                    onChange={(e) => setFeatureFormData({ ...featureFormData, is_included: e.target.checked })}
                    className="w-4 h-4 text-yellow-400 rounded focus:ring-yellow-400"
                  />
                  <label htmlFor="is_included" className="text-sm font-medium text-gray-900">
                    Include this feature
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setFeatureModalOpen(false);
                      resetFeatureForm();
                    }}
                    className="flex-1 px-6 py-3 bg-white border-2 border-gray-300 text-gray-900 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createFeatureMutation.isPending || updateFeatureMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-yellow-400 text-black font-semibold rounded-lg hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {(createFeatureMutation.isPending || updateFeatureMutation.isPending) ? (
                      <>
                        <Loader className="w-5 h-5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        {editingFeatureId ? 'Update' : 'Add'} Feature
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Deliverable Modal */}
        {deliverableModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200 sticky top-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-black">
                    {editingDeliverableId ? 'Edit Deliverable' : 'Add Deliverable'}
                  </h3>
                  <button
                    onClick={() => {
                      setDeliverableModalOpen(false);
                      resetDeliverableForm();
                    }}
                    className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleDeliverableSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Deliverable Group *
                  </label>
                  <input
                    type="text"
                    value={deliverableFormData.deliverable_group}
                    onChange={(e) => setDeliverableFormData({ ...deliverableFormData, deliverable_group: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 transition-all"
                    placeholder="e.g., Design Files, Print Files, Installation"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Deliverable Label *
                  </label>
                  <input
                    type="text"
                    value={deliverableFormData.deliverable_label}
                    onChange={(e) => setDeliverableFormData({ ...deliverableFormData, deliverable_label: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 transition-all"
                    placeholder="e.g., High-resolution PDF"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={deliverableFormData.sort_order}
                    onChange={(e) => setDeliverableFormData({ ...deliverableFormData, sort_order: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 transition-all"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setDeliverableModalOpen(false);
                      resetDeliverableForm();
                    }}
                    className="flex-1 px-6 py-3 bg-white border-2 border-gray-300 text-gray-900 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createDeliverableMutation.isPending || updateDeliverableMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-yellow-400 text-black font-semibold rounded-lg hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {(createDeliverableMutation.isPending || updateDeliverableMutation.isPending) ? (
                      <>
                        <Loader className="w-5 h-5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        {editingDeliverableId ? 'Update' : 'Add'} Deliverable
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Notification Toast */}
        {notification.type && (
          <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
            <div
              className={`flex items-center gap-3 px-6 py-4 rounded-lg shadow-2xl ${
                notification.type === 'success'
                  ? 'bg-green-600 text-white'
                  : 'bg-red-600 text-white'
              }`}
            >
              {notification.type === 'success' ? (
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
              )}
              <p className="font-medium">{notification.message}</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default UV_TiersManagement;