import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/store/main';
import axios from 'axios';
import { User, Edit2, Lock, Save, X, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS (matching Zod schemas exactly)
// ============================================================================

interface UserData {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface CustomerProfile {
  id: string;
  user_id: string;
  phone: string | null;
  address: string | null;
  company_name: string | null;
  b2b_account_id: string | null;
  created_at: string;
  updated_at: string;
}

interface UserProfileResponse {
  user: UserData;
  customer_profile: CustomerProfile | null;
}

interface ProfileFormData {
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  company_name: string | null;
}

interface PasswordFormData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

interface Notification {
  type: 'success' | 'error';
  message: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_CustomerProfile: React.FC = () => {
  const queryClient = useQueryClient();

  // CRITICAL: Individual Zustand selectors (NO object destructuring)
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const updateUserProfile = useAppStore(state => state.update_user_profile);

  // Local state
  const [formData, setFormData] = useState<ProfileFormData>({
    name: '',
    email: '',
    phone: null,
    address: null,
    company_name: null,
  });
  const [originalFormData, setOriginalFormData] = useState<ProfileFormData>({
    name: '',
    email: '',
    phone: null,
    address: null,
    company_name: null,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState<PasswordFormData>({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [notification, setNotification] = useState<Notification | null>(null);

  // ============================================================================
  // API CALLS - QUERIES
  // ============================================================================

  // Fetch user profile
  const userProfileQuery = useQuery<UserProfileResponse>({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/users/me`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      return response.data;
    },
    enabled: !!authToken,
    staleTime: 60000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Initialize form data when profile is loaded
  useEffect(() => {
    if (userProfileQuery.data) {
      const { user, customer_profile } = userProfileQuery.data;
      const initialData: ProfileFormData = {
        name: user.name,
        email: user.email,
        phone: customer_profile?.phone || null,
        address: customer_profile?.address || null,
        company_name: customer_profile?.company_name || null,
      };
      setFormData(initialData);
      setOriginalFormData(initialData);
    }
  }, [userProfileQuery.data]);

  // ============================================================================
  // API CALLS - MUTATIONS
  // ============================================================================

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const response = await axios.put(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/users/me`,
        data,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    },
    onSuccess: (data: UserProfileResponse) => {
      // Update Zustand global state
      updateUserProfile(
        { 
          name: data.user.name, 
          email: data.user.email 
        },
        data.customer_profile ? {
          phone: data.customer_profile.phone,
          address: data.customer_profile.address,
          company_name: data.customer_profile.company_name,
        } : undefined
      );

      // Update local state
      const updatedData: ProfileFormData = {
        name: data.user.name,
        email: data.user.email,
        phone: data.customer_profile?.phone || null,
        address: data.customer_profile?.address || null,
        company_name: data.customer_profile?.company_name || null,
      };
      setFormData(updatedData);
      setOriginalFormData(updatedData);

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });

      // Show success notification
      setNotification({
        type: 'success',
        message: 'Profile updated successfully!',
      });

      // Exit edit mode
      setIsEditing(false);
      setValidationErrors({});
    },
    onError: (error: any) => {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Failed to update profile. Please try again.';

      setNotification({
        type: 'error',
        message: errorMessage,
      });
    },
  });

  // ============================================================================
  // VALIDATION FUNCTIONS
  // ============================================================================

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Name validation (required, min 1, max 255)
    if (!formData.name || formData.name.trim().length === 0) {
      errors.name = 'Name is required';
    } else if (formData.name.length > 255) {
      errors.name = 'Name must be less than 255 characters';
    }

    // Email validation (required, valid email, max 255)
    if (!formData.email || formData.email.trim().length === 0) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    } else if (formData.email.length > 255) {
      errors.email = 'Email must be less than 255 characters';
    }

    // Phone validation (optional, max 50)
    if (formData.phone && formData.phone.length > 50) {
      errors.phone = 'Phone must be less than 50 characters';
    }

    // Address validation (optional, max 500)
    if (formData.address && formData.address.length > 500) {
      errors.address = 'Address must be less than 500 characters';
    }

    // Company name validation (optional, max 255)
    if (formData.company_name && formData.company_name.length > 255) {
      errors.company_name = 'Company name must be less than 255 characters';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validatePasswordForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!passwordForm.current_password) {
      errors.current_password = 'Current password is required';
    }

    if (!passwordForm.new_password) {
      errors.new_password = 'New password is required';
    } else if (passwordForm.new_password.length < 8) {
      errors.new_password = 'Password must be at least 8 characters';
    } else if (passwordForm.new_password.length > 100) {
      errors.new_password = 'Password must be less than 100 characters';
    }

    if (!passwordForm.confirm_password) {
      errors.confirm_password = 'Please confirm your new password';
    } else if (passwordForm.new_password !== passwordForm.confirm_password) {
      errors.confirm_password = 'Passwords do not match';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value || null,
    }));
    // Clear error for this field when user starts editing
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handlePasswordInputChange = (field: keyof PasswordFormData, value: string) => {
    setPasswordForm(prev => ({
      ...prev,
      [field]: value,
    }));
    // Clear error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setValidationErrors({});
    setNotification(null);
  };

  const handleCancelEdit = () => {
    setFormData(originalFormData);
    setIsEditing(false);
    setValidationErrors({});
    setNotification(null);
  };

  const handleSaveProfile = () => {
    if (validateForm()) {
      updateProfileMutation.mutate(formData);
    }
  };

  const handleChangePasswordClick = () => {
    setIsChangingPassword(true);
    setPasswordForm({
      current_password: '',
      new_password: '',
      confirm_password: '',
    });
    setValidationErrors({});
  };

  const handleClosePasswordModal = () => {
    setIsChangingPassword(false);
    setPasswordForm({
      current_password: '',
      new_password: '',
      confirm_password: '',
    });
    setValidationErrors({});
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const handlePasswordChange = () => {
    if (validatePasswordForm()) {
      // MISSING BACKEND ENDPOINT - Show warning
      setNotification({
        type: 'error',
        message: 'Password change functionality requires backend implementation. Please contact support.',
      });
      handleClosePasswordModal();
    }
  };

  // Auto-dismiss success notifications after 3 seconds
  useEffect(() => {
    if (notification && notification.type === 'success') {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // ============================================================================
  // LOADING STATE
  // ============================================================================

  if (userProfileQuery.isLoading) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-black"></div>
            <p className="text-gray-700 text-lg font-medium">Loading profile...</p>
          </div>
        </div>
      </>
    );
  }

  // ============================================================================
  // ERROR STATE
  // ============================================================================

  if (userProfileQuery.isError) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-gray-200 p-8">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
              <h2 className="text-2xl font-bold text-gray-900">Error Loading Profile</h2>
            </div>
            <p className="text-gray-600 mb-6">
              Failed to load your profile information. Please try again.
            </p>
            <button
              onClick={() => userProfileQuery.refetch()}
              className="w-full px-6 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-all duration-200"
            >
              Retry
            </button>
          </div>
        </div>
      </>
    );
  }

  const userData = userProfileQuery.data?.user;
  const customerProfile = userProfileQuery.data?.customer_profile;

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">My Profile</h1>
            <p className="text-gray-600 text-base leading-relaxed">
              Manage your personal information and account settings
            </p>
          </div>

          {/* Notification */}
          {notification && (
            <div
              className={`mb-6 px-6 py-4 rounded-lg shadow-lg flex items-start gap-3 ${
                notification.type === 'success'
                  ? 'bg-green-600 text-white'
                  : 'bg-red-600 text-white'
              }`}
            >
              {notification.type === 'success' ? (
                <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <p className="font-medium">{notification.message}</p>
              </div>
              {notification.type === 'error' && (
                <button
                  onClick={() => setNotification(null)}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          )}

          {/* Profile Card */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Card Header */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 px-6 lg:px-8 py-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center">
                    <User className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{userData?.name}</h2>
                    <p className="text-sm text-gray-600">{userData?.email}</p>
                  </div>
                </div>
                {!isEditing && (
                  <button
                    onClick={handleEditClick}
                    className="px-6 py-3 bg-white border-2 border-black text-black rounded-lg font-semibold hover:bg-gray-50 transition-all duration-200 flex items-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Profile
                  </button>
                )}
              </div>
            </div>

            {/* Card Body */}
            <div className="px-6 lg:px-8 py-8 space-y-8">
              {/* Personal Information Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name Field */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-semibold text-gray-900 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      disabled={!isEditing}
                      className={`w-full px-4 py-3 rounded-lg border-2 ${
                        validationErrors.name
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-100'
                          : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                      } ${
                        isEditing
                          ? 'bg-white text-gray-900'
                          : 'bg-gray-50 text-gray-600 cursor-not-allowed'
                      } focus:outline-none focus:ring-4 transition-all duration-200`}
                    />
                    {validationErrors.name && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {validationErrors.name}
                      </p>
                    )}
                  </div>

                  {/* Email Field */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      disabled={!isEditing}
                      className={`w-full px-4 py-3 rounded-lg border-2 ${
                        validationErrors.email
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-100'
                          : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                      } ${
                        isEditing
                          ? 'bg-white text-gray-900'
                          : 'bg-gray-50 text-gray-600 cursor-not-allowed'
                      } focus:outline-none focus:ring-4 transition-all duration-200`}
                    />
                    {validationErrors.email && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {validationErrors.email}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Details Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Details</h3>
                <div>
                  <label htmlFor="phone" className="block text-sm font-semibold text-gray-900 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={formData.phone || ''}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    disabled={!isEditing}
                    placeholder="+353 87 123 4567"
                    className={`w-full px-4 py-3 rounded-lg border-2 ${
                      validationErrors.phone
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-100'
                        : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                    } ${
                      isEditing
                        ? 'bg-white text-gray-900'
                        : 'bg-gray-50 text-gray-600 cursor-not-allowed'
                    } focus:outline-none focus:ring-4 transition-all duration-200`}
                  />
                  {validationErrors.phone && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {validationErrors.phone}
                    </p>
                  )}
                </div>
              </div>

              {/* Business Information Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Information</h3>
                <div className="space-y-6">
                  {/* Company Name */}
                  <div>
                    <label htmlFor="company_name" className="block text-sm font-semibold text-gray-900 mb-2">
                      Company Name
                    </label>
                    <input
                      type="text"
                      id="company_name"
                      value={formData.company_name || ''}
                      onChange={(e) => handleInputChange('company_name', e.target.value)}
                      disabled={!isEditing}
                      placeholder="Your Company Ltd."
                      className={`w-full px-4 py-3 rounded-lg border-2 ${
                        validationErrors.company_name
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-100'
                          : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                      } ${
                        isEditing
                          ? 'bg-white text-gray-900'
                          : 'bg-gray-50 text-gray-600 cursor-not-allowed'
                      } focus:outline-none focus:ring-4 transition-all duration-200`}
                    />
                    {validationErrors.company_name && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {validationErrors.company_name}
                      </p>
                    )}
                  </div>

                  {/* Address */}
                  <div>
                    <label htmlFor="address" className="block text-sm font-semibold text-gray-900 mb-2">
                      Business Address
                    </label>
                    <textarea
                      id="address"
                      value={formData.address || ''}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      disabled={!isEditing}
                      rows={3}
                      placeholder="123 Main Street, Dublin, Ireland"
                      className={`w-full px-4 py-3 rounded-lg border-2 ${
                        validationErrors.address
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-100'
                          : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                      } ${
                        isEditing
                          ? 'bg-white text-gray-900'
                          : 'bg-gray-50 text-gray-600 cursor-not-allowed'
                      } focus:outline-none focus:ring-4 transition-all duration-200 resize-none`}
                    />
                    {validationErrors.address && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {validationErrors.address}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Account Information (Read-Only) */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 font-medium">Account Status:</span>
                    <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded-md font-semibold">
                      {userData?.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 font-medium">Member Since:</span>
                    <span className="ml-2 text-gray-900">
                      {userData && new Date(userData.created_at).toLocaleDateString('en-IE', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  {customerProfile?.b2b_account_id && (
                    <div className="md:col-span-2">
                      <span className="text-gray-600 font-medium">B2B Account ID:</span>
                      <span className="ml-2 text-gray-900 font-mono">{customerProfile.b2b_account_id}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="border-t border-gray-200 pt-6">
                {isEditing ? (
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button
                      onClick={handleSaveProfile}
                      disabled={updateProfileMutation.isPending}
                      className="flex-1 px-6 py-3 bg-yellow-400 text-black rounded-lg font-semibold hover:bg-yellow-500 focus:outline-none focus:ring-4 focus:ring-yellow-100 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updateProfileMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-black"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5" />
                          Save Changes
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={updateProfileMutation.isPending}
                      className="flex-1 px-6 py-3 bg-gray-100 text-gray-900 rounded-lg font-semibold hover:bg-gray-200 border-2 border-gray-300 focus:outline-none focus:ring-4 focus:ring-gray-100 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <X className="w-5 h-5" />
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleChangePasswordClick}
                    className="w-full sm:w-auto px-6 py-3 text-black font-semibold hover:underline transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <Lock className="w-5 h-5" />
                    Change Password
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {isChangingPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Change Password
              </h3>
              <button
                onClick={handleClosePasswordModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-6 space-y-6">
              {/* Current Password */}
              <div>
                <label htmlFor="current_password" className="block text-sm font-semibold text-gray-900 mb-2">
                  Current Password *
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    id="current_password"
                    value={passwordForm.current_password}
                    onChange={(e) => handlePasswordInputChange('current_password', e.target.value)}
                    className={`w-full px-4 py-3 pr-12 rounded-lg border-2 ${
                      validationErrors.current_password
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-100'
                        : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                    } bg-white text-gray-900 focus:outline-none focus:ring-4 transition-all duration-200`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {validationErrors.current_password && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {validationErrors.current_password}
                  </p>
                )}
              </div>

              {/* New Password */}
              <div>
                <label htmlFor="new_password" className="block text-sm font-semibold text-gray-900 mb-2">
                  New Password *
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    id="new_password"
                    value={passwordForm.new_password}
                    onChange={(e) => handlePasswordInputChange('new_password', e.target.value)}
                    className={`w-full px-4 py-3 pr-12 rounded-lg border-2 ${
                      validationErrors.new_password
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-100'
                        : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                    } bg-white text-gray-900 focus:outline-none focus:ring-4 transition-all duration-200`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {validationErrors.new_password && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {validationErrors.new_password}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Must be at least 8 characters long
                </p>
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirm_password" className="block text-sm font-semibold text-gray-900 mb-2">
                  Confirm New Password *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirm_password"
                    value={passwordForm.confirm_password}
                    onChange={(e) => handlePasswordInputChange('confirm_password', e.target.value)}
                    className={`w-full px-4 py-3 pr-12 rounded-lg border-2 ${
                      validationErrors.confirm_password
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-100'
                        : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                    } bg-white text-gray-900 focus:outline-none focus:ring-4 transition-all duration-200`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {validationErrors.confirm_password && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {validationErrors.confirm_password}
                  </p>
                )}
              </div>

              {/* Warning Message */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> Password change functionality requires backend implementation. This feature is coming soon.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex gap-4">
              <button
                onClick={handlePasswordChange}
                className="flex-1 px-6 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 focus:outline-none focus:ring-4 focus:ring-gray-200 transition-all duration-200"
              >
                Change Password
              </button>
              <button
                onClick={handleClosePasswordModal}
                className="flex-1 px-6 py-3 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-100 border-2 border-gray-300 focus:outline-none focus:ring-4 focus:ring-gray-100 transition-all duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UV_CustomerProfile;