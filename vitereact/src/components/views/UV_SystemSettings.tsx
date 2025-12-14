import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface CompanyInfo {
  name: string;
  email: string;
  phone: string;
  address: string | null;
}

interface FeatureFlags {
  b2b_accounts: boolean;
  inventory_management: boolean;
  analytics_dashboard: boolean;
  sla_scheduling: boolean;
}

interface StripeConfig {
  enabled: boolean;
  test_mode: boolean;
  publishable_key: string;
  secret_key: string;
}

interface EmailSettings {
  smtp_enabled: boolean;
  smtp_host: string;
  smtp_port: number;
  notification_templates: Record<string, any>;
}

interface SecuritySettings {
  rate_limit_requests_per_minute: number;
  audit_log_retention_days: number;
}

interface SystemSetting {
  id: string;
  key: string;
  value: any;
  updated_at: string;
}

interface SystemSettingsResponse {
  settings: SystemSetting[];
}

type SectionKey = 'company_info' | 'feature_flags' | 'payments' | 'email' | 'security';

interface Notification {
  type: 'success' | 'error';
  message: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_SystemSettings: React.FC = () => {
  // ========================================================================
  // GLOBAL STATE (Individual selectors - CRITICAL)
  // ========================================================================
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const loadSystemConfig = useAppStore(state => state.load_system_config);
  const loadFeatureFlags = useAppStore(state => state.load_feature_flags);

  // ========================================================================
  // LOCAL STATE
  // ========================================================================
  const [activeSection, setActiveSection] = useState<SectionKey>('company_info');
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: '',
    email: '',
    phone: '',
    address: null
  });
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags>({
    b2b_accounts: false,
    inventory_management: false,
    analytics_dashboard: false,
    sla_scheduling: false
  });
  const [stripeConfig, setStripeConfig] = useState<StripeConfig>({
    enabled: false,
    test_mode: true,
    publishable_key: '',
    secret_key: ''
  });
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    smtp_enabled: false,
    smtp_host: '',
    smtp_port: 587,
    notification_templates: {}
  });
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    rate_limit_requests_per_minute: 60,
    audit_log_retention_days: 90
  });
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({});
  const [notification, setNotification] = useState<Notification | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState<{
    show: boolean;
    action: string;
    callback: () => void;
  }>({
    show: false,
    action: '',
    callback: () => {}
  });

  const queryClient = useQueryClient();

  // ========================================================================
  // API CALLS
  // ========================================================================

  // Fetch system settings
  const { isLoading: isLoadingSettings } = useQuery({
    queryKey: ['systemSettings'],
    queryFn: async () => {
      const response = await axios.get<SystemSettingsResponse>(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/system-settings`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        }
      );
      return response.data;
    },
    enabled: !!authToken,
    staleTime: 5 * 60 * 1000,
    onSuccess: (data) => {
      // Parse settings array to categorized objects
      const companyInfoSetting = data.settings.find(s => s.key === 'company_info');
      const featureFlagsSetting = data.settings.find(s => s.key === 'feature_flags');
      const stripeConfigSetting = data.settings.find(s => s.key === 'stripe_config');
      const emailSettingsSetting = data.settings.find(s => s.key === 'email_settings');
      const securitySettingsSetting = data.settings.find(s => s.key === 'security_settings');

      if (companyInfoSetting) {
        setCompanyInfo(companyInfoSetting.value);
      }
      if (featureFlagsSetting) {
        setFeatureFlags(featureFlagsSetting.value);
      }
      if (stripeConfigSetting) {
        setStripeConfig(stripeConfigSetting.value);
      }
      if (emailSettingsSetting) {
        setEmailSettings(emailSettingsSetting.value);
      }
      if (securitySettingsSetting) {
        setSecuritySettings(securitySettingsSetting.value);
      }
    }
  });

  // Update system setting mutation
  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const response = await axios.put(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/system-settings/${key}`,
        { value },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['systemSettings'] });
      
      // Update global state if necessary
      if (variables.key === 'feature_flags') {
        loadFeatureFlags(variables.value);
      } else if (variables.key === 'company_info' || variables.key === 'stripe_config') {
        loadSystemConfig({
          ...(variables.key === 'company_info' && { company_info: variables.value }),
          ...(variables.key === 'stripe_config' && { stripe_enabled: variables.value.enabled })
        });
      }

      setNotification({
        type: 'success',
        message: 'Settings saved successfully'
      });
      setTimeout(() => setNotification(null), 3000);
      setSaveErrors({});
    },
    onError: (error: any) => {
      setNotification({
        type: 'error',
        message: error.response?.data?.message || 'Failed to save settings'
      });
      setTimeout(() => setNotification(null), 5000);
    }
  });

  // ========================================================================
  // HANDLERS
  // ========================================================================

  const handleSaveCompanyInfo = () => {
    // Validate
    const errors: Record<string, string> = {};
    if (!companyInfo.name.trim()) {
      errors.name = 'Company name is required';
    }
    if (!companyInfo.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyInfo.email)) {
      errors.email = 'Invalid email format';
    }
    if (!companyInfo.phone.trim()) {
      errors.phone = 'Phone is required';
    }

    if (Object.keys(errors).length > 0) {
      setSaveErrors(errors);
      return;
    }

    updateSettingMutation.mutate({
      key: 'company_info',
      value: companyInfo
    });
  };

  const handleToggleFeatureFlag = (flag: keyof FeatureFlags) => {
    const newValue = !featureFlags[flag];
    setShowConfirmDialog({
      show: true,
      action: `${newValue ? 'Enable' : 'Disable'} ${flag.replace(/_/g, ' ')}?`,
      callback: () => {
        const updatedFlags = { ...featureFlags, [flag]: newValue };
        setFeatureFlags(updatedFlags);
        updateSettingMutation.mutate({
          key: 'feature_flags',
          value: updatedFlags
        });
        setShowConfirmDialog({ show: false, action: '', callback: () => {} });
      }
    });
  };

  const handleSaveStripeConfig = () => {
    // Validate
    const errors: Record<string, string> = {};
    if (stripeConfig.enabled) {
      if (!stripeConfig.publishable_key.trim()) {
        errors.publishable_key = 'Publishable key is required';
      }
      if (!stripeConfig.secret_key.trim()) {
        errors.secret_key = 'Secret key is required';
      }
    }

    if (Object.keys(errors).length > 0) {
      setSaveErrors(errors);
      return;
    }

    // Confirm if switching to live mode
    if (stripeConfig.enabled && !stripeConfig.test_mode) {
      setShowConfirmDialog({
        show: true,
        action: 'Switch to LIVE payment mode? This will process real transactions.',
        callback: () => {
          updateSettingMutation.mutate({
            key: 'stripe_config',
            value: stripeConfig
          });
          setShowConfirmDialog({ show: false, action: '', callback: () => {} });
        }
      });
    } else {
      updateSettingMutation.mutate({
        key: 'stripe_config',
        value: stripeConfig
      });
    }
  };

  const handleSaveEmailSettings = () => {
    // Validate
    const errors: Record<string, string> = {};
    if (emailSettings.smtp_enabled) {
      if (!emailSettings.smtp_host.trim()) {
        errors.smtp_host = 'SMTP host is required';
      }
      if (emailSettings.smtp_port < 1 || emailSettings.smtp_port > 65535) {
        errors.smtp_port = 'Invalid port number';
      }
    }

    if (Object.keys(errors).length > 0) {
      setSaveErrors(errors);
      return;
    }

    updateSettingMutation.mutate({
      key: 'email_settings',
      value: emailSettings
    });
  };

  const handleSaveSecuritySettings = () => {
    // Validate
    const errors: Record<string, string> = {};
    if (securitySettings.rate_limit_requests_per_minute < 1) {
      errors.rate_limit = 'Rate limit must be at least 1';
    }
    if (securitySettings.audit_log_retention_days < 1) {
      errors.audit_retention = 'Retention period must be at least 1 day';
    }

    if (Object.keys(errors).length > 0) {
      setSaveErrors(errors);
      return;
    }

    updateSettingMutation.mutate({
      key: 'security_settings',
      value: securitySettings
    });
  };

  const maskSecretKey = (key: string): string => {
    if (!key) return '';
    if (key.length <= 4) return '••••';
    return '••••••••' + key.slice(-4);
  };

  // ========================================================================
  // RENDER
  // ========================================================================

  if (isLoadingSettings) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-yellow-400"></div>
            <p className="text-gray-900 text-lg font-medium">Loading settings...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
            <p className="mt-2 text-gray-600">Manage global system configuration and feature flags</p>
          </div>
        </div>

        {/* Notification Banner */}
        {notification && (
          <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg ${
            notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}>
            <p className="font-medium">{notification.message}</p>
          </div>
        )}

        {/* Confirmation Dialog */}
        {showConfirmDialog.show && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Confirm Action</h3>
              <p className="text-gray-600 mb-6">{showConfirmDialog.action}</p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowConfirmDialog({ show: false, action: '', callback: () => {} })}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={showConfirmDialog.callback}
                  className="px-4 py-2 text-white bg-yellow-400 rounded-lg hover:bg-yellow-500 transition-colors font-medium"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Section Navigation */}
            <div className="lg:w-64 flex-shrink-0">
              <nav className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <button
                  onClick={() => setActiveSection('company_info')}
                  className={`w-full text-left px-6 py-4 border-l-4 ${
                    activeSection === 'company_info'
                      ? 'border-yellow-400 bg-yellow-50 text-gray-900 font-semibold'
                      : 'border-transparent hover:bg-gray-50 text-gray-700'
                  } transition-all`}
                >
                  Company Information
                </button>
                <button
                  onClick={() => setActiveSection('feature_flags')}
                  className={`w-full text-left px-6 py-4 border-l-4 ${
                    activeSection === 'feature_flags'
                      ? 'border-yellow-400 bg-yellow-50 text-gray-900 font-semibold'
                      : 'border-transparent hover:bg-gray-50 text-gray-700'
                  } transition-all`}
                >
                  Feature Flags
                  <span className="ml-2 text-xs bg-yellow-400 text-black px-2 py-1 rounded">Phase 2</span>
                </button>
                <button
                  onClick={() => setActiveSection('payments')}
                  className={`w-full text-left px-6 py-4 border-l-4 ${
                    activeSection === 'payments'
                      ? 'border-yellow-400 bg-yellow-50 text-gray-900 font-semibold'
                      : 'border-transparent hover:bg-gray-50 text-gray-700'
                  } transition-all`}
                >
                  Payment Settings
                </button>
                <button
                  onClick={() => setActiveSection('email')}
                  className={`w-full text-left px-6 py-4 border-l-4 ${
                    activeSection === 'email'
                      ? 'border-yellow-400 bg-yellow-50 text-gray-900 font-semibold'
                      : 'border-transparent hover:bg-gray-50 text-gray-700'
                  } transition-all`}
                >
                  Email Settings
                </button>
                <button
                  onClick={() => setActiveSection('security')}
                  className={`w-full text-left px-6 py-4 border-l-4 ${
                    activeSection === 'security'
                      ? 'border-yellow-400 bg-yellow-50 text-gray-900 font-semibold'
                      : 'border-transparent hover:bg-gray-50 text-gray-700'
                  } transition-all`}
                >
                  Security
                </button>
              </nav>
            </div>

            {/* Settings Content */}
            <div className="flex-1">
              {/* Company Information */}
              {activeSection === 'company_info' && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Company Information</h2>
                  <div className="space-y-6">
                    <div>
                      <label htmlFor="company_name" className="block text-sm font-bold text-gray-900 mb-2">
                        Company Name *
                      </label>
                      <input
                        id="company_name"
                        type="text"
                        value={companyInfo.name}
                        onChange={(e) => {
                          setCompanyInfo({ ...companyInfo, name: e.target.value });
                          setSaveErrors({ ...saveErrors, name: '' });
                        }}
                        className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-4 focus:ring-yellow-100 ${
                          saveErrors.name ? 'border-red-500' : 'border-gray-200 focus:border-black'
                        }`}
                        placeholder="SultanStamp"
                      />
                      {saveErrors.name && (
                        <p className="mt-1 text-sm text-red-600">{saveErrors.name}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="company_email" className="block text-sm font-bold text-gray-900 mb-2">
                        Email *
                      </label>
                      <input
                        id="company_email"
                        type="email"
                        value={companyInfo.email}
                        onChange={(e) => {
                          setCompanyInfo({ ...companyInfo, email: e.target.value });
                          setSaveErrors({ ...saveErrors, email: '' });
                        }}
                        className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-4 focus:ring-yellow-100 ${
                          saveErrors.email ? 'border-red-500' : 'border-gray-200 focus:border-black'
                        }`}
                        placeholder="info@sultanstamp.com"
                      />
                      {saveErrors.email && (
                        <p className="mt-1 text-sm text-red-600">{saveErrors.email}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="company_phone" className="block text-sm font-bold text-gray-900 mb-2">
                        Phone *
                      </label>
                      <input
                        id="company_phone"
                        type="tel"
                        value={companyInfo.phone}
                        onChange={(e) => {
                          setCompanyInfo({ ...companyInfo, phone: e.target.value });
                          setSaveErrors({ ...saveErrors, phone: '' });
                        }}
                        className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-4 focus:ring-yellow-100 ${
                          saveErrors.phone ? 'border-red-500' : 'border-gray-200 focus:border-black'
                        }`}
                        placeholder="+353 87 470 0356"
                      />
                      {saveErrors.phone && (
                        <p className="mt-1 text-sm text-red-600">{saveErrors.phone}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="company_address" className="block text-sm font-bold text-gray-900 mb-2">
                        Address (Optional)
                      </label>
                      <textarea
                        id="company_address"
                        value={companyInfo.address || ''}
                        onChange={(e) => setCompanyInfo({ ...companyInfo, address: e.target.value || null })}
                        rows={3}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-yellow-100 focus:border-black"
                        placeholder="Dublin, Ireland"
                      />
                    </div>

                    <button
                      onClick={handleSaveCompanyInfo}
                      disabled={updateSettingMutation.isLoading}
                      className="px-6 py-3 bg-yellow-400 text-black font-bold rounded-lg hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updateSettingMutation.isLoading ? 'Saving...' : 'Save Company Information'}
                    </button>
                  </div>
                </div>
              )}

              {/* Feature Flags */}
              {activeSection === 'feature_flags' && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Phase 2 Feature Flags</h2>
                  <p className="text-gray-600 mb-6">Enable or disable advanced features (Phase 2)</p>
                  
                  <div className="space-y-4">
                    {/* B2B Accounts */}
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <h3 className="font-semibold text-gray-900">B2B Accounts Management</h3>
                        <p className="text-sm text-gray-600">Enable corporate account management with contract pricing</p>
                      </div>
                      <button
                        onClick={() => handleToggleFeatureFlag('b2b_accounts')}
                        className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
                          featureFlags.b2b_accounts ? 'bg-yellow-400' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                            featureFlags.b2b_accounts ? 'translate-x-9' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Inventory Management */}
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <h3 className="font-semibold text-gray-900">Inventory Management</h3>
                        <p className="text-sm text-gray-600">Track materials, consumption rules, and purchase orders</p>
                      </div>
                      <button
                        onClick={() => handleToggleFeatureFlag('inventory_management')}
                        className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
                          featureFlags.inventory_management ? 'bg-yellow-400' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                            featureFlags.inventory_management ? 'translate-x-9' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Analytics Dashboard */}
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <h3 className="font-semibold text-gray-900">Analytics Dashboard</h3>
                        <p className="text-sm text-gray-600">Business intelligence with conversion funnels and reports</p>
                      </div>
                      <button
                        onClick={() => handleToggleFeatureFlag('analytics_dashboard')}
                        className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
                          featureFlags.analytics_dashboard ? 'bg-yellow-400' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                            featureFlags.analytics_dashboard ? 'translate-x-9' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {/* SLA Scheduling */}
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <h3 className="font-semibold text-gray-900">SLA Scheduling</h3>
                        <p className="text-sm text-gray-600">Priority scheduling with SLA timers and breach alerts</p>
                      </div>
                      <button
                        onClick={() => handleToggleFeatureFlag('sla_scheduling')}
                        className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
                          featureFlags.sla_scheduling ? 'bg-yellow-400' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                            featureFlags.sla_scheduling ? 'translate-x-9' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Settings */}
              {activeSection === 'payments' && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Payment Integration (Stripe)</h2>
                  
                  <div className="space-y-6">
                    {/* Stripe Enabled Toggle */}
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <h3 className="font-semibold text-gray-900">Enable Stripe Payments</h3>
                        <p className="text-sm text-gray-600">Accept online payments via Stripe</p>
                      </div>
                      <button
                        onClick={() => setStripeConfig({ ...stripeConfig, enabled: !stripeConfig.enabled })}
                        className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
                          stripeConfig.enabled ? 'bg-yellow-400' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                            stripeConfig.enabled ? 'translate-x-9' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {stripeConfig.enabled && (
                      <>
                        {/* Test Mode Toggle */}
                        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-yellow-50">
                          <div>
                            <h3 className="font-semibold text-gray-900">Test Mode</h3>
                            <p className="text-sm text-gray-600">Use test API keys (no real charges)</p>
                          </div>
                          <button
                            onClick={() => setStripeConfig({ ...stripeConfig, test_mode: !stripeConfig.test_mode })}
                            className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
                              stripeConfig.test_mode ? 'bg-yellow-400' : 'bg-red-600'
                            }`}
                          >
                            <span
                              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                                stripeConfig.test_mode ? 'translate-x-9' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>

                        {!stripeConfig.test_mode && (
                          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-700 font-semibold">⚠️ Live Mode: Real transactions will be processed</p>
                          </div>
                        )}

                        <div>
                          <label htmlFor="publishable_key" className="block text-sm font-bold text-gray-900 mb-2">
                            Publishable Key *
                          </label>
                          <input
                            id="publishable_key"
                            type="text"
                            value={stripeConfig.publishable_key}
                            onChange={(e) => {
                              setStripeConfig({ ...stripeConfig, publishable_key: e.target.value });
                              setSaveErrors({ ...saveErrors, publishable_key: '' });
                            }}
                            className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-4 focus:ring-yellow-100 font-mono text-sm ${
                              saveErrors.publishable_key ? 'border-red-500' : 'border-gray-200 focus:border-black'
                            }`}
                            placeholder="pk_test_..."
                          />
                          {saveErrors.publishable_key && (
                            <p className="mt-1 text-sm text-red-600">{saveErrors.publishable_key}</p>
                          )}
                        </div>

                        <div>
                          <label htmlFor="secret_key" className="block text-sm font-bold text-gray-900 mb-2">
                            Secret Key *
                          </label>
                          <input
                            id="secret_key"
                            type="password"
                            value={stripeConfig.secret_key}
                            onChange={(e) => {
                              setStripeConfig({ ...stripeConfig, secret_key: e.target.value });
                              setSaveErrors({ ...saveErrors, secret_key: '' });
                            }}
                            className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-4 focus:ring-yellow-100 font-mono text-sm ${
                              saveErrors.secret_key ? 'border-red-500' : 'border-gray-200 focus:border-black'
                            }`}
                            placeholder="sk_test_..."
                          />
                          {saveErrors.secret_key && (
                            <p className="mt-1 text-sm text-red-600">{saveErrors.secret_key}</p>
                          )}
                          {stripeConfig.secret_key && (
                            <p className="mt-1 text-xs text-gray-500">Stored securely: {maskSecretKey(stripeConfig.secret_key)}</p>
                          )}
                        </div>
                      </>
                    )}

                    <button
                      onClick={handleSaveStripeConfig}
                      disabled={updateSettingMutation.isLoading}
                      className="px-6 py-3 bg-yellow-400 text-black font-bold rounded-lg hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updateSettingMutation.isLoading ? 'Saving...' : 'Save Payment Settings'}
                    </button>
                  </div>
                </div>
              )}

              {/* Email Settings */}
              {activeSection === 'email' && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Email & Notifications</h2>
                  
                  <div className="space-y-6">
                    {/* SMTP Enabled Toggle */}
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <h3 className="font-semibold text-gray-900">Enable SMTP</h3>
                        <p className="text-sm text-gray-600">Send email notifications via SMTP server</p>
                      </div>
                      <button
                        onClick={() => setEmailSettings({ ...emailSettings, smtp_enabled: !emailSettings.smtp_enabled })}
                        className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
                          emailSettings.smtp_enabled ? 'bg-yellow-400' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                            emailSettings.smtp_enabled ? 'translate-x-9' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {emailSettings.smtp_enabled && (
                      <>
                        <div>
                          <label htmlFor="smtp_host" className="block text-sm font-bold text-gray-900 mb-2">
                            SMTP Host *
                          </label>
                          <input
                            id="smtp_host"
                            type="text"
                            value={emailSettings.smtp_host}
                            onChange={(e) => {
                              setEmailSettings({ ...emailSettings, smtp_host: e.target.value });
                              setSaveErrors({ ...saveErrors, smtp_host: '' });
                            }}
                            className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-4 focus:ring-yellow-100 ${
                              saveErrors.smtp_host ? 'border-red-500' : 'border-gray-200 focus:border-black'
                            }`}
                            placeholder="smtp.gmail.com"
                          />
                          {saveErrors.smtp_host && (
                            <p className="mt-1 text-sm text-red-600">{saveErrors.smtp_host}</p>
                          )}
                        </div>

                        <div>
                          <label htmlFor="smtp_port" className="block text-sm font-bold text-gray-900 mb-2">
                            SMTP Port *
                          </label>
                          <input
                            id="smtp_port"
                            type="number"
                            value={emailSettings.smtp_port}
                            onChange={(e) => {
                              setEmailSettings({ ...emailSettings, smtp_port: parseInt(e.target.value) || 587 });
                              setSaveErrors({ ...saveErrors, smtp_port: '' });
                            }}
                            className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-4 focus:ring-yellow-100 ${
                              saveErrors.smtp_port ? 'border-red-500' : 'border-gray-200 focus:border-black'
                            }`}
                            placeholder="587"
                          />
                          {saveErrors.smtp_port && (
                            <p className="mt-1 text-sm text-red-600">{saveErrors.smtp_port}</p>
                          )}
                        </div>
                      </>
                    )}

                    <button
                      onClick={handleSaveEmailSettings}
                      disabled={updateSettingMutation.isLoading}
                      className="px-6 py-3 bg-yellow-400 text-black font-bold rounded-lg hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updateSettingMutation.isLoading ? 'Saving...' : 'Save Email Settings'}
                    </button>
                  </div>
                </div>
              )}

              {/* Security Settings */}
              {activeSection === 'security' && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Security Configuration</h2>
                  
                  <div className="space-y-6">
                    <div>
                      <label htmlFor="rate_limit" className="block text-sm font-bold text-gray-900 mb-2">
                        Rate Limit (requests per minute)
                      </label>
                      <input
                        id="rate_limit"
                        type="number"
                        value={securitySettings.rate_limit_requests_per_minute}
                        onChange={(e) => {
                          setSecuritySettings({ ...securitySettings, rate_limit_requests_per_minute: parseInt(e.target.value) || 60 });
                          setSaveErrors({ ...saveErrors, rate_limit: '' });
                        }}
                        className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-4 focus:ring-yellow-100 ${
                          saveErrors.rate_limit ? 'border-red-500' : 'border-gray-200 focus:border-black'
                        }`}
                        placeholder="60"
                      />
                      {saveErrors.rate_limit && (
                        <p className="mt-1 text-sm text-red-600">{saveErrors.rate_limit}</p>
                      )}
                      <p className="mt-1 text-sm text-gray-600">Maximum API requests per minute per IP address</p>
                    </div>

                    <div>
                      <label htmlFor="audit_retention" className="block text-sm font-bold text-gray-900 mb-2">
                        Audit Log Retention (days)
                      </label>
                      <input
                        id="audit_retention"
                        type="number"
                        value={securitySettings.audit_log_retention_days}
                        onChange={(e) => {
                          setSecuritySettings({ ...securitySettings, audit_log_retention_days: parseInt(e.target.value) || 90 });
                          setSaveErrors({ ...saveErrors, audit_retention: '' });
                        }}
                        className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-4 focus:ring-yellow-100 ${
                          saveErrors.audit_retention ? 'border-red-500' : 'border-gray-200 focus:border-black'
                        }`}
                        placeholder="90"
                      />
                      {saveErrors.audit_retention && (
                        <p className="mt-1 text-sm text-red-600">{saveErrors.audit_retention}</p>
                      )}
                      <p className="mt-1 text-sm text-gray-600">Number of days to retain audit log entries</p>
                    </div>

                    <button
                      onClick={handleSaveSecuritySettings}
                      disabled={updateSettingMutation.isLoading}
                      className="px-6 py-3 bg-yellow-400 text-black font-bold rounded-lg hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updateSettingMutation.isLoading ? 'Saving...' : 'Save Security Settings'}
                    </button>
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

export default UV_SystemSettings;