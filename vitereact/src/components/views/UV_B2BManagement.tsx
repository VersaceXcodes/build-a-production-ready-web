import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { X, Plus, Edit, Trash2, Building2, MapPin, DollarSign, FileText, Search, Filter } from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface B2BAccount {
  id: string;
  company_name: string;
  main_contact_id: string;
  billing_address: string | null;
  tax_id: string | null;
  tax_exempt: boolean;
  payment_terms: string | null;
  contract_start: string;
  contract_end: string;
  contract_terms: Record<string, any> | null;
  discount_pct: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface B2BLocation {
  id: string;
  account_id: string;
  label: string;
  address: string;
  contact_person: string | null;
  created_at: string;
  updated_at: string;
}

interface ContractPricing {
  id: string;
  account_id: string;
  service_id: string;
  pricing_json: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface CreateAccountFormData {
  company_name: string;
  main_contact_id: string;
  billing_address: string;
  tax_id: string;
  tax_exempt: boolean;
  payment_terms: string;
  contract_start: string;
  contract_end: string;
  contract_terms: string;
  discount_pct: string;
  is_active: boolean;
}

interface CreateLocationFormData {
  label: string;
  address: string;
  contact_person: string;
}

interface CreatePricingFormData {
  service_id: string;
  pricing_json: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_B2BManagement: React.FC = () => {
  // ======================================================================
  // GLOBAL STATE ACCESS (Individual Selectors)
  // ======================================================================
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const featureFlags = useAppStore(state => state.feature_flags);

  // ======================================================================
  // HOOKS & NAVIGATION
  // ======================================================================
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ======================================================================
  // URL PARAMS
  // ======================================================================
  const accountIdFromUrl = searchParams.get('account_id');
  const tabFromUrl = searchParams.get('tab') || 'overview';

  // ======================================================================
  // LOCAL STATE
  // ======================================================================
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(accountIdFromUrl);
  const [activeTab, setActiveTab] = useState<string>(tabFromUrl);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | undefined>(undefined);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showLocationModal, setShowLocationModal] = useState<boolean>(false);
  const [showPricingModal, setShowPricingModal] = useState<boolean>(false);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [editLocationId, setEditLocationId] = useState<string | null>(null);
  const [editPricingId, setEditPricingId] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  // Account Form State
  const [accountForm, setAccountForm] = useState<CreateAccountFormData>({
    company_name: '',
    main_contact_id: '',
    billing_address: '',
    tax_id: '',
    tax_exempt: false,
    payment_terms: '',
    contract_start: '',
    contract_end: '',
    contract_terms: '{}',
    discount_pct: '0',
    is_active: true,
  });

  // Location Form State
  const [locationForm, setLocationForm] = useState<CreateLocationFormData>({
    label: '',
    address: '',
    contact_person: '',
  });

  // Pricing Form State
  const [pricingForm, setPricingForm] = useState<CreatePricingFormData>({
    service_id: '',
    pricing_json: '{}',
  });

  // ======================================================================
  // SYNC URL WITH STATE
  // ======================================================================
  useEffect(() => {
    if (selectedAccountId && activeTab) {
      const params = new URLSearchParams();
      params.set('account_id', selectedAccountId);
      params.set('tab', activeTab);
      setSearchParams(params);
    }
  }, [selectedAccountId, activeTab, setSearchParams]);

  // ======================================================================
  // AUTO-DISMISS NOTIFICATIONS
  // ======================================================================
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // ======================================================================
  // API FUNCTIONS
  // ======================================================================

  // Fetch B2B Accounts
  const fetchB2bAccounts = async () => {
    const params = new URLSearchParams();
    if (searchQuery) params.append('query', searchQuery);
    if (isActiveFilter !== undefined) params.append('is_active', String(isActiveFilter));
    params.append('limit', '50');

    const response = await axios.get(
      `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/b2b-accounts?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );
    return response.data.accounts || [];
  };

  // Fetch Account Details
  const fetchAccountDetails = async (accountId: string) => {
    const response = await axios.get(
      `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/b2b-accounts/${accountId}`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );
    return response.data;
  };

  // Fetch Account Locations
  const fetchAccountLocations = async (accountId: string) => {
    const response = await axios.get(
      `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/b2b-accounts/${accountId}/locations`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );
    return response.data.locations || [];
  };

  // Fetch Contract Pricing
  const fetchContractPricing = async (accountId: string) => {
    const response = await axios.get(
      `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/b2b-accounts/${accountId}/contract-pricing`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );
    return response.data.pricing || [];
  };

  // ======================================================================
  // REACT QUERY QUERIES
  // ======================================================================

  const { data: accounts = [], isLoading: isLoadingAccounts } = useQuery({
    queryKey: ['b2b-accounts', searchQuery, isActiveFilter],
    queryFn: fetchB2bAccounts,
    enabled: !!authToken,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const { data: selectedAccount, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['b2b-account', selectedAccountId],
    queryFn: () => fetchAccountDetails(selectedAccountId!),
    enabled: !!authToken && !!selectedAccountId,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['b2b-locations', selectedAccountId],
    queryFn: () => fetchAccountLocations(selectedAccountId!),
    enabled: !!authToken && !!selectedAccountId && activeTab === 'locations',
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const { data: contractPricing = [] } = useQuery({
    queryKey: ['contract-pricing', selectedAccountId],
    queryFn: () => fetchContractPricing(selectedAccountId!),
    enabled: !!authToken && !!selectedAccountId && activeTab === 'pricing',
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  // ======================================================================
  // MUTATIONS
  // ======================================================================

  // Create Account Mutation
  const createAccountMutation = useMutation({
    mutationFn: async (data: CreateAccountFormData) => {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/b2b-accounts`,
        {
          company_name: data.company_name,
          main_contact_id: data.main_contact_id,
          billing_address: data.billing_address || null,
          tax_id: data.tax_id || null,
          tax_exempt: data.tax_exempt,
          payment_terms: data.payment_terms || null,
          contract_start: data.contract_start,
          contract_end: data.contract_end,
          contract_terms: data.contract_terms ? JSON.parse(data.contract_terms) : null,
          discount_pct: data.discount_pct ? Number(data.discount_pct) : null,
          is_active: data.is_active,
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['b2b-accounts'] });
      setShowCreateModal(false);
      setNotification({ type: 'success', message: 'B2B account created successfully!' });
      setSelectedAccountId(data.id);
      setAccountForm({
        company_name: '',
        main_contact_id: '',
        billing_address: '',
        tax_id: '',
        tax_exempt: false,
        payment_terms: '',
        contract_start: '',
        contract_end: '',
        contract_terms: '{}',
        discount_pct: '0',
        is_active: true,
      });
      setFormErrors({});
    },
    onError: (error: any) => {
      setNotification({ 
        type: 'error', 
        message: error.response?.data?.message || 'Failed to create account' 
      });
    },
  });

  // Update Account Mutation
  const updateAccountMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<CreateAccountFormData> }) => {
      const payload: any = {};
      if (data.updates.company_name) payload.company_name = data.updates.company_name;
      if (data.updates.main_contact_id) payload.main_contact_id = data.updates.main_contact_id;
      if (data.updates.billing_address !== undefined) payload.billing_address = data.updates.billing_address || null;
      if (data.updates.tax_id !== undefined) payload.tax_id = data.updates.tax_id || null;
      if (data.updates.tax_exempt !== undefined) payload.tax_exempt = data.updates.tax_exempt;
      if (data.updates.payment_terms !== undefined) payload.payment_terms = data.updates.payment_terms || null;
      if (data.updates.contract_start) payload.contract_start = data.updates.contract_start;
      if (data.updates.contract_end) payload.contract_end = data.updates.contract_end;
      if (data.updates.contract_terms !== undefined) {
        payload.contract_terms = data.updates.contract_terms ? JSON.parse(data.updates.contract_terms) : null;
      }
      if (data.updates.discount_pct !== undefined) {
        payload.discount_pct = data.updates.discount_pct ? Number(data.updates.discount_pct) : null;
      }
      if (data.updates.is_active !== undefined) payload.is_active = data.updates.is_active;

      const response = await axios.put(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/b2b-accounts/${data.id}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['b2b-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['b2b-account', selectedAccountId] });
      setEditMode(false);
      setNotification({ type: 'success', message: 'Account updated successfully!' });
      setFormErrors({});
    },
    onError: (error: any) => {
      setNotification({ 
        type: 'error', 
        message: error.response?.data?.message || 'Failed to update account' 
      });
    },
  });

  // Create Location Mutation
  const createLocationMutation = useMutation({
    mutationFn: async (data: CreateLocationFormData) => {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/b2b-accounts/${selectedAccountId}/locations`,
        {
          label: data.label,
          address: data.address,
          contact_person: data.contact_person || null,
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['b2b-locations', selectedAccountId] });
      setShowLocationModal(false);
      setNotification({ type: 'success', message: 'Location added successfully!' });
      setLocationForm({ label: '', address: '', contact_person: '' });
      setFormErrors({});
    },
    onError: (error: any) => {
      setNotification({ 
        type: 'error', 
        message: error.response?.data?.message || 'Failed to add location' 
      });
    },
  });

  // Update Location Mutation
  const updateLocationMutation = useMutation({
    mutationFn: async (data: { id: string; updates: CreateLocationFormData }) => {
      const response = await axios.put(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/b2b-locations/${data.id}`,
        {
          label: data.updates.label,
          address: data.updates.address,
          contact_person: data.updates.contact_person || null,
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['b2b-locations', selectedAccountId] });
      setShowLocationModal(false);
      setEditLocationId(null);
      setNotification({ type: 'success', message: 'Location updated successfully!' });
      setLocationForm({ label: '', address: '', contact_person: '' });
      setFormErrors({});
    },
    onError: (error: any) => {
      setNotification({ 
        type: 'error', 
        message: error.response?.data?.message || 'Failed to update location' 
      });
    },
  });

  // Delete Location Mutation
  const deleteLocationMutation = useMutation({
    mutationFn: async (locationId: string) => {
      await axios.delete(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/b2b-locations/${locationId}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['b2b-locations', selectedAccountId] });
      setNotification({ type: 'success', message: 'Location deleted successfully!' });
    },
    onError: (error: any) => {
      setNotification({ 
        type: 'error', 
        message: error.response?.data?.message || 'Failed to delete location' 
      });
    },
  });

  // Create Pricing Mutation
  const createPricingMutation = useMutation({
    mutationFn: async (data: CreatePricingFormData) => {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/b2b-accounts/${selectedAccountId}/contract-pricing`,
        {
          service_id: data.service_id,
          pricing_json: JSON.parse(data.pricing_json),
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-pricing', selectedAccountId] });
      setShowPricingModal(false);
      setNotification({ type: 'success', message: 'Pricing override added successfully!' });
      setPricingForm({ service_id: '', pricing_json: '{}' });
      setFormErrors({});
    },
    onError: (error: any) => {
      setNotification({ 
        type: 'error', 
        message: error.response?.data?.message || 'Failed to add pricing override' 
      });
    },
  });

  // Update Pricing Mutation
  const updatePricingMutation = useMutation({
    mutationFn: async (data: { id: string; updates: CreatePricingFormData }) => {
      const response = await axios.put(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/contract-pricing/${data.id}`,
        {
          pricing_json: JSON.parse(data.updates.pricing_json),
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-pricing', selectedAccountId] });
      setShowPricingModal(false);
      setEditPricingId(null);
      setNotification({ type: 'success', message: 'Pricing override updated successfully!' });
      setPricingForm({ service_id: '', pricing_json: '{}' });
      setFormErrors({});
    },
    onError: (error: any) => {
      setNotification({ 
        type: 'error', 
        message: error.response?.data?.message || 'Failed to update pricing override' 
      });
    },
  });

  // ======================================================================
  // HANDLERS
  // ======================================================================

  const handleSelectAccount = (accountId: string) => {
    setSelectedAccountId(accountId);
    setActiveTab('overview');
    setEditMode(false);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const handleCreateAccount = () => {
    setShowCreateModal(true);
    setAccountForm({
      company_name: '',
      main_contact_id: '',
      billing_address: '',
      tax_id: '',
      tax_exempt: false,
      payment_terms: '',
      contract_start: '',
      contract_end: '',
      contract_terms: '{}',
      discount_pct: '0',
      is_active: true,
    });
  };

  const handleSubmitAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    // Validation
    const errors: Record<string, string> = {};
    if (!accountForm.company_name.trim()) errors.company_name = 'Company name is required';
    if (!accountForm.main_contact_id.trim()) errors.main_contact_id = 'Main contact is required';
    if (!accountForm.contract_start) errors.contract_start = 'Contract start date is required';
    if (!accountForm.contract_end) errors.contract_end = 'Contract end date is required';
    if (accountForm.contract_start && accountForm.contract_end) {
      if (new Date(accountForm.contract_end) <= new Date(accountForm.contract_start)) {
        errors.contract_end = 'End date must be after start date';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    createAccountMutation.mutate(accountForm);
  };

  const handleUpdateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) return;

    setFormErrors({});

    // Validation
    const errors: Record<string, string> = {};
    if (!accountForm.company_name.trim()) errors.company_name = 'Company name is required';
    if (!accountForm.contract_start) errors.contract_start = 'Contract start date is required';
    if (!accountForm.contract_end) errors.contract_end = 'Contract end date is required';
    if (accountForm.contract_start && accountForm.contract_end) {
      if (new Date(accountForm.contract_end) <= new Date(accountForm.contract_start)) {
        errors.contract_end = 'End date must be after start date';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    updateAccountMutation.mutate({
      id: selectedAccount.id,
      updates: accountForm,
    });
  };

  const handleEditAccount = () => {
    if (selectedAccount) {
      setAccountForm({
        company_name: selectedAccount.company_name,
        main_contact_id: selectedAccount.main_contact_id,
        billing_address: selectedAccount.billing_address || '',
        tax_id: selectedAccount.tax_id || '',
        tax_exempt: selectedAccount.tax_exempt,
        payment_terms: selectedAccount.payment_terms || '',
        contract_start: selectedAccount.contract_start.split('T')[0],
        contract_end: selectedAccount.contract_end.split('T')[0],
        contract_terms: selectedAccount.contract_terms ? JSON.stringify(selectedAccount.contract_terms, null, 2) : '{}',
        discount_pct: selectedAccount.discount_pct !== null ? String(selectedAccount.discount_pct) : '0',
        is_active: selectedAccount.is_active,
      });
      setEditMode(true);
    }
  };

  const handleAddLocation = () => {
    setShowLocationModal(true);
    setEditLocationId(null);
    setLocationForm({ label: '', address: '', contact_person: '' });
  };

  const handleEditLocation = (location: B2BLocation) => {
    setShowLocationModal(true);
    setEditLocationId(location.id);
    setLocationForm({
      label: location.label,
      address: location.address,
      contact_person: location.contact_person || '',
    });
  };

  const handleSubmitLocation = (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    const errors: Record<string, string> = {};
    if (!locationForm.label.trim()) errors.label = 'Location label is required';
    if (!locationForm.address.trim()) errors.address = 'Address is required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    if (editLocationId) {
      updateLocationMutation.mutate({ id: editLocationId, updates: locationForm });
    } else {
      createLocationMutation.mutate(locationForm);
    }
  };

  const handleDeleteLocation = (locationId: string) => {
    if (window.confirm('Are you sure you want to delete this location?')) {
      deleteLocationMutation.mutate(locationId);
    }
  };

  const handleAddPricing = () => {
    setShowPricingModal(true);
    setEditPricingId(null);
    setPricingForm({ service_id: '', pricing_json: '{}' });
  };

  const handleEditPricing = (pricing: ContractPricing) => {
    setShowPricingModal(true);
    setEditPricingId(pricing.id);
    setPricingForm({
      service_id: pricing.service_id,
      pricing_json: JSON.stringify(pricing.pricing_json, null, 2),
    });
  };

  const handleSubmitPricing = (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    const errors: Record<string, string> = {};
    if (!pricingForm.service_id) errors.service_id = 'Service is required';
    if (!pricingForm.pricing_json.trim()) {
      errors.pricing_json = 'Pricing configuration is required';
    } else {
      try {
        JSON.parse(pricingForm.pricing_json);
      } catch {
        errors.pricing_json = 'Invalid JSON format';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    if (editPricingId) {
      updatePricingMutation.mutate({ id: editPricingId, updates: pricingForm });
    } else {
      createPricingMutation.mutate(pricingForm);
    }
  };

  // ======================================================================
  // RENDER
  // ======================================================================

  // Feature flag check
  if (!featureFlags.b2b_accounts) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
            <div className="mb-4">
              <Building2 className="w-16 h-16 text-gray-400 mx-auto" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">B2B Module Disabled</h2>
            <p className="text-gray-600 mb-4">
              The B2B account management feature is currently disabled. Please enable it in system settings.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Notification Toast */}
        {notification && (
          <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg ${
            notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}>
            {notification.message}
          </div>
        )}

        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">B2B Account Management</h1>
                <p className="mt-1 text-sm text-gray-600">Manage enterprise accounts, locations, and contract pricing</p>
              </div>
              <button
                onClick={handleCreateAccount}
                className="inline-flex items-center px-6 py-3 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold rounded-lg shadow-md transition-all duration-200"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Account
              </button>
            </div>
          </div>
        </div>

        {/* Main Content - Two Column Layout */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Accounts List */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                {/* Search & Filter */}
                <div className="p-4 border-b border-gray-200">
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search accounts..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <select
                      value={isActiveFilter === undefined ? 'all' : isActiveFilter ? 'active' : 'inactive'}
                      onChange={(e) => {
                        if (e.target.value === 'all') setIsActiveFilter(undefined);
                        else setIsActiveFilter(e.target.value === 'active');
                      }}
                      className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                    >
                      <option value="all">All Accounts</option>
                      <option value="active">Active Only</option>
                      <option value="inactive">Inactive Only</option>
                    </select>
                  </div>
                </div>

                {/* Accounts List */}
                <div className="overflow-y-auto max-h-[600px]">
                  {isLoadingAccounts ? (
                    <div className="p-8 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto"></div>
                      <p className="mt-2 text-sm text-gray-500">Loading accounts...</p>
                    </div>
                  ) : accounts.length === 0 ? (
                    <div className="p-8 text-center">
                      <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500">No B2B accounts found</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {accounts.map((account: B2BAccount) => (
                        <button
                          key={account.id}
                          onClick={() => handleSelectAccount(account.id)}
                          className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                            selectedAccountId === account.id ? 'bg-yellow-50 border-l-4 border-yellow-400' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900">{account.company_name}</h3>
                              <p className="text-sm text-gray-600 mt-1">
                                Contract: {new Date(account.contract_start).toLocaleDateString()} - {new Date(account.contract_end).toLocaleDateString()}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                  account.is_active 
                                    ? 'bg-yellow-100 text-yellow-800' 
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {account.is_active ? 'Active' : 'Inactive'}
                                </span>
                                {account.tax_exempt && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                    Tax Exempt
                                  </span>
                                )}
                                {account.discount_pct !== null && Number(account.discount_pct) > 0 && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                    {Number(account.discount_pct).toFixed(0)}% Discount
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Account Details */}
            <div className="lg:col-span-2">
              {!selectedAccountId ? (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-12 text-center">
                  <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Account Selected</h3>
                  <p className="text-gray-600">Select an account from the list to view details or create a new one.</p>
                </div>
              ) : isLoadingDetails ? (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-12 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto"></div>
                  <p className="mt-4 text-gray-500">Loading account details...</p>
                </div>
              ) : selectedAccount ? (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                  {/* Tabs */}
                  <div className="border-b border-gray-200">
                    <nav className="flex -mb-px">
                      {['overview', 'locations', 'pricing'].map((tab) => (
                        <button
                          key={tab}
                          onClick={() => handleTabChange(tab)}
                          className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === tab
                              ? 'border-yellow-400 text-gray-900'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          {tab === 'overview' && <Building2 className="w-4 h-4 inline mr-2" />}
                          {tab === 'locations' && <MapPin className="w-4 h-4 inline mr-2" />}
                          {tab === 'pricing' && <DollarSign className="w-4 h-4 inline mr-2" />}
                          {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                      ))}
                    </nav>
                  </div>

                  {/* Tab Content */}
                  <div className="p-6">
                    {/* Overview Tab */}
                    {activeTab === 'overview' && (
                      <div>
                        <div className="flex items-center justify-between mb-6">
                          <h2 className="text-2xl font-bold text-gray-900">Account Details</h2>
                          {!editMode ? (
                            <button
                              onClick={handleEditAccount}
                              className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium rounded-lg transition-colors"
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </button>
                          ) : (
                            <button
                              onClick={() => setEditMode(false)}
                              className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium rounded-lg transition-colors"
                            >
                              <X className="w-4 h-4 mr-2" />
                              Cancel
                            </button>
                          )}
                        </div>

                        {editMode ? (
                          <form onSubmit={handleUpdateAccount} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-semibold text-gray-900 mb-1">Company Name *</label>
                                <input
                                  type="text"
                                  value={accountForm.company_name}
                                  onChange={(e) => {
                                    setFormErrors(prev => ({ ...prev, company_name: '' }));
                                    setAccountForm(prev => ({ ...prev, company_name: e.target.value }));
                                  }}
                                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 ${
                                    formErrors.company_name ? 'border-red-500' : 'border-gray-300'
                                  }`}
                                />
                                {formErrors.company_name && (
                                  <p className="mt-1 text-sm text-red-600">{formErrors.company_name}</p>
                                )}
                              </div>

                              <div>
                                <label className="block text-sm font-semibold text-gray-900 mb-1">Billing Address</label>
                                <input
                                  type="text"
                                  value={accountForm.billing_address}
                                  onChange={(e) => setAccountForm(prev => ({ ...prev, billing_address: e.target.value }))}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-semibold text-gray-900 mb-1">Tax ID</label>
                                <input
                                  type="text"
                                  value={accountForm.tax_id}
                                  onChange={(e) => setAccountForm(prev => ({ ...prev, tax_id: e.target.value }))}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-semibold text-gray-900 mb-1">Discount %</label>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  value={accountForm.discount_pct}
                                  onChange={(e) => setAccountForm(prev => ({ ...prev, discount_pct: e.target.value }))}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-semibold text-gray-900 mb-1">Contract Start *</label>
                                <input
                                  type="date"
                                  value={accountForm.contract_start}
                                  onChange={(e) => {
                                    setFormErrors(prev => ({ ...prev, contract_start: '' }));
                                    setAccountForm(prev => ({ ...prev, contract_start: e.target.value }));
                                  }}
                                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 ${
                                    formErrors.contract_start ? 'border-red-500' : 'border-gray-300'
                                  }`}
                                />
                                {formErrors.contract_start && (
                                  <p className="mt-1 text-sm text-red-600">{formErrors.contract_start}</p>
                                )}
                              </div>

                              <div>
                                <label className="block text-sm font-semibold text-gray-900 mb-1">Contract End *</label>
                                <input
                                  type="date"
                                  value={accountForm.contract_end}
                                  onChange={(e) => {
                                    setFormErrors(prev => ({ ...prev, contract_end: '' }));
                                    setAccountForm(prev => ({ ...prev, contract_end: e.target.value }));
                                  }}
                                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 ${
                                    formErrors.contract_end ? 'border-red-500' : 'border-gray-300'
                                  }`}
                                />
                                {formErrors.contract_end && (
                                  <p className="mt-1 text-sm text-red-600">{formErrors.contract_end}</p>
                                )}
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-semibold text-gray-900 mb-1">Payment Terms</label>
                              <textarea
                                value={accountForm.payment_terms}
                                onChange={(e) => setAccountForm(prev => ({ ...prev, payment_terms: e.target.value }))}
                                rows={2}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                              />
                            </div>

                            <div className="flex items-center gap-6">
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={accountForm.tax_exempt}
                                  onChange={(e) => setAccountForm(prev => ({ ...prev, tax_exempt: e.target.checked }))}
                                  className="w-4 h-4 text-yellow-400 border-gray-300 rounded focus:ring-yellow-400"
                                />
                                <span className="ml-2 text-sm font-medium text-gray-900">Tax Exempt</span>
                              </label>

                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={accountForm.is_active}
                                  onChange={(e) => setAccountForm(prev => ({ ...prev, is_active: e.target.checked }))}
                                  className="w-4 h-4 text-yellow-400 border-gray-300 rounded focus:ring-yellow-400"
                                />
                                <span className="ml-2 text-sm font-medium text-gray-900">Active</span>
                              </label>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t">
                              <button
                                type="button"
                                onClick={() => setEditMode(false)}
                                className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium rounded-lg transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={updateAccountMutation.isPending}
                                className="px-6 py-2 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold rounded-lg transition-colors disabled:opacity-50"
                              >
                                {updateAccountMutation.isPending ? 'Saving...' : 'Save Changes'}
                              </button>
                            </div>
                          </form>
                        ) : (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <h3 className="text-sm font-semibold text-gray-500 mb-1">Company Name</h3>
                                <p className="text-base text-gray-900">{selectedAccount.company_name}</p>
                              </div>

                              <div>
                                <h3 className="text-sm font-semibold text-gray-500 mb-1">Billing Address</h3>
                                <p className="text-base text-gray-900">{selectedAccount.billing_address || 'Not provided'}</p>
                              </div>

                              <div>
                                <h3 className="text-sm font-semibold text-gray-500 mb-1">Tax ID</h3>
                                <p className="text-base text-gray-900">{selectedAccount.tax_id || 'Not provided'}</p>
                              </div>

                              <div>
                                <h3 className="text-sm font-semibold text-gray-500 mb-1">Discount</h3>
                                <p className="text-base text-gray-900">
                                  {selectedAccount.discount_pct !== null ? `${Number(selectedAccount.discount_pct).toFixed(2)}%` : 'None'}
                                </p>
                              </div>

                              <div>
                                <h3 className="text-sm font-semibold text-gray-500 mb-1">Contract Period</h3>
                                <p className="text-base text-gray-900">
                                  {new Date(selectedAccount.contract_start).toLocaleDateString()} - {new Date(selectedAccount.contract_end).toLocaleDateString()}
                                </p>
                              </div>

                              <div>
                                <h3 className="text-sm font-semibold text-gray-500 mb-1">Status</h3>
                                <div className="flex items-center gap-2">
                                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                    selectedAccount.is_active 
                                      ? 'bg-yellow-100 text-yellow-800' 
                                      : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {selectedAccount.is_active ? 'Active' : 'Inactive'}
                                  </span>
                                  {selectedAccount.tax_exempt && (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                                      Tax Exempt
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {selectedAccount.payment_terms && (
                              <div className="pt-4 border-t">
                                <h3 className="text-sm font-semibold text-gray-500 mb-1">Payment Terms</h3>
                                <p className="text-base text-gray-900">{selectedAccount.payment_terms}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Locations Tab */}
                    {activeTab === 'locations' && (
                      <div>
                        <div className="flex items-center justify-between mb-6">
                          <h2 className="text-2xl font-bold text-gray-900">Locations</h2>
                          <button
                            onClick={handleAddLocation}
                            className="inline-flex items-center px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold rounded-lg transition-colors"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Location
                          </button>
                        </div>

                        {locations.length === 0 ? (
                          <div className="text-center py-12">
                            <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">No locations yet. Add the first location for this account.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {locations.map((location: B2BLocation) => (
                              <div key={location.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-start gap-2">
                                    <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                                    <div>
                                      <h3 className="font-semibold text-gray-900">{location.label}</h3>
                                      <p className="text-sm text-gray-600 mt-1">{location.address}</p>
                                      {location.contact_person && (
                                        <p className="text-sm text-gray-600 mt-1">Contact: {location.contact_person}</p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleEditLocation(location)}
                                      className="p-1 hover:bg-white rounded transition-colors"
                                    >
                                      <Edit className="w-4 h-4 text-gray-600" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteLocation(location.id)}
                                      className="p-1 hover:bg-white rounded transition-colors"
                                    >
                                      <Trash2 className="w-4 h-4 text-red-600" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Pricing Tab */}
                    {activeTab === 'pricing' && (
                      <div>
                        <div className="flex items-center justify-between mb-6">
                          <h2 className="text-2xl font-bold text-gray-900">Contract Pricing</h2>
                          <button
                            onClick={handleAddPricing}
                            className="inline-flex items-center px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold rounded-lg transition-colors"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Pricing Override
                          </button>
                        </div>

                        {contractPricing.length === 0 ? (
                          <div className="text-center py-12">
                            <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">No custom pricing overrides. Add service-specific pricing.</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {contractPricing.map((pricing: ContractPricing) => (
                              <div key={pricing.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h3 className="font-semibold text-gray-900 mb-2">Service ID: {pricing.service_id}</h3>
                                    <pre className="text-xs text-gray-600 bg-white p-3 rounded border border-gray-200 overflow-x-auto">
                                      {JSON.stringify(pricing.pricing_json, null, 2)}
                                    </pre>
                                  </div>
                                  <button
                                    onClick={() => handleEditPricing(pricing)}
                                    className="ml-4 p-2 hover:bg-white rounded transition-colors"
                                  >
                                    <Edit className="w-4 h-4 text-gray-600" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Create Account Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Create B2B Account</h2>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmitAccount} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-1">Company Name *</label>
                    <input
                      type="text"
                      value={accountForm.company_name}
                      onChange={(e) => {
                        setFormErrors(prev => ({ ...prev, company_name: '' }));
                        setAccountForm(prev => ({ ...prev, company_name: e.target.value }));
                      }}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 ${
                        formErrors.company_name ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {formErrors.company_name && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.company_name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-1">Main Contact User ID *</label>
                    <input
                      type="text"
                      value={accountForm.main_contact_id}
                      onChange={(e) => {
                        setFormErrors(prev => ({ ...prev, main_contact_id: '' }));
                        setAccountForm(prev => ({ ...prev, main_contact_id: e.target.value }));
                      }}
                      placeholder="Enter user ID"
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 ${
                        formErrors.main_contact_id ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {formErrors.main_contact_id && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.main_contact_id}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-1">Billing Address</label>
                    <input
                      type="text"
                      value={accountForm.billing_address}
                      onChange={(e) => setAccountForm(prev => ({ ...prev, billing_address: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-1">Tax ID</label>
                    <input
                      type="text"
                      value={accountForm.tax_id}
                      onChange={(e) => setAccountForm(prev => ({ ...prev, tax_id: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-1">Discount % (0-100)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={accountForm.discount_pct}
                      onChange={(e) => setAccountForm(prev => ({ ...prev, discount_pct: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-1">Payment Terms</label>
                    <input
                      type="text"
                      value={accountForm.payment_terms}
                      onChange={(e) => setAccountForm(prev => ({ ...prev, payment_terms: e.target.value }))}
                      placeholder="e.g., Net 30"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-1">Contract Start *</label>
                    <input
                      type="date"
                      value={accountForm.contract_start}
                      onChange={(e) => {
                        setFormErrors(prev => ({ ...prev, contract_start: '' }));
                        setAccountForm(prev => ({ ...prev, contract_start: e.target.value }));
                      }}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 ${
                        formErrors.contract_start ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {formErrors.contract_start && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.contract_start}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-1">Contract End *</label>
                    <input
                      type="date"
                      value={accountForm.contract_end}
                      onChange={(e) => {
                        setFormErrors(prev => ({ ...prev, contract_end: '' }));
                        setAccountForm(prev => ({ ...prev, contract_end: e.target.value }));
                      }}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 ${
                        formErrors.contract_end ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {formErrors.contract_end && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.contract_end}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={accountForm.tax_exempt}
                      onChange={(e) => setAccountForm(prev => ({ ...prev, tax_exempt: e.target.checked }))}
                      className="w-4 h-4 text-yellow-400 border-gray-300 rounded focus:ring-yellow-400"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-900">Tax Exempt</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={accountForm.is_active}
                      onChange={(e) => setAccountForm(prev => ({ ...prev, is_active: e.target.checked }))}
                      className="w-4 h-4 text-yellow-400 border-gray-300 rounded focus:ring-yellow-400"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-900">Active</span>
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createAccountMutation.isPending}
                    className="px-6 py-2 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold rounded-lg transition-colors disabled:opacity-50"
                  >
                    {createAccountMutation.isPending ? 'Creating...' : 'Create Account'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Location Modal */}
        {showLocationModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {editLocationId ? 'Edit Location' : 'Add Location'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowLocationModal(false);
                      setEditLocationId(null);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmitLocation} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">Location Label *</label>
                  <input
                    type="text"
                    value={locationForm.label}
                    onChange={(e) => {
                      setFormErrors(prev => ({ ...prev, label: '' }));
                      setLocationForm(prev => ({ ...prev, label: e.target.value }));
                    }}
                    placeholder="e.g., Main Office, Warehouse"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 ${
                      formErrors.label ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.label && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.label}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">Address *</label>
                  <textarea
                    value={locationForm.address}
                    onChange={(e) => {
                      setFormErrors(prev => ({ ...prev, address: '' }));
                      setLocationForm(prev => ({ ...prev, address: e.target.value }));
                    }}
                    rows={3}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 ${
                      formErrors.address ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.address && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.address}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={locationForm.contact_person}
                    onChange={(e) => setLocationForm(prev => ({ ...prev, contact_person: e.target.value }))}
                    placeholder="Optional"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowLocationModal(false);
                      setEditLocationId(null);
                    }}
                    className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createLocationMutation.isPending || updateLocationMutation.isPending}
                    className="px-6 py-2 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold rounded-lg transition-colors disabled:opacity-50"
                  >
                    {(createLocationMutation.isPending || updateLocationMutation.isPending) 
                      ? 'Saving...' 
                      : editLocationId ? 'Update' : 'Add Location'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Pricing Modal */}
        {showPricingModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {editPricingId ? 'Edit Pricing Override' : 'Add Pricing Override'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowPricingModal(false);
                      setEditPricingId(null);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmitPricing} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">Service ID *</label>
                  <input
                    type="text"
                    value={pricingForm.service_id}
                    onChange={(e) => {
                      setFormErrors(prev => ({ ...prev, service_id: '' }));
                      setPricingForm(prev => ({ ...prev, service_id: e.target.value }));
                    }}
                    disabled={!!editPricingId}
                    placeholder="Enter service ID"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 ${
                      formErrors.service_id ? 'border-red-500' : 'border-gray-300'
                    } ${editPricingId ? 'bg-gray-100' : ''}`}
                  />
                  {formErrors.service_id && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.service_id}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">Pricing Configuration (JSON) *</label>
                  <textarea
                    value={pricingForm.pricing_json}
                    onChange={(e) => {
                      setFormErrors(prev => ({ ...prev, pricing_json: '' }));
                      setPricingForm(prev => ({ ...prev, pricing_json: e.target.value }));
                    }}
                    rows={8}
                    placeholder='{"base_price": 100, "volume_discounts": {...}}'
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 font-mono text-sm ${
                      formErrors.pricing_json ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.pricing_json && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.pricing_json}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">Enter valid JSON configuration</p>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPricingModal(false);
                      setEditPricingId(null);
                    }}
                    className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createPricingMutation.isPending || updatePricingMutation.isPending}
                    className="px-6 py-2 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold rounded-lg transition-colors disabled:opacity-50"
                  >
                    {(createPricingMutation.isPending || updatePricingMutation.isPending) 
                      ? 'Saving...' 
                      : editPricingId ? 'Update' : 'Add Override'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default UV_B2BManagement;