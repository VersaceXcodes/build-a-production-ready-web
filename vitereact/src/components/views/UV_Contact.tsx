import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  Mail, 
  Phone, 
  MessageCircle, 
  Send, 
  CheckCircle, 
  X, 
  MapPin,
  Instagram,
  Facebook,
  Linkedin
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ContactFormData {
  name: string;
  email: string;
  phone: string | null;
  service_interest: string | null;
  message: string;
}

interface ServiceOption {
  id: string;
  name: string;
}

interface ValidationErrors {
  name?: string;
  email?: string;
  message?: string;
}

interface InquiryFormResponse {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  service_interest: string | null;
  message: string;
  status: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchServicesList = async (): Promise<ServiceOption[]> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/services`,
    {
      params: {
        is_active: true,
        limit: 100,
      },
    }
  );
  
  return response.data.services.map((service: any) => ({
    id: service.id,
    name: service.name,
  }));
};

const submitInquiryForm = async (formData: ContactFormData): Promise<InquiryFormResponse> => {
  const response = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/inquiry-forms`,
    {
      name: formData.name,
      email: formData.email,
      phone: formData.phone || null,
      service_interest: formData.service_interest || null,
      message: formData.message,
    },
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
  
  return response.data;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_Contact: React.FC = () => {
  // ======================================================================
  // ZUSTAND STORE (Individual selectors - CRITICAL pattern)
  // ======================================================================
  const companyInfo = useAppStore(state => state.system_config.company_info);

  // ======================================================================
  // LOCAL STATE
  // ======================================================================
  const [contactForm, setContactForm] = useState<ContactFormData>({
    name: '',
    email: '',
    phone: null,
    service_interest: null,
    message: '',
  });

  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [submittedSuccessfully, setSubmittedSuccessfully] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ======================================================================
  // REACT QUERY - FETCH SERVICES
  // ======================================================================
  const {
    data: availableServices = [],
    isLoading: isLoadingServices,
    isError: servicesError,
  } = useQuery({
    queryKey: ['services-list-contact'],
    queryFn: fetchServicesList,
    staleTime: 10 * 60 * 1000, // 10 minutes cache
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // ======================================================================
  // REACT QUERY - SUBMIT FORM MUTATION
  // ======================================================================
  const submitMutation = useMutation({
    mutationFn: submitInquiryForm,
    onSuccess: (data) => {
      setSubmittedSuccessfully(true);
      setErrorMessage(null);
      setValidationErrors({});
      
      // Reset form
      setContactForm({
        name: '',
        email: '',
        phone: null,
        service_interest: null,
        message: '',
      });
    },
    onError: (error: any) => {
      const apiErrorMessage =
        error.response?.data?.message ||
        error.message ||
        'Failed to send message. Please try again or contact us directly via WhatsApp.';
      
      setErrorMessage(apiErrorMessage);
      
      // Handle field-level validation errors if returned by API
      if (error.response?.data?.errors) {
        const fieldErrors: ValidationErrors = {};
        const apiErrors = error.response.data.errors;
        
        if (apiErrors.name) fieldErrors.name = apiErrors.name;
        if (apiErrors.email) fieldErrors.email = apiErrors.email;
        if (apiErrors.message) fieldErrors.message = apiErrors.message;
        
        setValidationErrors(fieldErrors);
      }
    },
  });

  // ======================================================================
  // FORM VALIDATION
  // ======================================================================
  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};
    
    if (!contactForm.name.trim()) {
      errors.name = 'Name is required';
    }
    
    if (!contactForm.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(contactForm.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!contactForm.message.trim()) {
      errors.message = 'Message is required';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ======================================================================
  // EVENT HANDLERS
  // ======================================================================
  const handleInputChange = (
    field: keyof ContactFormData,
    value: string | null
  ) => {
    setContactForm(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear validation error for this field when user types
    if (validationErrors[field as keyof ValidationErrors]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field as keyof ValidationErrors];
        return newErrors;
      });
    }
    
    // Clear global error message when user makes changes
    if (errorMessage) {
      setErrorMessage(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      submitMutation.mutate(contactForm);
    }
  };

  const handleBackToContact = () => {
    setSubmittedSuccessfully(false);
  };

  const handleWhatsAppClick = () => {
    const phoneNumber = companyInfo.phone.replace(/\s/g, '').replace('+', '');
    const message = encodeURIComponent("Hi SultanStamp, I'm interested in your services.");
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
  };

  // ======================================================================
  // RENDER
  // ======================================================================
  return (
    <>
      <div className="min-h-screen bg-[#F7F7F7] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-black mb-4">
              Contact Us
            </h1>
            <p className="text-lg text-gray-700 max-w-2xl mx-auto">
              Get in touch with us for inquiries, quotes, or support. We're here to help bring your vision to life.
            </p>
          </div>

          {/* Contact Information Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {/* Email Card */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow duration-200">
              <div className="flex items-center mb-4">
                <div className="bg-black rounded-full p-3">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <h3 className="ml-4 text-lg font-semibold text-black">Email</h3>
              </div>
              <p className="text-sm font-semibold text-gray-700 uppercase mb-2">
                Send us an email
              </p>
              <a
                href={`mailto:${companyInfo.email}`}
                className="text-lg text-black hover:text-gray-700 transition-colors underline"
              >
                {companyInfo.email}
              </a>
            </div>

            {/* Phone Card */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow duration-200">
              <div className="flex items-center mb-4">
                <div className="bg-black rounded-full p-3">
                  <Phone className="w-6 h-6 text-white" />
                </div>
                <h3 className="ml-4 text-lg font-semibold text-black">Phone</h3>
              </div>
              <p className="text-sm font-semibold text-gray-700 uppercase mb-2">
                Give us a call
              </p>
              <a
                href={`tel:${companyInfo.phone.replace(/\s/g, '')}`}
                className="text-lg text-black hover:text-gray-700 transition-colors underline"
              >
                {companyInfo.phone}
              </a>
            </div>

            {/* WhatsApp Card - MOST PROMINENT */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow duration-200 md:col-span-2 lg:col-span-1">
              <div className="flex items-center mb-4">
                <div className="bg-[#FFD300] rounded-full p-3">
                  <MessageCircle className="w-6 h-6 text-black" />
                </div>
                <h3 className="ml-4 text-lg font-semibold text-black">WhatsApp</h3>
              </div>
              <p className="text-sm font-semibold text-gray-700 uppercase mb-2">
                Preferred channel
              </p>
              <p className="text-lg text-black mb-4">{companyInfo.phone}</p>
              <button
                onClick={handleWhatsAppClick}
                className="w-full bg-[#FFD300] text-black font-bold px-6 py-3 rounded-lg hover:bg-[#e6bd00] transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-5 h-5" />
                Chat on WhatsApp
              </button>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Inquiry Form Section */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 lg:p-8">
                <h2 className="text-2xl font-bold text-black mb-6">
                  Send us a Message
                </h2>

                {/* Success State */}
                {submittedSuccessfully && (
                  <div className="bg-green-50 border-2 border-green-200 rounded-lg p-8 text-center">
                    <div className="flex justify-center mb-4">
                      <div className="bg-green-600 rounded-full p-4">
                        <CheckCircle className="w-12 h-12 text-white" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-green-800 mb-2">
                      Thank You!
                    </h3>
                    <p className="text-green-700 mb-6">
                      Your message has been received. We'll get back to you as soon as possible.
                    </p>
                    <button
                      onClick={handleBackToContact}
                      className="bg-black text-white font-semibold px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors duration-200"
                    >
                      Send Another Message
                    </button>
                  </div>
                )}

                {/* Form */}
                {!submittedSuccessfully && (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Global Error Message */}
                    {errorMessage && (
                      <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start gap-3">
                        <X className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-red-700 text-sm font-medium">
                            {errorMessage}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setErrorMessage(null)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* Name Field */}
                    <div>
                      <label
                        htmlFor="name"
                        className="block text-sm font-semibold text-black mb-2"
                      >
                        Full Name <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        id="name"
                        value={contactForm.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors ${
                          validationErrors.name
                            ? 'border-red-500 focus:border-red-600'
                            : 'border-gray-200 focus:border-black'
                        }`}
                        placeholder="John Doe"
                        aria-invalid={!!validationErrors.name}
                        aria-describedby={validationErrors.name ? 'name-error' : undefined}
                      />
                      {validationErrors.name && (
                        <p id="name-error" className="text-red-600 text-sm mt-1">
                          {validationErrors.name}
                        </p>
                      )}
                    </div>

                    {/* Email Field */}
                    <div>
                      <label
                        htmlFor="email"
                        className="block text-sm font-semibold text-black mb-2"
                      >
                        Email Address <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="email"
                        id="email"
                        value={contactForm.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors ${
                          validationErrors.email
                            ? 'border-red-500 focus:border-red-600'
                            : 'border-gray-200 focus:border-black'
                        }`}
                        placeholder="john@example.com"
                        aria-invalid={!!validationErrors.email}
                        aria-describedby={validationErrors.email ? 'email-error' : undefined}
                      />
                      {validationErrors.email && (
                        <p id="email-error" className="text-red-600 text-sm mt-1">
                          {validationErrors.email}
                        </p>
                      )}
                    </div>

                    {/* Phone Field (Optional) */}
                    <div>
                      <label
                        htmlFor="phone"
                        className="block text-sm font-semibold text-black mb-2"
                      >
                        Phone Number <span className="text-gray-500 text-xs">(Optional)</span>
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        value={contactForm.phone || ''}
                        onChange={(e) => handleInputChange('phone', e.target.value || null)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-black transition-colors"
                        placeholder="+353 87 123 4567"
                      />
                    </div>

                    {/* Service Interest Dropdown (Optional) */}
                    <div>
                      <label
                        htmlFor="service_interest"
                        className="block text-sm font-semibold text-black mb-2"
                      >
                        Service Interest <span className="text-gray-500 text-xs">(Optional)</span>
                      </label>
                      <select
                        id="service_interest"
                        value={contactForm.service_interest || ''}
                        onChange={(e) => handleInputChange('service_interest', e.target.value || null)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-black transition-colors bg-white"
                        disabled={isLoadingServices}
                      >
                        <option value="">Select a service (optional)</option>
                        {isLoadingServices && (
                          <option value="" disabled>Loading services...</option>
                        )}
                        {servicesError && (
                          <option value="" disabled>Unable to load services</option>
                        )}
                        {availableServices.map((service) => (
                          <option key={service.id} value={service.name}>
                            {service.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Message Field */}
                    <div>
                      <label
                        htmlFor="message"
                        className="block text-sm font-semibold text-black mb-2"
                      >
                        Message <span className="text-red-600">*</span>
                      </label>
                      <textarea
                        id="message"
                        rows={6}
                        value={contactForm.message}
                        onChange={(e) => handleInputChange('message', e.target.value)}
                        className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors resize-none ${
                          validationErrors.message
                            ? 'border-red-500 focus:border-red-600'
                            : 'border-gray-200 focus:border-black'
                        }`}
                        placeholder="Tell us about your project or inquiry..."
                        aria-invalid={!!validationErrors.message}
                        aria-describedby={validationErrors.message ? 'message-error' : undefined}
                      />
                      {validationErrors.message && (
                        <p id="message-error" className="text-red-600 text-sm mt-1">
                          {validationErrors.message}
                        </p>
                      )}
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={submitMutation.isPending}
                      className="w-full bg-black text-white font-semibold px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitMutation.isPending ? (
                        <>
                          <svg
                            className="animate-spin h-5 w-5 text-white"
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
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5" />
                          Send Message
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Social Media & Location Section */}
            <div className="space-y-8">
              {/* Social Media Links */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <h3 className="text-xl font-bold text-black mb-4">
                  Connect With Us
                </h3>
                <p className="text-gray-700 text-sm mb-6">
                  Follow us on social media for updates, portfolio showcases, and special offers.
                </p>
                <div className="flex flex-wrap gap-4">
                  <a
                    href="https://instagram.com/sultanstamp"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-12 h-12 rounded-full bg-black text-white hover:bg-[#FFD300] hover:text-black transition-all duration-200"
                    aria-label="Instagram"
                  >
                    <Instagram className="w-6 h-6" />
                  </a>
                  <a
                    href="https://facebook.com/sultanstamp"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-12 h-12 rounded-full bg-black text-white hover:bg-[#FFD300] hover:text-black transition-all duration-200"
                    aria-label="Facebook"
                  >
                    <Facebook className="w-6 h-6" />
                  </a>
                  <a
                    href="https://linkedin.com/company/sultanstamp"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-12 h-12 rounded-full bg-black text-white hover:bg-[#FFD300] hover:text-black transition-all duration-200"
                    aria-label="LinkedIn"
                  >
                    <Linkedin className="w-6 h-6" />
                  </a>
                </div>
              </div>

              {/* Location Info (Optional) */}
              {companyInfo.address && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                  <div className="flex items-center mb-4">
                    <div className="bg-black rounded-full p-3">
                      <MapPin className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="ml-4 text-xl font-bold text-black">Location</h3>
                  </div>
                  <p className="text-gray-700 text-sm">
                    {companyInfo.address}
                  </p>
                </div>
              )}

              {/* Business Hours */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <h3 className="text-xl font-bold text-black mb-4">
                  Business Hours
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-700 font-medium">Monday - Friday</span>
                    <span className="text-black">9:00 AM - 6:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700 font-medium">Saturday</span>
                    <span className="text-black">10:00 AM - 4:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700 font-medium">Sunday</span>
                    <span className="text-black">Closed</span>
                  </div>
                </div>
                <p className="text-gray-600 text-xs mt-4">
                  Emergency bookings available with priority scheduling.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_Contact;