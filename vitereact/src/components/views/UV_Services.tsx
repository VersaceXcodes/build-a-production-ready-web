import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

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

interface CategoriesResponse {
  categories: ServiceCategory[];
  total: number;
}

interface ServicesResponse {
  services: Service[];
  total: number;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchServiceCategories = async (): Promise<CategoriesResponse> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/service-categories`,
    {
      params: {
        is_active: true,
        sort_by: 'sort_order',
        sort_order: 'asc',
        limit: 100,
      },
    }
  );
  return response.data;
};

const fetchServices = async (): Promise<ServicesResponse> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/services`,
    {
      params: {
        is_active: true,
        sort_by: 'name',
        sort_order: 'asc',
        limit: 200,
      },
    }
  );
  return response.data;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_Services: React.FC = () => {
  // ========================================================================
  // LOCAL STATE
  // ========================================================================
  const [selected_category_id, setSelectedCategoryId] = useState<string | null>(null);

  // ========================================================================
  // REACT QUERY - FETCH CATEGORIES
  // ========================================================================
  const {
    data: categoriesData,
    isLoading: is_loading_categories,
    isError: is_error_categories,
    error: categories_error,
    refetch: refetchCategories,
  } = useQuery({
    queryKey: ['service-categories', { is_active: true }],
    queryFn: fetchServiceCategories,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const service_categories = categoriesData?.categories || [];

  // ========================================================================
  // REACT QUERY - FETCH SERVICES (WITH GROUPING)
  // ========================================================================
  const {
    data: services_by_category,
    isLoading: is_loading_services,
    isError: is_error_services,
    error: services_error,
    refetch: refetchServices,
  } = useQuery({
    queryKey: ['services', { is_active: true }],
    queryFn: fetchServices,
    select: (data) => {
      const services = data.services || [];
      const grouped: Record<string, Service[]> = {};
      
      services.forEach((service) => {
        if (!grouped[service.category_id]) {
          grouped[service.category_id] = [];
        }
        grouped[service.category_id].push(service);
      });
      
      return grouped;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // ========================================================================
  // COMPUTED VALUES
  // ========================================================================

  // Compute filtered services based on selected category
  const filtered_services = useMemo(() => {
    if (!services_by_category) return [];
    
    if (!selected_category_id) {
      // Return all services (flatten grouped object)
      return Object.values(services_by_category).flat();
    }
    
    return services_by_category[selected_category_id] || [];
  }, [services_by_category, selected_category_id]);

  // Compute service counts per category
  const category_counts = useMemo(() => {
    if (!services_by_category) return {};
    
    const counts: Record<string, number> = {};
    Object.entries(services_by_category).forEach(([categoryId, services]) => {
      counts[categoryId] = services.length;
    });
    return counts;
  }, [services_by_category]);

  // Total services count
  const total_services_count = useMemo(() => {
    return Object.values(category_counts).reduce((sum, count) => sum + count, 0);
  }, [category_counts]);

  // ========================================================================
  // EVENT HANDLERS
  // ========================================================================

  const handleCategoryClick = (categoryId: string | null) => {
    setSelectedCategoryId(categoryId);
    
    // Scroll to services grid on mobile
    if (window.innerWidth < 768) {
      const servicesGrid = document.getElementById('services-grid');
      if (servicesGrid) {
        servicesGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  // ========================================================================
  // RENDER HELPERS
  // ========================================================================

  const renderServiceBadges = (service: Service) => (
    <div className="flex flex-wrap gap-2">
      {service.is_top_seller && (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-400 text-black border-2 border-black">
          ⭐ Popular
        </span>
      )}
      {service.requires_booking && (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-400 text-black">
          📅 Booking Required
        </span>
      )}
      {service.requires_proof && (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white text-black border-2 border-black">
          ✓ Proof Required
        </span>
      )}
    </div>
  );

  // ========================================================================
  // MAIN RENDER
  // ========================================================================

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* ================================================================ */}
        {/* HERO SECTION */}
        {/* ================================================================ */}
        <section className="bg-gradient-to-br from-gray-900 to-black text-white py-12 lg:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
                Our Services
              </h1>
              <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
                Discover our comprehensive range of professional printing, branding, and signage services. From business cards to vehicle wraps, we deliver exceptional quality every time.
              </p>
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* ERROR BANNERS */}
        {/* ================================================================ */}
        {is_error_categories && (
          <div className="bg-yellow-400 border-b-4 border-black">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">⚠️</span>
                  <p className="text-black font-semibold">
                    Unable to load service categories. Please refresh the page.
                  </p>
                </div>
                <button
                  onClick={() => refetchCategories()}
                  className="px-4 py-2 bg-black text-white font-medium rounded-lg hover:bg-gray-800 transition-all duration-200"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* MAIN CONTENT LAYOUT */}
        {/* ================================================================ */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="lg:flex lg:gap-8">
            {/* ============================================================ */}
            {/* SIDEBAR NAVIGATION (DESKTOP ONLY) */}
            {/* ============================================================ */}
            <aside className="hidden lg:block lg:w-64 flex-shrink-0">
              <div className="sticky top-6">
                <nav className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 bg-gradient-to-r from-gray-900 to-black border-b border-gray-200">
                    <h2 className="text-lg font-bold text-white">Categories</h2>
                  </div>
                  
                  <div className="p-4 space-y-2">
                    {/* All Services Button */}
                    <button
                      onClick={() => handleCategoryClick(null)}
                      className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                        selected_category_id === null
                          ? 'bg-yellow-400 text-black border-2 border-black shadow-md'
                          : 'bg-gray-100 text-gray-900 hover:bg-gray-200 border-2 border-transparent'
                      }`}
                      aria-current={selected_category_id === null ? 'true' : undefined}
                    >
                      <div className="flex items-center justify-between">
                        <span>All Services</span>
                        <span className={`text-sm font-bold ${
                          selected_category_id === null ? 'text-black' : 'text-gray-600'
                        }`}>
                          {total_services_count}
                        </span>
                      </div>
                    </button>

                    {/* Category Buttons */}
                    {is_loading_categories ? (
                      <div className="space-y-2">
                        {[1, 2, 3, 4].map((n) => (
                          <div key={n} className="h-12 bg-gray-200 rounded-lg animate-pulse" />
                        ))}
                      </div>
                    ) : (
                      service_categories.map((category) => (
                        <button
                          key={category.id}
                          onClick={() => handleCategoryClick(category.id)}
                          className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                            selected_category_id === category.id
                              ? 'bg-yellow-400 text-black border-2 border-black shadow-md'
                              : 'bg-gray-100 text-gray-900 hover:bg-gray-200 border-2 border-transparent'
                          }`}
                          aria-label={`Filter by ${category.name}`}
                          aria-current={selected_category_id === category.id ? 'true' : undefined}
                        >
                          <div className="flex items-center justify-between">
                            <span>{category.name}</span>
                            <span className={`text-sm font-bold ${
                              selected_category_id === category.id ? 'text-black' : 'text-gray-600'
                            }`}>
                              {category_counts[category.id] || 0}
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </nav>
              </div>
            </aside>

            {/* ============================================================ */}
            {/* MAIN CONTENT AREA */}
            {/* ============================================================ */}
            <main className="flex-1 min-w-0">
              {/* ========================================================== */}
              {/* MOBILE CATEGORY CHIPS */}
              {/* ========================================================== */}
              <div className="lg:hidden mb-8">
                <div className="relative">
                  <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
                    <div className="flex gap-3 pb-2" style={{ scrollSnapType: 'x mandatory' }}>
                      {/* All Services Chip */}
                      <button
                        onClick={() => handleCategoryClick(null)}
                        className={`flex-shrink-0 px-4 py-2 rounded-full font-medium text-sm transition-all duration-200 border-2 ${
                          selected_category_id === null
                            ? 'bg-yellow-400 text-black border-black'
                            : 'bg-white text-gray-900 border-gray-300'
                        }`}
                        style={{ scrollSnapAlign: 'start' }}
                      >
                        All ({total_services_count})
                      </button>

                      {/* Category Chips */}
                      {is_loading_categories ? (
                        <>
                          {[1, 2, 3, 4].map((n) => (
                            <div
                              key={n}
                              className="flex-shrink-0 h-10 w-24 bg-gray-200 rounded-full animate-pulse"
                            />
                          ))}
                        </>
                      ) : (
                        service_categories.map((category) => (
                          <button
                            key={category.id}
                            onClick={() => handleCategoryClick(category.id)}
                            className={`flex-shrink-0 px-4 py-2 rounded-full font-medium text-sm transition-all duration-200 border-2 ${
                              selected_category_id === category.id
                                ? 'bg-yellow-400 text-black border-black'
                                : 'bg-white text-gray-900 border-gray-300'
                            }`}
                            style={{ scrollSnapAlign: 'start' }}
                          >
                            {category.name} ({category_counts[category.id] || 0})
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ========================================================== */}
              {/* SERVICES GRID */}
              {/* ========================================================== */}
              <div id="services-grid">
                {/* Loading State */}
                {is_loading_services && (
                  <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-yellow-400 mx-auto mb-4"></div>
                      <p className="text-gray-600 font-medium">Loading services...</p>
                    </div>
                  </div>
                )}

                {/* Error State */}
                {is_error_services && (
                  <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center">
                    <div className="text-6xl mb-4">😞</div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      Unable to Load Services
                    </h3>
                    <p className="text-gray-600 mb-6">
                      We couldn't fetch our services at this time. Please try again.
                    </p>
                    <button
                      onClick={() => refetchServices()}
                      className="px-6 py-3 bg-yellow-400 text-black font-bold rounded-lg hover:bg-yellow-500 transition-all duration-200 border-2 border-black shadow-lg hover:shadow-xl"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {/* Empty State */}
                {!is_loading_services && !is_error_services && filtered_services.length === 0 && (
                  <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center">
                    <div className="text-6xl mb-4">📦</div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      {selected_category_id
                        ? 'No Services in This Category'
                        : 'No Services Available'}
                    </h3>
                    <p className="text-gray-600 mb-6">
                      {selected_category_id
                        ? 'Check back soon or explore other categories.'
                        : 'Our services catalog is currently being updated. Please check back soon!'}
                    </p>
                    {selected_category_id && (
                      <button
                        onClick={() => handleCategoryClick(null)}
                        className="px-6 py-3 bg-yellow-400 text-black font-bold rounded-lg hover:bg-yellow-500 transition-all duration-200 border-2 border-black"
                      >
                        View All Services
                      </button>
                    )}
                  </div>
                )}

                {/* Services Grid */}
                {!is_loading_services && !is_error_services && filtered_services.length > 0 && (
                  <>
                    {/* Selected Category Header */}
                    {selected_category_id && (
                      <div className="mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">
                          {service_categories.find(cat => cat.id === selected_category_id)?.name || 'Services'}
                        </h2>
                        <p className="text-gray-600 mt-1">
                          {filtered_services.length} service{filtered_services.length !== 1 ? 's' : ''} available
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filtered_services.map((service) => (
                        <article
                          key={service.id}
                          className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-2xl hover:scale-105"
                          aria-label={`${service.name} service`}
                        >
                          {/* Service Image Placeholder */}
                          <div className="h-48 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                            <div className="text-center">
                              <div className="text-6xl mb-2">🖨️</div>
                              <p className="text-gray-600 font-medium">{service.name}</p>
                            </div>
                          </div>

                          {/* Service Content */}
                          <div className="p-6">
                            {/* Service Title */}
                            <h3 className="text-xl font-bold text-gray-900 mb-2 leading-tight">
                              {service.name}
                            </h3>

                            {/* Service Description */}
                            <p className="text-gray-600 text-sm mb-4 line-clamp-3 leading-relaxed">
                              {service.description}
                            </p>

                            {/* Badges */}
                            <div className="mb-6">
                              {renderServiceBadges(service)}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3">
                              <Link
                                to={`/services/${service.slug}`}
                                className="flex-1 px-4 py-3 bg-gray-100 text-gray-900 font-semibold rounded-lg text-center hover:bg-gray-200 transition-all duration-200 border-2 border-gray-300"
                              >
                                View Details
                              </Link>
                              <Link
                                to={`/app/quotes/new?service_id=${service.id}`}
                                className="flex-1 px-4 py-3 bg-yellow-400 text-black font-bold rounded-lg text-center hover:bg-yellow-500 transition-all duration-200 border-2 border-black shadow-lg hover:shadow-xl"
                              >
                                Get Quote
                              </Link>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </main>
          </div>
        </div>

        {/* ================================================================ */}
        {/* BOTTOM CTA SECTION */}
        {/* ================================================================ */}
        <section className="bg-gradient-to-br from-gray-900 to-black text-white py-12 lg:py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Can't Find What You're Looking For?
            </h2>
            <p className="text-lg text-gray-300 mb-8 leading-relaxed">
              We offer custom solutions for unique projects. Get in touch to discuss your specific requirements.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/contact"
                className="px-8 py-4 bg-white text-black font-bold rounded-lg hover:bg-gray-100 transition-all duration-200 text-center border-2 border-white shadow-lg hover:shadow-xl"
              >
                Contact Us
              </Link>
              <Link
                to="/app/quotes/new"
                className="px-8 py-4 bg-yellow-400 text-black font-bold rounded-lg hover:bg-yellow-500 transition-all duration-200 text-center border-2 border-yellow-400 shadow-lg hover:shadow-xl"
              >
                Start Custom Quote
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default UV_Services;