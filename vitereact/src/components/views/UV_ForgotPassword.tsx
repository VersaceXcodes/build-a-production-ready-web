import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Mail, CheckCircle, XCircle, Loader2 } from 'lucide-react';

const UV_ForgotPassword: React.FC = () => {
  // Local state
  const [email, setEmail] = useState('');
  const [is_submitting, setIsSubmitting] = useState(false);
  const [success_message, setSuccessMessage] = useState<string | null>(null);
  const [error_message, setErrorMessage] = useState<string | null>(null);

  // Email input change handler
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    // Clear error message when user starts typing
    if (error_message) {
      setErrorMessage(null);
    }
  };

  // Form submission handler
  const submitForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Clear previous messages
    setSuccessMessage(null);
    setErrorMessage(null);

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setErrorMessage('Please enter your email address');
      return;
    }
    if (!emailRegex.test(email)) {
      setErrorMessage('Please enter a valid email address');
      return;
    }

    // Set loading state
    setIsSubmitting(true);

    try {
      // API call to forgot password endpoint
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/auth/forgot-password`,
        { email: email.trim() },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      // Handle success response
      if (response.data && response.status === 200) {
        setSuccessMessage(
          'If an account with that email exists, we\'ve sent a password reset link. Please check your inbox.'
        );
        setEmail(''); // Clear email input on success
      }
    } catch (error: any) {
      // Handle error response
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        'Unable to send reset email. Please try again later.';
      setErrorMessage(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-blue-100 mb-4">
              <Mail className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Forgot Password
            </h2>
            <p className="text-gray-600">
              Enter your email and we'll send you a reset link
            </p>
          </div>

          {/* Success Message */}
          {success_message && (
            <div
              className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3"
              role="alert"
              aria-live="polite"
            >
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-green-700 font-medium">
                  {success_message}
                </p>
                <p className="text-sm text-green-600 mt-2">
                  Please check your spam folder if you don't see the email within a few minutes.
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error_message && (
            <div
              className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3"
              role="alert"
              aria-live="assertive"
            >
              <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-700 font-medium">
                  {error_message}
                </p>
              </div>
            </div>
          )}

          {/* Form */}
          <form className="mt-8 space-y-6" onSubmit={submitForgotPassword}>
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={handleEmailChange}
                  disabled={is_submitting || !!success_message}
                  placeholder="Enter your email address"
                  className="appearance-none relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
                  aria-describedby={error_message ? 'email-error' : undefined}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={is_submitting || !!success_message}
                className="group relative w-full flex justify-center items-center py-3 px-6 border border-transparent text-sm font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                aria-busy={is_submitting}
              >
                {is_submitting ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    Sending...
                  </>
                ) : success_message ? (
                  'Email Sent'
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </div>
          </form>

          {/* Navigation Links */}
          <div className="text-center space-y-2">
            <Link
              to="/login"
              className="text-blue-600 hover:text-blue-500 text-sm font-medium inline-flex items-center transition-colors"
            >
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Back to Login
            </Link>
            
            {success_message && (
              <div className="pt-2">
                <Link
                  to="/login"
                  className="text-gray-600 hover:text-gray-900 text-sm transition-colors"
                >
                  Remember your password? <span className="font-medium text-blue-600 hover:text-blue-500">Sign in</span>
                </Link>
              </div>
            )}
          </div>

          {/* Security Note */}
          <div className="text-center">
            <p className="text-xs text-gray-500">
              For security reasons, reset links expire after 1 hour
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_ForgotPassword;