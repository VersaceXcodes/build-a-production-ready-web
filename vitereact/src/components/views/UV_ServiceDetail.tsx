import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// ============================================================================
// TYPE DEFINITIONS (from Zod schemas)
// ============================================================================

interface Service {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string;
  requires_booking: boolean;
  requires_proof: boolean;
  is_top_seller: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ServiceOption {
  id: string;
  service_id: string;
  key: string;
  label: string;
  field_type: 'text' | 'select' | 'number' | 'textarea' | 'checkbox';
  required: boolean;
  choices: string[] | null;
  pricing_impact: Record<string, number> | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface GalleryItem {
  id: string;
  image_url: string;
  title: string | null;
  tag: string | null;
  category: string | null;
  service_id: string | null;
  case_study_id: string | null;
  is_visible: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface ServicesResponse {
  services: Service[];
  total: number;
}

interface ServiceOptionsResponse {
  options: ServiceOption[];
}

interface GalleryItemsResponse {
  items: GalleryItem[];
  total: number;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_ServiceDetail: React.FC = () => {
  const { service_slug } = useParams<{ service_slug: string }>();
  const navigate = useNavigate();
  
  // CRITICAL: Individual Zustand selectors (no object destructuring)
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

  // ============================================================================
  // API QUERIES
  // ============================================================================

  // 1. Fetch Service by Slug
  const {
    data: service,
    isLoading: isLoadingService,
    error: serviceError,
  } = useQuery<Service>({
    queryKey: ['service', service_slug],
    queryFn: async () => {
      const response = await axios.get<ServicesResponse>(`${API_BASE_URL}/api/services`, {
        params: {
          query: service_slug,
          is_active: true,
          limit: 1,
        },
      });

      const foundService = response.data.services?.find(s => s.slug === service_slug);
      
      if (!foundService || !foundService.is_active) {
        throw new Error('Service not found or inactive');
      }

      return foundService;
    },
    enabled: !!service_slug,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  // 2. Fetch Service Options (enabled when service loaded)
  const {
    data: serviceOptions,
    isLoading: isLoadingOptions,
  } = useQuery<ServiceOption[]>({
    queryKey: ['service-options', service?.id],
    queryFn: async () => {
      const response = await axios.get<ServiceOptionsResponse>(
        `${API_BASE_URL}/api/services/${service!.id}/options`
      );

      const options = response.data.options || [];
      return options.sort((a, b) => a.sort_order - b.sort_order);
    },
    enabled: !!service?.id,
    staleTime: 5 * 60 * 1000,
  });

  // 3. Fetch Related Gallery Items (enabled when service loaded)
  const {
    data: relatedGalleryItems,
    isLoading: isLoadingGallery,
  } = useQuery<GalleryItem[]>({
    queryKey: ['gallery-items', service?.id],
    queryFn: async () => {
      const response = await axios.get<GalleryItemsResponse>(
        `${API_BASE_URL}/api/gallery-items`,
        {
          params: {
            service_id: service!.id,
            is_visible: true,
            limit: 6,
            sort_by: 'sort_order',
          },
        }
      );

      return response.data.items || [];
    },
    enabled: !!service?.id,
    staleTime: 5 * 60 * 1000,
  });

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleQuoteBuilderClick = () => {
    if (service) {
      navigate(`/app/quotes/new?service_id=${service.id}`);
    }
  };

  // ============================================================================
  // RENDER HELPERS (inline within main render)
  // ============================================================================

  const isLoading = isLoadingService;
  const hasError = !!serviceError;

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <>
      {/* Loading State */}
      {isLoading && (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            {/* Loading Skeleton */}
            <div className="animate-pulse">
              {/* Breadcrumb Skeleton */}
              <div className="h-4 bg-gray-200 rounded w-64 mb-8"></div>
              
              {/* Hero Section Skeleton */}
              <div className="bg-white rounded-xl shadow-lg p-8 mb-12">
                <div className="h-10 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-6"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                  <div className="h-4 bg-gray-200 rounded w-4/6"></div>
                </div>
              </div>

              {/* Options Skeleton */}
              <div className="bg-white rounded-xl shadow-lg p-8 mb-12">
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-6"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="h-20 bg-gray-200 rounded"></div>
                  <div className="h-20 bg-gray-200 rounded"></div>
                  <div className="h-20 bg-gray-200 rounded"></div>
                  <div className="h-20 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error State - Service Not Found */}
      {hasError && !isLoading && (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <div className="bg-white rounded-xl shadow-lg p-12">
              <svg
                className="mx-auto h-24 w-24 text-gray-400 mb-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Service Not Found
              </h1>
              <p className="text-lg text-gray-600 mb-8">
                Sorry, we couldn't find the service you're looking for. It may have been removed or is currently unavailable.
              </p>
              <div className="space-x-4">
                <Link
                  to="/services"
                  className="inline-block px-8 py-3 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors duration-200"
                >
                  View All Services
                </Link>
                <Link
                  to="/"
                  className="inline-block px-8 py-3 bg-gray-100 text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors duration-200"
                >
                  Go Home
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Service Loaded */}
      {service && !isLoading && !hasError && (
        <div className="min-h-screen bg-gray-50 pb-24">
          {/* Breadcrumb Navigation */}
          <div className="bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <nav className="flex items-center space-x-2 text-sm text-gray-600">
                <Link to="/" className="hover:text-gray-900">
                  Home
                </Link>
                <span>/</span>
                <Link to="/services" className="hover:text-gray-900">
                  Services
                </Link>
                <span>/</span>
                <span className="text-gray-900 font-medium">{service.name}</span>
              </nav>
            </div>
          </div>

          {/* Hero Section */}
          <div className="bg-gradient-to-br from-white to-gray-100 py-12 lg:py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 lg:p-12">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
                  <div className="flex-1">
                    {/* Top Seller Badge */}
                    {service.is_top_seller && (
                      <div className="inline-flex items-center px-4 py-2 bg-yellow-400 text-black font-bold rounded-lg mb-4">
                        <svg
                          className="w-5 h-5 mr-2"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        Top Seller
                      </div>
                    )}

                    {/* Service Name */}
                    <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                      {service.name}
                    </h1>

                    {/* Service Description */}
                    <p className="text-lg text-gray-700 leading-relaxed mb-6">
                      {service.description}
                    </p>

                    {/* Service Features */}
                    <div className="flex flex-wrap gap-3 mb-8">
                      {service.requires_booking && (
                        <div className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-900 rounded-lg border border-gray-300">
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="font-medium">Booking Required</span>
                        </div>
                      )}
                      {service.requires_proof && (
                        <div className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-900 rounded-lg border border-gray-300">
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="font-medium">Proof Approval Process</span>
                        </div>
                      )}
                    </div>

                    {/* Desktop CTA */}
                    <div className="hidden lg:block">
                      <button
                        onClick={handleQuoteBuilderClick}
                        className="px-8 py-4 bg-yellow-400 text-black font-bold rounded-lg hover:bg-yellow-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                      >
                        Build Your Quote
                      </button>
                    </div>
                  </div>

                  {/* Side Info Panel (Desktop) */}
                  <div className="hidden lg:block lg:w-80 bg-gray-50 rounded-lg p-6 border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      Quick Facts
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Service Category</p>
                        <p className="font-semibold text-gray-900">Professional Printing</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Options Available</p>
                        <p className="font-semibold text-gray-900">
                          {serviceOptions ? serviceOptions.length : 'Loading...'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Portfolio Examples</p>
                        <p className="font-semibold text-gray-900">
                          {relatedGalleryItems ? relatedGalleryItems.length : 'Loading...'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Service Options Preview Section */}
          {serviceOptions && serviceOptions.length > 0 && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 lg:p-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Configuration Options
                </h2>
                <p className="text-lg text-gray-600 mb-8">
                  These are some of the options you'll be able to configure when building your custom quote:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {serviceOptions.slice(0, 6).map((option) => (
                    <div
                      key={option.id}
                      className="bg-gray-50 rounded-lg p-6 border border-gray-200"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-semibold text-gray-900">
                          {option.label}
                        </h3>
                        {option.required && (
                          <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded">
                            Required
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-gray-600 mb-3">
                        Type: <span className="capitalize font-medium">{option.field_type}</span>
                      </p>

                      {option.choices && option.choices.length > 0 && (
                        <div className="text-sm text-gray-600">
                          <p className="font-medium mb-2">Available choices:</p>
                          <div className="flex flex-wrap gap-2">
                            {option.choices.slice(0, 3).map((choice, idx) => (
                              <span
                                key={idx}
                                className="inline-block px-2 py-1 bg-white border border-gray-300 rounded text-xs"
                              >
                                {choice}
                              </span>
                            ))}
                            {option.choices.length > 3 && (
                              <span className="inline-block px-2 py-1 text-xs text-gray-500">
                                +{option.choices.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {serviceOptions.length > 6 && (
                  <p className="text-gray-600 mt-6 text-center">
                    And {serviceOptions.length - 6} more configuration options available in the quote builder...
                  </p>
                )}
              </div>
            </div>
          )}

          {isLoadingOptions && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 lg:p-12">
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="h-32 bg-gray-200 rounded"></div>
                    <div className="h-32 bg-gray-200 rounded"></div>
                    <div className="h-32 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* File Requirements Section */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 lg:p-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                File Requirements
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                To ensure the best quality results, please prepare your files according to these guidelines:
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Resolution & Quality */}
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                    <svg className="w-6 h-6 mr-2 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                      <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                    </svg>
                    Resolution & Quality
                  </h3>
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700">Minimum 300 DPI for print-ready files</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700">CMYK color mode (not RGB)</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700">Outlined fonts or embedded typefaces</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700">Include 3mm bleed on all sides</span>
                    </li>
                  </ul>
                </div>

                {/* Accepted Formats */}
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                    <svg className="w-6 h-6 mr-2 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    </svg>
                    Accepted File Formats
                  </h3>
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700"><strong>.AI</strong> (Adobe Illustrator) - Preferred</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700"><strong>.PDF</strong> (High Quality Print)</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700"><strong>.PSD</strong> (Adobe Photoshop)</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700"><strong>.EPS</strong> (Encapsulated PostScript)</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700"><strong>.PNG / .JPG</strong> - May require adjustment</span>
                    </li>
                  </ul>
                </div>

                {/* File Size */}
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                    <svg className="w-6 h-6 mr-2 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    File Size & Compression
                  </h3>
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700">Maximum file size: 100MB per file</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700">Compress large files using ZIP or RAR</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700">Multiple files accepted in quote builder</span>
                    </li>
                  </ul>
                </div>

                {/* Additional Notes */}
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                    <svg className="w-6 h-6 mr-2 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    Important Notes
                  </h3>
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700">Files below 300 DPI will show a quality warning</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700">We'll review your files and provide feedback before printing</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700">Contact us if you need help preparing your files</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Related Gallery Section */}
          {relatedGalleryItems && relatedGalleryItems.length > 0 && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 lg:p-12">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">
                      Portfolio Examples
                    </h2>
                    <p className="text-lg text-gray-600">
                      See what we've created for other clients with this service
                    </p>
                  </div>
                  <Link
                    to={`/gallery?service_id=${service.id}`}
                    className="hidden lg:inline-flex items-center px-6 py-3 bg-gray-100 text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors duration-200"
                  >
                    View More Examples
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {relatedGalleryItems.map((item) => (
                    <div
                      key={item.id}
                      className="group relative bg-gray-100 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer"
                    >
                      <div className="aspect-w-16 aspect-h-12 bg-gray-200">
                        <img
                          src={item.image_url}
                          alt={item.title || 'Gallery example'}
                          className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      </div>
                      {item.title && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                          <h3 className="text-white font-semibold text-lg">
                            {item.title}
                          </h3>
                        </div>
                      )}
                      {item.tag && (
                        <div className="absolute top-3 right-3">
                          <span className="inline-block px-3 py-1 bg-yellow-400 text-black text-xs font-bold rounded-full">
                            {item.tag}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Mobile View More Link */}
                <div className="mt-8 text-center lg:hidden">
                  <Link
                    to={`/gallery?service_id=${service.id}`}
                    className="inline-flex items-center px-6 py-3 bg-gray-100 text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors duration-200"
                  >
                    View More Examples
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {isLoadingGallery && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 lg:p-12">
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="h-64 bg-gray-200 rounded"></div>
                    <div className="h-64 bg-gray-200 rounded"></div>
                    <div className="h-64 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Final CTA Section */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="bg-gradient-to-br from-gray-900 to-black rounded-xl shadow-2xl p-8 lg:p-12 text-center">
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
                Ready to Get Started?
              </h2>
              <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                Build your custom quote in minutes and get professional results that exceed expectations.
              </p>
              <button
                onClick={handleQuoteBuilderClick}
                className="inline-flex items-center px-10 py-4 bg-yellow-400 text-black font-bold text-lg rounded-lg hover:bg-yellow-500 transition-all duration-200 shadow-lg hover:shadow-2xl transform hover:scale-105"
              >
                Build Your Quote Now
                <svg className="w-6 h-6 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Sticky CTA Button */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl z-50 p-4 pb-safe">
            <button
              onClick={handleQuoteBuilderClick}
              className="w-full px-6 py-4 bg-yellow-400 text-black font-bold text-lg rounded-lg hover:bg-yellow-500 transition-all duration-200 shadow-lg active:scale-95"
            >
              Build Your Quote
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default UV_ServiceDetail;