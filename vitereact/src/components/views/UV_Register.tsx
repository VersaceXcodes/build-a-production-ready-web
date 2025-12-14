import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore } from '@/store/main';
import { Mail, Lock, User, Phone, Building, MapPin, Check, AlertCircle } from 'lucide-react';

const UV_Register: React.FC = () => {
  // ============================================================================
  // URL PARAMS & NAVIGATION
  // ============================================================================
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get('redirect_url') || '/app';

  // ============================================================================
  // ZUSTAND STORE - INDIVIDUAL SELECTORS (CRITICAL)
  // ============================================================================
  const registerUser = useAppStore(state => state.register_user);
  const authError = useAppStore(state => state.authentication_state.error_message);
  const clearAuthError = useAppStore(state => state.clear_auth_error);
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);

  // ============================================================================
  // LOCAL STATE
  // ============================================================================
  const [registrationForm, setRegistrationForm] = useState({
    email: '',
    password: '',
    confirm_password: '',
    name: '',
    phone: '',
    company_name: '',
    address: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ============================================================================
  // REDIRECT IF ALREADY AUTHENTICATED
  // ============================================================================
  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectUrl);
    }
  }, [isAuthenticated, navigate, redirectUrl]);

  // ============================================================================
  // PASSWORD STRENGTH CALCULATION
  // ============================================================================
  const calculatePasswordStrength = (password: string): 'weak' | 'medium' | 'strong' | null => {
    if (!password) return null;
    
    const length = password.length;
    const hasLowerCase = /[a-z]/.test(password);
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    if (length < 8) return 'weak';
    
    const complexityScore = [hasLowerCase, hasUpperCase, hasNumbers, hasSpecialChars].filter(Boolean).length;
    
    if (length >= 12 && complexityScore >= 3) return 'strong';
    if (length >= 8 && complexityScore >= 2) return 'medium';
    
    return 'weak';
  };

  // ============================================================================
  // FIELD VALIDATION
  // ============================================================================
  const validateField = (name: string, value: string): string | null => {
    switch (name) {
      case 'name':
        if (!value.trim()) return 'Name is required';
        if (value.length > 255) return 'Name must be less than 255 characters';
        return null;
        
      case 'email':
        if (!value.trim()) return 'Email is required';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return 'Please enter a valid email address';
        if (value.length > 255) return 'Email must be less than 255 characters';
        return null;
        
      case 'password':
        if (!value) return 'Password is required';
        if (value.length < 8) return 'Password must be at least 8 characters';
        if (value.length > 100) return 'Password must be less than 100 characters';
        return null;
        
      case 'confirm_password':
        if (!value) return 'Please confirm your password';
        if (value !== registrationForm.password) return 'Passwords do not match';
        return null;
        
      case 'phone':
        if (value && value.length > 50) return 'Phone must be less than 50 characters';
        return null;
        
      case 'company_name':
        if (value && value.length > 255) return 'Company name must be less than 255 characters';
        return null;
        
      case 'address':
        if (value && value.length > 500) return 'Address must be less than 500 characters';
        return null;
        
      default:
        return null;
    }
  };

  // ============================================================================
  // FIELD CHANGE HANDLER
  // ============================================================================
  const handleFieldChange = (name: string, value: string) => {
    setRegistrationForm(prev => ({ ...prev, [name]: value }));
    
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
    
    // Clear auth error when user starts typing
    if (authError) {
      clearAuthError();
    }
    
    // Calculate password strength
    if (name === 'password') {
      setPasswordStrength(calculatePasswordStrength(value));
    }
    
    // Re-validate confirm_password if password changes
    if (name === 'password' && registrationForm.confirm_password) {
      const confirmError = validateField('confirm_password', registrationForm.confirm_password);
      if (confirmError) {
        setValidationErrors(prev => ({ ...prev, confirm_password: confirmError }));
      } else {
        setValidationErrors(prev => {
          const updated = { ...prev };
          delete updated.confirm_password;
          return updated;
        });
      }
    }
  };

  // ============================================================================
  // FIELD BLUR HANDLER
  // ============================================================================
  const handleFieldBlur = (name: string, value: string) => {
    const error = validateField(name, value);
    if (error) {
      setValidationErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  // ============================================================================
  // FORM VALIDATION
  // ============================================================================
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    // Validate required fields
    const requiredFields = ['name', 'email', 'password', 'confirm_password'];
    requiredFields.forEach(field => {
      const error = validateField(field, registrationForm[field as keyof typeof registrationForm]);
      if (error) errors[field] = error;
    });
    
    // Validate optional fields if filled
    if (registrationForm.phone) {
      const error = validateField('phone', registrationForm.phone);
      if (error) errors.phone = error;
    }
    if (registrationForm.company_name) {
      const error = validateField('company_name', registrationForm.company_name);
      if (error) errors.company_name = error;
    }
    if (registrationForm.address) {
      const error = validateField('address', registrationForm.address);
      if (error) errors.address = error;
    }
    
    // Check terms agreement
    if (!termsAgreed) {
      errors.terms = 'You must agree to the terms and conditions';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ============================================================================
  // FORM SUBMISSION HANDLER
  // ============================================================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    clearAuthError();
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Call store's register_user action
      await registerUser(
        registrationForm.email,
        registrationForm.password,
        registrationForm.name,
        registrationForm.phone || undefined,
        registrationForm.company_name || undefined,
        registrationForm.address || undefined
      );
      
      // Navigation handled by auth redirect effect
    } catch (error: any) {
      // Error is already set in store
      console.error('Registration error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================================================
  // PASSWORD STRENGTH INDICATOR
  // ============================================================================
  const renderPasswordStrength = () => {
    if (!passwordStrength) return null;
    
    const strengthConfig = {
      weak: { color: 'bg-red-500', text: 'Weak password', width: 'w-1/3' },
      medium: { color: 'bg-yellow-400', text: 'Medium password', width: 'w-2/3' },
      strong: { color: 'bg-green-500', text: 'Strong password', width: 'w-full' }
    };
    
    const config = strengthConfig[passwordStrength];
    
    return (
      <div className="mt-2">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full ${config.color} transition-all duration-300`}
            style={{ width: config.width === 'w-1/3' ? '33%' : config.width === 'w-2/3' ? '66%' : '100%' }}
          />
        </div>
        <p className={`text-xs mt-1 ${
          passwordStrength === 'weak' ? 'text-red-600' : 
          passwordStrength === 'medium' ? 'text-yellow-600' : 
          'text-green-600'
        }`}>
          {config.text}
        </p>
      </div>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Create Your Account
              </h1>
              <p className="text-gray-600">
                Join SultanStamp to start your project
              </p>
            </div>

            {/* Error Banner */}
            {authError && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{authError}</p>
              </div>
            )}

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Required Fields Section */}
              <div className="space-y-4">
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                  Required Information
                </h2>

                {/* Name Field */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-900 mb-2">
                    Full Name <span className="text-red-600">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={registrationForm.name}
                      onChange={(e) => handleFieldChange('name', e.target.value)}
                      onBlur={(e) => handleFieldBlur('name', e.target.value)}
                      placeholder="John Doe"
                      className={`w-full pl-11 pr-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-4 transition-all ${
                        validationErrors.name
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                          : 'border-gray-200 focus:border-black focus:ring-gray-100'
                      }`}
                    />
                  </div>
                  {validationErrors.name && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {validationErrors.name}
                    </p>
                  )}
                </div>

                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-2">
                    Email Address <span className="text-red-600">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={registrationForm.email}
                      onChange={(e) => handleFieldChange('email', e.target.value)}
                      onBlur={(e) => handleFieldBlur('email', e.target.value)}
                      placeholder="john@example.com"
                      className={`w-full pl-11 pr-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-4 transition-all ${
                        validationErrors.email
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                          : 'border-gray-200 focus:border-black focus:ring-gray-100'
                      }`}
                    />
                  </div>
                  {validationErrors.email && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {validationErrors.email}
                    </p>
                  )}
                </div>

                {/* Password Field */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-900 mb-2">
                    Password <span className="text-red-600">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      name="password"
                      value={registrationForm.password}
                      onChange={(e) => handleFieldChange('password', e.target.value)}
                      onBlur={(e) => handleFieldBlur('password', e.target.value)}
                      placeholder="Min. 8 characters"
                      className={`w-full pl-11 pr-12 py-3 border-2 rounded-lg focus:outline-none focus:ring-4 transition-all ${
                        validationErrors.password
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                          : 'border-gray-200 focus:border-black focus:ring-gray-100'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-medium"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  {validationErrors.password && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {validationErrors.password}
                    </p>
                  )}
                  {renderPasswordStrength()}
                </div>

                {/* Confirm Password Field */}
                <div>
                  <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-900 mb-2">
                    Confirm Password <span className="text-red-600">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      id="confirm_password"
                      name="confirm_password"
                      value={registrationForm.confirm_password}
                      onChange={(e) => handleFieldChange('confirm_password', e.target.value)}
                      onBlur={(e) => handleFieldBlur('confirm_password', e.target.value)}
                      placeholder="Re-enter password"
                      className={`w-full pl-11 pr-12 py-3 border-2 rounded-lg focus:outline-none focus:ring-4 transition-all ${
                        validationErrors.confirm_password
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                          : 'border-gray-200 focus:border-black focus:ring-gray-100'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-medium"
                    >
                      {showConfirmPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  {validationErrors.confirm_password && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {validationErrors.confirm_password}
                    </p>
                  )}
                </div>
              </div>

              {/* Optional Fields Section */}
              <div className="space-y-4 pt-4 border-t border-gray-200">
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                  Optional Information
                </h2>

                {/* Phone Field */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-900 mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={registrationForm.phone}
                      onChange={(e) => handleFieldChange('phone', e.target.value)}
                      onBlur={(e) => handleFieldBlur('phone', e.target.value)}
                      placeholder="+353 87 123 4567"
                      className={`w-full pl-11 pr-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-4 transition-all ${
                        validationErrors.phone
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                          : 'border-gray-200 focus:border-black focus:ring-gray-100'
                      }`}
                    />
                  </div>
                  {validationErrors.phone && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {validationErrors.phone}
                    </p>
                  )}
                </div>

                {/* Company Name Field */}
                <div>
                  <label htmlFor="company_name" className="block text-sm font-medium text-gray-900 mb-2">
                    Company Name
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      id="company_name"
                      name="company_name"
                      value={registrationForm.company_name}
                      onChange={(e) => handleFieldChange('company_name', e.target.value)}
                      onBlur={(e) => handleFieldBlur('company_name', e.target.value)}
                      placeholder="Your Company Ltd."
                      className={`w-full pl-11 pr-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-4 transition-all ${
                        validationErrors.company_name
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                          : 'border-gray-200 focus:border-black focus:ring-gray-100'
                      }`}
                    />
                  </div>
                  {validationErrors.company_name && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {validationErrors.company_name}
                    </p>
                  )}
                </div>

                {/* Address Field */}
                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-900 mb-2">
                    Address
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <textarea
                      id="address"
                      name="address"
                      rows={3}
                      value={registrationForm.address}
                      onChange={(e) => handleFieldChange('address', e.target.value)}
                      onBlur={(e) => handleFieldBlur('address', e.target.value)}
                      placeholder="123 Main Street, Dublin, Ireland"
                      className={`w-full pl-11 pr-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-4 transition-all resize-none ${
                        validationErrors.address
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                          : 'border-gray-200 focus:border-black focus:ring-gray-100'
                      }`}
                    />
                  </div>
                  {validationErrors.address && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {validationErrors.address}
                    </p>
                  )}
                </div>
              </div>

              {/* Terms Agreement */}
              <div className="pt-4 border-t border-gray-200">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center mt-0.5">
                    <input
                      type="checkbox"
                      checked={termsAgreed}
                      onChange={(e) => setTermsAgreed(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className={`w-5 h-5 border-2 rounded transition-all ${
                      termsAgreed 
                        ? 'bg-black border-black' 
                        : 'border-gray-300 group-hover:border-gray-400'
                    }`}>
                      {termsAgreed && (
                        <Check className="w-full h-full text-white p-0.5" strokeWidth={3} />
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-gray-700 leading-relaxed">
                    I agree to the{' '}
                    <Link 
                      to="/policies" 
                      className="text-black font-medium underline hover:text-gray-700"
                      target="_blank"
                    >
                      Terms of Service
                    </Link>
                    {' '}and{' '}
                    <Link 
                      to="/policies#privacy" 
                      className="text-black font-medium underline hover:text-gray-700"
                      target="_blank"
                    >
                      Privacy Policy
                    </Link>
                  </span>
                </label>
                {validationErrors.terms && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {validationErrors.terms}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !termsAgreed}
                className="w-full bg-yellow-400 text-black font-bold py-3 px-6 rounded-lg hover:bg-yellow-500 focus:outline-none focus:ring-4 focus:ring-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl disabled:hover:shadow-lg flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg 
                      className="animate-spin h-5 w-5 text-black" 
                      xmlns="http://www.w3.org/2000/svg" 
                      fill="none" 
                      viewBox="0 0 24 24"
                    >
                      <circle 
                        className="opacity-25" 
                        cx="12" 
                        cy="12" 
                        r="10" 
                        stroke="currentColor" 
                        strokeWidth="4"
                      />
                      <path 
                        className="opacity-75" 
                        fill="currentColor" 
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>

            {/* Login Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link 
                  to="/login" 
                  className="text-black font-semibold hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              By creating an account, you can submit quotes, track orders, and manage your projects with SultanStamp.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_Register;