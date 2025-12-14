import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore } from '@/store/main';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

const UV_Login: React.FC = () => {
  // ============================================================================
  // HOOKS & STATE MANAGEMENT
  // ============================================================================

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Local form state
  const [login_form, setLoginForm] = useState<{
    email: string;
    password: string;
    selected_role: 'CUSTOMER' | 'STAFF' | 'ADMIN';
  }>({
    email: '',
    password: '',
    selected_role: 'CUSTOMER',
  });

  const [show_password, setShowPassword] = useState(false);
  const [url_redirect, setUrlRedirect] = useState<string | null>(null);

  // CRITICAL: Individual Zustand selectors (no object destructuring)
  const is_loading = useAppStore(
    (state) => state.authentication_state.authentication_status.is_loading
  );
  const error_message = useAppStore(
    (state) => state.authentication_state.error_message
  );
  const login_user = useAppStore((state) => state.login_user);
  const clear_auth_error = useAppStore((state) => state.clear_auth_error);

  // ============================================================================
  // URL PARAMS INITIALIZATION
  // ============================================================================

  useEffect(() => {
    // Parse URL parameters for role pre-selection and redirect
    const role_param = searchParams.get('role');
    const redirect_param = searchParams.get('redirect_url');

    // Pre-select role if valid param exists
    if (role_param) {
      const normalized_role = role_param.toUpperCase() as
        | 'CUSTOMER'
        | 'STAFF'
        | 'ADMIN';
      if (
        normalized_role === 'CUSTOMER' ||
        normalized_role === 'STAFF' ||
        normalized_role === 'ADMIN'
      ) {
        setLoginForm((prev) => ({ ...prev, selected_role: normalized_role }));
      }
    }

    // Store redirect URL for post-login navigation
    if (redirect_param) {
      setUrlRedirect(decodeURIComponent(redirect_param));
    }
  }, [searchParams]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleFormFieldChange = (
    field: 'email' | 'password' | 'selected_role',
    value: string
  ) => {
    // Update form state
    setLoginForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear previous errors when user starts typing
    if (error_message) {
      clear_auth_error();
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    clear_auth_error();

    try {
      // Call store action to authenticate
      await login_user(login_form.email, login_form.password);

      // On success, store updates global auth state
      // Navigate to appropriate dashboard based on role or redirect_url
      const default_dashboard =
        login_form.selected_role === 'CUSTOMER'
          ? '/app'
          : login_form.selected_role === 'STAFF'
          ? '/staff'
          : '/admin';

      const final_redirect = url_redirect || default_dashboard;
      navigate(final_redirect, { replace: true });
    } catch (error) {
      // Error is already set in store by login_user action
      console.error('Login error:', error);
    }
  };

  const navigateToRegister = () => {
    // Preserve redirect_url when navigating to register
    const register_url = url_redirect
      ? `/register?redirect_url=${encodeURIComponent(url_redirect)}`
      : '/register';
    navigate(register_url);
  };

  const navigateToForgotPassword = () => {
    navigate('/forgot-password');
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          {/* Login Card */}
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="p-8 sm:p-10">
              {/* Header */}
              <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-black mb-2">
                  Welcome Back
                </h1>
                <p className="text-gray-600">
                  Sign in to access your account
                </p>
              </div>

              {/* Error Message */}
              {error_message && (
                <div
                  className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg"
                  role="alert"
                  aria-live="polite"
                >
                  <p className="text-sm font-medium">{error_message}</p>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleLoginSubmit} className="space-y-6">
                {/* Role Selector */}
                <div>
                  <label
                    htmlFor="role"
                    className="block text-sm font-bold text-black mb-2"
                  >
                    Login As
                  </label>
                  <select
                    id="role"
                    name="role"
                    value={login_form.selected_role}
                    onChange={(e) =>
                      handleFormFieldChange(
                        'selected_role',
                        e.target.value as 'CUSTOMER' | 'STAFF' | 'ADMIN'
                      )
                    }
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-black bg-white focus:outline-none focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 transition-all duration-200"
                  >
                    <option value="CUSTOMER">Customer</option>
                    <option value="STAFF">Staff</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>

                {/* Email Input */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-bold text-black mb-2"
                  >
                    Email Address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={login_form.email}
                    onChange={(e) =>
                      handleFormFieldChange('email', e.target.value)
                    }
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 transition-all duration-200"
                  />
                </div>

                {/* Password Input with Toggle */}
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-bold text-black mb-2"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={show_password ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={login_form.password}
                      onChange={(e) =>
                        handleFormFieldChange('password', e.target.value)
                      }
                      placeholder="Enter your password"
                      className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 transition-all duration-200"
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      aria-label={
                        show_password ? 'Hide password' : 'Show password'
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-black transition-colors duration-200"
                    >
                      {show_password ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Forgot Password Link */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={navigateToForgotPassword}
                    className="text-sm text-gray-600 hover:text-black underline transition-colors duration-200"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Submit Button */}
                <div>
                  <button
                    type="submit"
                    disabled={is_loading}
                    className="w-full bg-yellow-400 text-black font-bold py-3 px-6 rounded-lg hover:bg-yellow-500 focus:outline-none focus:ring-4 focus:ring-yellow-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
                  >
                    {is_loading ? (
                      <>
                        <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </button>
                </div>
              </form>

              {/* Register Link (Customer Only) */}
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={navigateToRegister}
                    className="text-black font-semibold hover:underline transition-all duration-200"
                  >
                    Register as Customer
                  </button>
                </p>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Staff and Admin accounts are created by system administrators.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Need help?{' '}
              <Link
                to="/contact"
                className="text-black hover:underline font-medium"
              >
                Contact Support
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_Login;