import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import axios from 'axios';

const UV_ResetPassword: React.FC = () => {
  // Get token from URL params
  const { reset_token } = useParams<{ reset_token: string }>();
  const navigate = useNavigate();

  // State variables
  const [token] = useState<string>(reset_token || '');
  const [password, setPassword] = useState('');
  const [confirm_password, setConfirmPassword] = useState('');
  const [password_strength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | null>(null);
  const [is_submitting, setIsSubmitting] = useState(false);
  const [error_message, setErrorMessage] = useState<string | null>(null);
  const [is_token_valid, setIsTokenValid] = useState<boolean | null>(null);

  // Token validation on mount
  useEffect(() => {
    if (!token) {
      setErrorMessage('Invalid reset link');
      setIsTokenValid(false);
      setTimeout(() => {
        navigate('/forgot-password?error=invalid_token');
      }, 2000);
      return;
    }

    // Since there's no explicit token validation endpoint mentioned,
    // we'll assume the token is valid until the reset attempt
    // The backend will validate on submission
    setIsTokenValid(true);
  }, [token, navigate]);

  // Password strength calculation
  const calculatePasswordStrength = (pwd: string): 'weak' | 'medium' | 'strong' => {
    if (pwd.length < 8) return 'weak';
    
    let strength = 0;
    if (pwd.length >= 12) strength++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^a-zA-Z0-9]/.test(pwd)) strength++;
    
    if (strength <= 1) return 'weak';
    if (strength <= 2) return 'medium';
    return 'strong';
  };

  // Handle password change
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    setErrorMessage(null);
    
    if (newPassword.length > 0) {
      setPasswordStrength(calculatePasswordStrength(newPassword));
    } else {
      setPasswordStrength(null);
    }
  };

  // Handle confirm password change
  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);
    setErrorMessage(null);
  };

  // Submit password reset
  const submitPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirm_password) {
      setErrorMessage('Passwords do not match');
      return;
    }

    if (password_strength === 'weak') {
      setErrorMessage('Please choose a stronger password');
      return;
    }

    setIsSubmitting(true);

    try {
      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/auth/reset-password`,
        {
          token,
          password
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      // Success - redirect to login with success message
      navigate('/login?message=password_reset_success');
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message || 'Password reset failed. Please try again.';
      
      // If token is invalid or expired, redirect to forgot password
      if (errorMsg.toLowerCase().includes('token') || errorMsg.toLowerCase().includes('expired') || errorMsg.toLowerCase().includes('invalid')) {
        setErrorMessage('Reset link is invalid or expired');
        setTimeout(() => {
          navigate('/forgot-password?error=expired_token');
        }, 2000);
      } else {
        setErrorMessage(errorMsg);
      }
      
      setIsSubmitting(false);
    }
  };

  // If token is invalid, show error state
  if (is_token_valid === false) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center">
              <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-red-100">
                <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="mt-6 text-3xl font-bold text-gray-900">Invalid Reset Link</h2>
              <p className="mt-2 text-gray-600">
                This password reset link is invalid or has expired.
              </p>
              <div className="mt-6">
                <Link
                  to="/forgot-password"
                  className="text-gray-900 hover:text-gray-700 font-semibold underline transition-colors"
                >
                  Request a new reset link
                </Link>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Loading state while validating token
  if (is_token_valid === null) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-black"></div>
            <p className="text-gray-600 font-medium">Validating reset link...</p>
          </div>
        </div>
      </>
    );
  }

  // Get password strength color and label
  const getStrengthColor = () => {
    if (!password_strength) return '';
    switch (password_strength) {
      case 'weak': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'strong': return 'bg-green-500';
    }
  };

  const getStrengthWidth = () => {
    if (!password_strength) return 'w-0';
    switch (password_strength) {
      case 'weak': return 'w-1/3';
      case 'medium': return 'w-2/3';
      case 'strong': return 'w-full';
    }
  };

  const getStrengthLabel = () => {
    if (!password_strength) return '';
    return password_strength.charAt(0).toUpperCase() + password_strength.slice(1);
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">Reset Your Password</h2>
            <p className="mt-3 text-base text-gray-600 leading-relaxed">
              Enter your new password below
            </p>
          </div>

          {/* Form */}
          <form className="mt-8 space-y-6" onSubmit={submitPasswordReset}>
            {/* Error Message */}
            {error_message && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                <div className="flex items-start">
                  <svg className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="ml-3 text-sm text-red-700 font-medium">{error_message}</p>
                </div>
              </div>
            )}

            <div className="space-y-6">
              {/* Password Input */}
              <div>
                <label htmlFor="password" className="block text-sm font-bold text-gray-900 mb-2">
                  New Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={handlePasswordChange}
                  placeholder="Enter new password (min 8 characters)"
                  className="block w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-black focus:ring-4 focus:ring-gray-100 transition-all"
                />
                
                {/* Password Strength Indicator */}
                {password.length > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-600">Password Strength:</span>
                      <span className={`text-xs font-bold ${
                        password_strength === 'weak' ? 'text-red-600' :
                        password_strength === 'medium' ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {getStrengthLabel()}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${getStrengthColor()} ${getStrengthWidth()}`}
                      />
                    </div>
                    <p className="mt-2 text-xs text-gray-500 leading-relaxed">
                      Use 12+ characters with a mix of letters, numbers & symbols
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm Password Input */}
              <div>
                <label htmlFor="confirm_password" className="block text-sm font-bold text-gray-900 mb-2">
                  Confirm Password
                </label>
                <input
                  id="confirm_password"
                  name="confirm_password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirm_password}
                  onChange={handleConfirmPasswordChange}
                  placeholder="Re-enter your password"
                  className="block w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-black focus:ring-4 focus:ring-gray-100 transition-all"
                />
                
                {/* Password Match Indicator */}
                {confirm_password.length > 0 && (
                  <div className="mt-2 flex items-center">
                    {password === confirm_password ? (
                      <>
                        <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="ml-2 text-xs text-green-600 font-semibold">Passwords match</span>
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span className="ml-2 text-xs text-red-600 font-semibold">Passwords do not match</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={is_submitting || !password || !confirm_password || password !== confirm_password || password_strength === 'weak'}
                className="w-full flex justify-center items-center px-6 py-3 bg-yellow-400 text-black font-bold rounded-lg hover:bg-yellow-500 focus:outline-none focus:ring-4 focus:ring-yellow-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {is_submitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-black" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Resetting Password...
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>
            </div>

            {/* Back to Login Link */}
            <div className="text-center pt-4">
              <Link
                to="/login"
                className="text-sm text-gray-600 hover:text-gray-900 font-semibold transition-colors inline-flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default UV_ResetPassword;