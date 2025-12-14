import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface User {
  id: string;
  email: string;
  name: string;
  role: 'CUSTOMER' | 'STAFF' | 'ADMIN';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  created_at: string;
  updated_at: string;
}

interface StaffProfile {
  id: string;
  user_id: string;
  department: string | null;
  permissions: Record<string, boolean> | null;
  created_at: string;
  updated_at: string;
}

interface ProfileResponse {
  user: User;
  staff_profile?: StaffProfile;
}

interface UpdateProfilePayload {
  name: string;
  email: string;
  phone?: string;
}

interface NotificationPreferences {
  job_assignments: boolean;
  customer_messages: boolean;
  order_updates: boolean;
  proof_requests: boolean;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchStaffProfile = async (authToken: string): Promise<ProfileResponse> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/users/me`,
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    }
  );
  return response.data;
};

const updateProfile = async (
  payload: UpdateProfilePayload,
  authToken: string
): Promise<ProfileResponse> => {
  const response = await axios.put(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/users/me`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_StaffProfile: React.FC = () => {
  // ========================================================================
  // ZUSTAND STATE ACCESS (Individual selectors to prevent infinite loops)
  // ========================================================================
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const updateUserProfile = useAppStore(state => state.update_user_profile);

  // ========================================================================
  // LOCAL STATE
  // ========================================================================
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });

  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>({
    job_assignments: true,
    customer_messages: true,
    order_updates: true,
    proof_requests: true,
  });

  const [passwordChangeMode, setPasswordChangeMode] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ========================================================================
  // REACT QUERY SETUP
  // ========================================================================
  const queryClient = useQueryClient();

  // Fetch staff profile data
  const {
    data: profileData,
    isLoading: isLoadingProfile,
    error: profileError,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: ['staffProfile', authToken],
    queryFn: () => fetchStaffProfile(authToken!),
    enabled: !!authToken,
    staleTime: 60000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (payload: UpdateProfilePayload) => updateProfile(payload, authToken!),
    onSuccess: (data) => {
      // Update global state
      updateUserProfile(
        data.user,
        undefined,
        data.staff_profile
      );

      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['staffProfile'] });

      // Show success message
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (error: any) => {
      console.error('Profile update error:', error);
    },
  });

  // ========================================================================
  // EFFECTS
  // ========================================================================

  // Populate form when profile data loads
  useEffect(() => {
    if (profileData?.user) {
      setFormData({
        name: profileData.user.name || '',
        email: profileData.user.email || '',
        phone: (profileData.staff_profile as any)?.phone || '',
      });

      // Load notification preferences from staff_profile.permissions
      if (profileData.staff_profile?.permissions) {
        setNotificationPreferences({
          job_assignments: profileData.staff_profile.permissions.job_assignments ?? true,
          customer_messages: profileData.staff_profile.permissions.customer_messages ?? true,
          order_updates: profileData.staff_profile.permissions.order_updates ?? true,
          proof_requests: profileData.staff_profile.permissions.proof_requests ?? true,
        });
      }
    }
  }, [profileData]);

  // ========================================================================
  // EVENT HANDLERS
  // ========================================================================

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleNotificationChange = (key: keyof NotificationPreferences) => {
    setNotificationPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();

    const payload: UpdateProfilePayload = {
      name: formData.name,
      email: formData.email,
      ...(formData.phone && { phone: formData.phone }),
    };

    updateProfileMutation.mutate(payload);
  };

  const handleSaveNotifications = () => {
    // Note: This would need backend endpoint to save to staff_profile.permissions
    // For now, show informational message
    setSuccessMessage('Notification preferences saved locally. Backend integration pending.');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // ========================================================================
  // LOADING & ERROR STATES
  // ========================================================================

  if (!authToken) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-lg font-bold text-red-900 mb-2">Authentication Required</h2>
            <p className="text-red-700 text-sm">
              You must be logged in to access your profile. Please log in and try again.
            </p>
          </div>
        </div>
      </>
    );
  }

  if (isLoadingProfile) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
                <div className="space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                  <div className="h-4 bg-gray-200 rounded w-4/6"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (profileError) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h2 className="text-lg font-bold text-red-900 mb-2">Error Loading Profile</h2>
              <p className="text-red-700 text-sm mb-4">
                Failed to load your profile data. Please try again.
              </p>
              <button
                onClick={() => refetchProfile()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ========================================================================
  // MAIN RENDER
  // ========================================================================

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Staff Profile</h1>
            <p className="mt-2 text-base text-gray-600">
              Manage your account information and notification preferences
            </p>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-700 font-medium text-sm">{successMessage}</p>
            </div>
          )}

          {/* Profile Information Section */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 px-8 py-6">
              <h2 className="text-xl font-bold text-white">Profile Information</h2>
              <p className="text-gray-300 text-sm mt-1">
                Update your personal details
              </p>
            </div>

            <form onSubmit={handleSaveProfile} className="p-8 space-y-6">
              {/* Name Field */}
              <div>
                <label htmlFor="name" className="block text-sm font-bold text-gray-900 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 transition-all text-gray-900"
                  placeholder="Enter your full name"
                />
              </div>

              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-bold text-gray-900 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 transition-all text-gray-900"
                  placeholder="your.email@example.com"
                />
              </div>

              {/* Phone Field */}
              <div>
                <label htmlFor="phone" className="block text-sm font-bold text-gray-900 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  maxLength={50}
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 transition-all text-gray-900"
                  placeholder="+353 87 123 4567"
                />
              </div>

              {/* Department (Read-Only) */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Department
                </label>
                <div className="inline-flex items-center px-4 py-2 rounded-lg bg-gray-100 border border-gray-300">
                  <span className="text-sm font-medium text-gray-900">
                    {profileData?.staff_profile?.department || 'Not Assigned'}
                  </span>
                  <span className="ml-2 text-xs text-gray-500">(Admin controlled)</span>
                </div>
              </div>

              {/* Error Message */}
              {updateProfileMutation.isError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-700 text-sm">
                    Failed to update profile. Please try again.
                  </p>
                </div>
              )}

              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="px-6 py-3 bg-yellow-400 text-gray-900 rounded-lg font-bold hover:bg-yellow-500 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updateProfileMutation.isPending ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </span>
                  ) : (
                    'Save Profile'
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Password Change Section */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 px-8 py-6">
              <h2 className="text-xl font-bold text-white">Password & Security</h2>
              <p className="text-gray-300 text-sm mt-1">
                Manage your password settings
              </p>
            </div>

            <div className="p-8">
              <button
                onClick={() => setPasswordChangeMode(!passwordChangeMode)}
                className="flex items-center justify-between w-full px-4 py-3 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors border border-gray-300"
              >
                <span className="font-bold text-gray-900">Change Password</span>
                <svg
                  className={`w-5 h-5 text-gray-600 transition-transform ${passwordChangeMode ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {passwordChangeMode && (
                <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                  <div className="flex items-start">
                    <svg className="w-6 h-6 text-yellow-600 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h3 className="font-bold text-yellow-900 mb-1">Backend Integration Pending</h3>
                      <p className="text-yellow-800 text-sm">
                        The password change functionality requires a backend endpoint (<code className="bg-yellow-100 px-1 rounded">POST /auth/change-password</code>) which is not yet implemented. Please contact your system administrator to change your password.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notification Preferences Section */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 px-8 py-6">
              <h2 className="text-xl font-bold text-white">Notification Preferences</h2>
              <p className="text-gray-300 text-sm mt-1">
                Choose which notifications you want to receive
              </p>
            </div>

            <div className="p-8 space-y-6">
              {/* Job Assignments */}
              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="job_assignments"
                  checked={notificationPreferences.job_assignments}
                  onChange={() => handleNotificationChange('job_assignments')}
                  className="mt-1 h-5 w-5 rounded border-gray-300 text-yellow-400 focus:ring-yellow-400 focus:ring-offset-0"
                />
                <label htmlFor="job_assignments" className="ml-3">
                  <span className="block font-bold text-gray-900">Job Assignments</span>
                  <span className="block text-sm text-gray-600 mt-1">
                    Receive notifications when new jobs are assigned to you
                  </span>
                </label>
              </div>

              {/* Customer Messages */}
              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="customer_messages"
                  checked={notificationPreferences.customer_messages}
                  onChange={() => handleNotificationChange('customer_messages')}
                  className="mt-1 h-5 w-5 rounded border-gray-300 text-yellow-400 focus:ring-yellow-400 focus:ring-offset-0"
                />
                <label htmlFor="customer_messages" className="ml-3">
                  <span className="block font-bold text-gray-900">Customer Messages</span>
                  <span className="block text-sm text-gray-600 mt-1">
                    Get alerts when customers send messages related to their orders
                  </span>
                </label>
              </div>

              {/* Order Updates */}
              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="order_updates"
                  checked={notificationPreferences.order_updates}
                  onChange={() => handleNotificationChange('order_updates')}
                  className="mt-1 h-5 w-5 rounded border-gray-300 text-yellow-400 focus:ring-yellow-400 focus:ring-offset-0"
                />
                <label htmlFor="order_updates" className="ml-3">
                  <span className="block font-bold text-gray-900">Order Updates</span>
                  <span className="block text-sm text-gray-600 mt-1">
                    Receive notifications about status changes on assigned orders
                  </span>
                </label>
              </div>

              {/* Proof Requests */}
              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="proof_requests"
                  checked={notificationPreferences.proof_requests}
                  onChange={() => handleNotificationChange('proof_requests')}
                  className="mt-1 h-5 w-5 rounded border-gray-300 text-yellow-400 focus:ring-yellow-400 focus:ring-offset-0"
                />
                <label htmlFor="proof_requests" className="ml-3">
                  <span className="block font-bold text-gray-900">Proof Requests</span>
                  <span className="block text-sm text-gray-600 mt-1">
                    Get alerts when customers request changes or approve proofs
                  </span>
                </label>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-blue-800 text-sm">
                    <strong className="font-bold">Note:</strong> Notification preferences are currently saved locally. Backend integration for persisting these settings to <code className="bg-blue-100 px-1 rounded">staff_profile.permissions</code> is pending.
                  </p>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4">
                <button
                  onClick={handleSaveNotifications}
                  className="px-6 py-3 bg-yellow-400 text-gray-900 rounded-lg font-bold hover:bg-yellow-500 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Save Preferences
                </button>
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Account Information</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-sm text-gray-600">Account Status</span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
                  {profileData?.user?.status || 'ACTIVE'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-sm text-gray-600">Role</span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-800">
                  {profileData?.user?.role || 'STAFF'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Account Created</span>
                <span className="text-sm font-medium text-gray-900">
                  {profileData?.user?.created_at
                    ? new Date(profileData.user.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_StaffProfile;