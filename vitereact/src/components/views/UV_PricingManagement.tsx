import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface PricingRule {
  id: string;
  service_id: string | null;
  rule_type: 'VOLUME_DISCOUNT' | 'RUSH_FEE' | 'SEASONAL_PROMOTION' | 'CUSTOM';
  rule_config: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  service_name?: string;
}

interface SystemPricingSettings {
  deposit_percentage: number;
  tax_rate: number;
  emergency_booking_fee_percentage: number;
}

interface Service {
  id: string;
  name: string;
  category_name: string;
}

interface NotificationState {
  type: 'success' | 'error' | null;
  message: string;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchServices = async (token: string): Promise<Service[]> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/services`,
    {
      headers: { Authorization: `Bearer ${token}` },
      params: { is_active: true },
    }
  );
  return response.data.services || [];
};

const fetchSystemSettings = async (token: string): Promise<SystemPricingSettings> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/system-settings`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  
  const settingsMap = response.data.settings.reduce((acc: any, setting: any) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {});

  return {
    deposit_percentage: Number(settingsMap.deposit_percentage?.value || 50),
    tax_rate: Number(settingsMap.tax_rate?.current_rate || 15),
    emergency_booking_fee_percentage: Number(settingsMap.emergency_booking_fee?.percentage || 20),
  };
};

const fetchPricingRules = async (token: string): Promise<PricingRule[]> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/pricing-rules`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.data.rules || [];
};

const createPricingRule = async (token: string, data: Partial<PricingRule>): Promise<PricingRule> => {
  const response = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/pricing-rules`,
    data,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.data;
};

const updatePricingRule = async (token: string, id: string, data: Partial<PricingRule>): Promise<PricingRule> => {
  const response = await axios.put(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/pricing-rules/${id}`,
    data,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.data;
};

const deletePricingRule = async (token: string, id: string): Promise<void> => {
  await axios.delete(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/pricing-rules/${id}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
};

const updateSystemSetting = async (token: string, key: string, value: any): Promise<void> => {
  await axios.put(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/system-settings/${key}`,
    { value },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_PricingManagement: React.FC = () => {
  // Global state (CRITICAL: Individual selectors only)
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const currentUser = useAppStore(state => state.authentication_state.current_user);

  // Query client for cache invalidation
  const queryClient = useQueryClient();

  // React Query - Services
  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => fetchServices(authToken!),
    enabled: !!authToken,
    staleTime: 5 * 60 * 1000,
  });

  // React Query - System Settings
  const { data: systemSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['system-settings'],
    queryFn: () => fetchSystemSettings(authToken!),
    enabled: !!authToken,
    staleTime: 5 * 60 * 1000,
  });

  // React Query - Pricing Rules
  const { data: pricingRules = [], isLoading: isLoadingRules } = useQuery({
    queryKey: ['pricing-rules'],
    queryFn: () => fetchPricingRules(authToken!),
    enabled: !!authToken,
    staleTime: 5 * 60 * 1000,
  });

  // Add service names to pricing rules
  const rulesWithServiceNames = pricingRules.map(rule => ({
    ...rule,
    service_name: rule.service_id 
      ? services.find(s => s.id === rule.service_id)?.name || 'Unknown Service'
      : 'Global Rule',
  }));

  // Local state - System Settings Form
  const [settingsForm, setSettingsForm] = useState<SystemPricingSettings>({
    deposit_percentage: 50,
    tax_rate: 15,
    emergency_booking_fee_percentage: 20,
  });

  const [settingsChanged, setSettingsChanged] = useState(false);

  // Update form when system settings load
  useEffect(() => {
    if (systemSettings) {
      setSettingsForm(systemSettings);
    }
  }, [systemSettings]);

  // Local state - Rule Modal
  const [ruleModal, setRuleModal] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    ruleData: Partial<PricingRule> | null;
  }>({
    isOpen: false,
    mode: 'create',
    ruleData: null,
  });

  // Local state - Delete Confirmation
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    ruleId: string | null;
    ruleName: string | null;
  }>({
    isOpen: false,
    ruleId: null,
    ruleName: null,
  });

  // Local state - Notification
  const [notification, setNotification] = useState<NotificationState>({
    type: null,
    message: '',
  });

  // Auto-dismiss notification after 3 seconds
  useEffect(() => {
    if (notification.type) {
      const timer = setTimeout(() => {
        setNotification({ type: null, message: '' });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Mutations
  const createRuleMutation = useMutation({
    mutationFn: (data: Partial<PricingRule>) => createPricingRule(authToken!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-rules'] });
      setRuleModal({ isOpen: false, mode: 'create', ruleData: null });
      setNotification({ type: 'success', message: 'Pricing rule created successfully' });
    },
    onError: (error: any) => {
      setNotification({
        type: 'error',
        message: error.response?.data?.message || 'Failed to create pricing rule',
      });
    },
  });

  const updateRuleMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PricingRule> }) =>
      updatePricingRule(authToken!, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-rules'] });
      setRuleModal({ isOpen: false, mode: 'create', ruleData: null });
      setNotification({ type: 'success', message: 'Pricing rule updated successfully' });
    },
    onError: (error: any) => {
      setNotification({
        type: 'error',
        message: error.response?.data?.message || 'Failed to update pricing rule',
      });
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (id: string) => deletePricingRule(authToken!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-rules'] });
      setDeleteConfirmation({ isOpen: false, ruleId: null, ruleName: null });
      setNotification({ type: 'success', message: 'Pricing rule deleted successfully' });
    },
    onError: (error: any) => {
      setNotification({
        type: 'error',
        message: error.response?.data?.message || 'Failed to delete pricing rule',
      });
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: SystemPricingSettings) => {
      await updateSystemSetting(authToken!, 'deposit_percentage', { value: settings.deposit_percentage });
      await updateSystemSetting(authToken!, 'tax_rate', { current_rate: settings.tax_rate });
      await updateSystemSetting(authToken!, 'emergency_booking_fee', { percentage: settings.emergency_booking_fee_percentage });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      setSettingsChanged(false);
      setNotification({ type: 'success', message: 'System pricing settings updated successfully' });
    },
    onError: (error: any) => {
      setNotification({
        type: 'error',
        message: error.response?.data?.message || 'Failed to update system settings',
      });
    },
  });

  // Handlers
  const handleSettingsFormChange = (field: keyof SystemPricingSettings, value: number) => {
    setSettingsForm(prev => ({ ...prev, [field]: value }));
    setSettingsChanged(true);
  };

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate(settingsForm);
  };

  const handleOpenCreateModal = () => {
    setRuleModal({
      isOpen: true,
      mode: 'create',
      ruleData: {
        service_id: null,
        rule_type: 'VOLUME_DISCOUNT',
        rule_config: {},
        is_active: true,
      },
    });
  };

  const handleOpenEditModal = (rule: PricingRule) => {
    setRuleModal({
      isOpen: true,
      mode: 'edit',
      ruleData: rule,
    });
  };

  const handleCloseModal = () => {
    setRuleModal({ isOpen: false, mode: 'create', ruleData: null });
  };

  const handleSaveRule = () => {
    if (!ruleModal.ruleData) return;

    if (ruleModal.mode === 'create') {
      createRuleMutation.mutate(ruleModal.ruleData);
    } else {
      updateRuleMutation.mutate({
        id: ruleModal.ruleData.id!,
        data: {
          rule_config: ruleModal.ruleData.rule_config,
          is_active: ruleModal.ruleData.is_active,
        },
      });
    }
  };

  const handleToggleRuleActive = (rule: PricingRule) => {
    updateRuleMutation.mutate({
      id: rule.id,
      data: { is_active: !rule.is_active },
    });
  };

  const handleOpenDeleteConfirmation = (rule: PricingRule) => {
    setDeleteConfirmation({
      isOpen: true,
      ruleId: rule.id,
      ruleName: rule.service_name || 'this rule',
    });
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmation.ruleId) {
      deleteRuleMutation.mutate(deleteConfirmation.ruleId);
    }
  };

  const isLoading = isLoadingSettings || isLoadingRules;

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Pricing Configuration</h1>
            <p className="text-gray-600 mt-2">Manage system-wide pricing settings and service-specific pricing rules</p>
          </div>

          {/* Notification Banner */}
          {notification.type && (
            <div
              className={`mb-6 px-6 py-4 rounded-lg ${
                notification.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}
            >
              <p className="font-medium">{notification.message}</p>
            </div>
          )}

          {/* Loading State */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-yellow-400"></div>
            </div>
          ) : (
            <>
              {/* System Pricing Settings */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">System Pricing Settings</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Deposit Percentage */}
                  <div>
                    <label htmlFor="deposit_percentage" className="block text-sm font-semibold text-gray-900 mb-2">
                      Deposit Percentage (%)
                    </label>
                    <input
                      type="number"
                      id="deposit_percentage"
                      min="0"
                      max="100"
                      step="1"
                      value={settingsForm.deposit_percentage}
                      onChange={(e) => handleSettingsFormChange('deposit_percentage', Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 transition-all"
                    />
                    <p className="text-xs text-gray-500 mt-1">Required deposit before order starts</p>
                  </div>

                  {/* Tax Rate */}
                  <div>
                    <label htmlFor="tax_rate" className="block text-sm font-semibold text-gray-900 mb-2">
                      Tax/VAT Rate (%)
                    </label>
                    <input
                      type="number"
                      id="tax_rate"
                      min="0"
                      max="100"
                      step="0.1"
                      value={settingsForm.tax_rate}
                      onChange={(e) => handleSettingsFormChange('tax_rate', Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 transition-all"
                    />
                    <p className="text-xs text-gray-500 mt-1">Applied to all orders</p>
                  </div>

                  {/* Emergency Booking Fee */}
                  <div>
                    <label htmlFor="emergency_fee" className="block text-sm font-semibold text-gray-900 mb-2">
                      Emergency Booking Fee (%)
                    </label>
                    <input
                      type="number"
                      id="emergency_fee"
                      min="0"
                      max="100"
                      step="1"
                      value={settingsForm.emergency_booking_fee_percentage}
                      onChange={(e) => handleSettingsFormChange('emergency_booking_fee_percentage', Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 transition-all"
                    />
                    <p className="text-xs text-gray-500 mt-1">Surcharge for urgent bookings</p>
                  </div>
                </div>

                {/* Save Button */}
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleSaveSettings}
                    disabled={!settingsChanged || updateSettingsMutation.isPending}
                    className="px-6 py-3 bg-yellow-400 text-black font-bold rounded-lg hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {updateSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </div>

              {/* Pricing Rules */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Pricing Rules</h2>
                  <button
                    onClick={handleOpenCreateModal}
                    className="px-6 py-3 bg-yellow-400 text-black font-bold rounded-lg hover:bg-yellow-500 transition-all"
                  >
                    + Add Pricing Rule
                  </button>
                </div>

                {/* Rules Table */}
                {rulesWithServiceNames.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p className="text-lg font-medium">No pricing rules configured yet</p>
                    <p className="text-sm mt-2">Click "Add Pricing Rule" to create your first rule</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b-2 border-gray-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">Rule Type</th>
                          <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">Service</th>
                          <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">Configuration</th>
                          <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">Status</th>
                          <th className="px-6 py-3 text-right text-sm font-bold text-gray-900">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {rulesWithServiceNames.map(rule => (
                          <tr key={rule.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                              {rule.rule_type.replace('_', ' ')}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {rule.service_name}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              <pre className="text-xs bg-gray-100 px-2 py-1 rounded">
                                {JSON.stringify(rule.rule_config, null, 2).substring(0, 50)}...
                              </pre>
                            </td>
                            <td className="px-6 py-4">
                              <button
                                onClick={() => handleToggleRuleActive(rule)}
                                className={`px-3 py-1 text-xs font-bold rounded-full ${
                                  rule.is_active
                                    ? 'bg-yellow-400 text-black'
                                    : 'bg-gray-200 text-gray-600'
                                }`}
                              >
                                {rule.is_active ? 'Active' : 'Inactive'}
                              </button>
                            </td>
                            <td className="px-6 py-4 text-right space-x-2">
                              <button
                                onClick={() => handleOpenEditModal(rule)}
                                className="px-4 py-2 text-sm font-medium text-black border border-black rounded-lg hover:bg-gray-100 transition-all"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleOpenDeleteConfirmation(rule)}
                                className="px-4 py-2 text-sm font-medium text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition-all"
                              >
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
            </>
          )}
        </div>
      </div>

      {/* Create/Edit Rule Modal */}
      {ruleModal.isOpen && ruleModal.ruleData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900">
                {ruleModal.mode === 'create' ? 'Create Pricing Rule' : 'Edit Pricing Rule'}
              </h3>
            </div>

            <div className="p-6 space-y-6">
              {/* Service Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Service (Optional - leave blank for global rule)
                </label>
                <select
                  value={ruleModal.ruleData.service_id || ''}
                  onChange={(e) =>
                    setRuleModal(prev => ({
                      ...prev,
                      ruleData: { ...prev.ruleData!, service_id: e.target.value || null },
                    }))
                  }
                  disabled={ruleModal.mode === 'edit'}
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 transition-all disabled:bg-gray-100"
                >
                  <option value="">Global Rule (All Services)</option>
                  {services.map(service => (
                    <option key={service.id} value={service.id}>
                      {service.name} ({service.category_name})
                    </option>
                  ))}
                </select>
              </div>

              {/* Rule Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Rule Type
                </label>
                <select
                  value={ruleModal.ruleData.rule_type}
                  onChange={(e) =>
                    setRuleModal(prev => ({
                      ...prev,
                      ruleData: {
                        ...prev.ruleData!,
                        rule_type: e.target.value as PricingRule['rule_type'],
                      },
                    }))
                  }
                  disabled={ruleModal.mode === 'edit'}
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 transition-all disabled:bg-gray-100"
                >
                  <option value="VOLUME_DISCOUNT">Volume Discount</option>
                  <option value="RUSH_FEE">Rush Fee</option>
                  <option value="SEASONAL_PROMOTION">Seasonal Promotion</option>
                  <option value="CUSTOM">Custom Rule</option>
                </select>
              </div>

              {/* Rule Configuration */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Rule Configuration (JSON)
                </label>
                <textarea
                  value={JSON.stringify(ruleModal.ruleData.rule_config, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      setRuleModal(prev => ({
                        ...prev,
                        ruleData: { ...prev.ruleData!, rule_config: parsed },
                      }));
                    } catch {
                      // Invalid JSON, don't update
                    }
                  }}
                  rows={10}
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 font-mono text-sm transition-all"
                  placeholder='{"discount_percentage": 10, "min_quantity": 100}'
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter rule configuration as valid JSON
                </p>
              </div>

              {/* Active Status */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="rule_active"
                  checked={ruleModal.ruleData.is_active}
                  onChange={(e) =>
                    setRuleModal(prev => ({
                      ...prev,
                      ruleData: { ...prev.ruleData!, is_active: e.target.checked },
                    }))
                  }
                  className="w-5 h-5 text-yellow-400 border-gray-300 rounded focus:ring-yellow-400"
                />
                <label htmlFor="rule_active" className="ml-3 text-sm font-medium text-gray-900">
                  Rule is active
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-4">
              <button
                onClick={handleCloseModal}
                className="px-6 py-3 text-black border-2 border-black rounded-lg font-medium hover:bg-gray-100 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRule}
                disabled={createRuleMutation.isPending || updateRuleMutation.isPending}
                className="px-6 py-3 bg-yellow-400 text-black font-bold rounded-lg hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {createRuleMutation.isPending || updateRuleMutation.isPending
                  ? 'Saving...'
                  : ruleModal.mode === 'create'
                  ? 'Create Rule'
                  : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmation.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Confirm Delete</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete the pricing rule for{' '}
              <strong>{deleteConfirmation.ruleName}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setDeleteConfirmation({ isOpen: false, ruleId: null, ruleName: null })}
                className="px-6 py-3 text-black border-2 border-black rounded-lg font-medium hover:bg-gray-100 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteRuleMutation.isPending}
                className="px-6 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {deleteRuleMutation.isPending ? 'Deleting...' : 'Delete Rule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UV_PricingManagement;