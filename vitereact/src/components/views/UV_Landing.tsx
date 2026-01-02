import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { CheckCircle, Clock, DollarSign, ArrowRight, Sparkles, Upload, MessageSquare, Calendar, CheckSquare, CreditCard, FileText, Image, Tag, Package, Briefcase, Truck, Award, Zap, Store, Car, Maximize, Building2, Shirt, Lightbulb } from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
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

interface ServicesApiResponse {
  services: Service[];
  total: number;
}

interface GalleryApiResponse {
  items: GalleryItem[];
  total: number;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchTopSellingServices = async (): Promise<Service[]> => {
  const response = await axios.get<ServicesApiResponse>(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/services`,
    {
      params: {
        is_active: true,
        is_top_seller: true,
        limit: 6,
        sort_by: 'name',
        sort_order: 'asc',
      },
    }
  );
  return response.data.services || [];
};

const fetchGalleryPreview = async (): Promise<GalleryItem[]> => {
  const response = await axios.get<GalleryApiResponse>(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/gallery-items`,
    {
      params: {
        is_visible: true,
        limit: 8,
        sort_by: 'sort_order',
        sort_order: 'asc',
      },
    }
  );
  return response.data.items || [];
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_Landing: React.FC = () => {
  const navigate = useNavigate();

  // CRITICAL: Individual selectors, no object destructuring
  const isAuthenticated = useAppStore(
    (state) => state.authentication_state.authentication_status.is_authenticated
  );

  // Fetch top selling services
  const {
    data: topSellingServices = [],
    isLoading: isLoadingServices,
    error: servicesError,
  } = useQuery<Service[]>({
    queryKey: ['top-selling-services'],
    queryFn: fetchTopSellingServices,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  // Fetch gallery preview
  const {
    data: galleryPreviewItems = [],
    isLoading: isLoadingGallery,
    error: galleryError,
  } = useQuery<GalleryItem[]>({
    queryKey: ['gallery-preview'],
    queryFn: fetchGalleryPreview,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  // Navigation handlers
  const handleGetQuoteClick = () => {
    if (isAuthenticated) {
      navigate('/app/quotes/new');
    } else {
      navigate('/login?redirect_url=/app/quotes/new');
    }
  };

  const handleServiceCardClick = (serviceSlug: string) => {
    navigate(`/services/${serviceSlug}`);
  };

  return (
    <>
      {/* Hero Section */}
      <section className="relative bg-black text-white py-20 md:py-32 overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black opacity-90"></div>
        
        {/* Animated gradient orbs for premium lighting effect */}
        <div className="absolute inset-0 overflow-hidden">
          <div 
            className="absolute -top-40 -left-40 w-80 h-80 bg-yellow-400/20 rounded-full blur-3xl animate-pulse"
            style={{ animationDuration: '4s' }}
          ></div>
          <div 
            className="absolute top-1/2 -right-20 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl animate-pulse"
            style={{ animationDuration: '6s', animationDelay: '1s' }}
          ></div>
          <div 
            className="absolute -bottom-20 left-1/3 w-72 h-72 bg-amber-400/15 rounded-full blur-3xl animate-pulse"
            style={{ animationDuration: '5s', animationDelay: '2s' }}
          ></div>
        </div>
        
        {/* Subtle animated gradient overlay */}
        <div 
          className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/5 to-transparent"
          style={{
            animation: 'shimmer 8s ease-in-out infinite',
          }}
        ></div>
        
        <style>{`
          @keyframes shimmer {
            0%, 100% { transform: translateX(-100%); opacity: 0; }
            50% { transform: translateX(100%); opacity: 1; }
          }
        `}</style>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            {/* Brand Positioning */}
            <div className="flex items-center justify-center mb-6">
              <Sparkles className="w-8 h-8 text-yellow-400 mr-3 animate-pulse" />
              <span className="text-yellow-400 font-bold text-sm uppercase tracking-wider">
                Premium Print & Branding Solutions
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Personalise First,
              <br />
              <span className="text-yellow-400">Deliver Excellence</span>
            </h1>

            <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-3xl mx-auto leading-relaxed">
              From business cards to vehicle graphics, we bring your brand to life with 
              disciplined timelines, transparent pricing, and uncompromising quality.
            </p>

            {/* Dual CTAs - Larger and more visible */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
              <button
                onClick={handleGetQuoteClick}
                className="group relative w-full sm:w-auto px-10 py-5 bg-yellow-400 text-black font-bold text-lg rounded-xl 
                         hover:bg-yellow-500 transition-all duration-300 transform hover:scale-105 
                         shadow-lg hover:shadow-yellow-400/30 hover:shadow-2xl flex items-center justify-center"
              >
                Get Your Custom Quote
                <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </button>

              <Link
                to="/gallery"
                className="w-full sm:w-auto px-10 py-5 bg-white text-black font-bold text-lg rounded-xl 
                         hover:bg-gray-100 transition-all duration-300 border-2 border-white 
                         shadow-lg hover:shadow-white/20 hover:shadow-xl transform hover:scale-105
                         flex items-center justify-center"
              >
                View Our Portfolio
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Print Categories Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Promo Ribbon */}
          <div className="flex justify-center mb-10">
            <div className="inline-flex items-center gap-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-full shadow-lg">
              <Truck className="w-5 h-5" />
              <span className="font-semibold text-sm md:text-base">Fast delivery — Premium quality print at great prices</span>
              <Award className="w-5 h-5" />
            </div>
          </div>

          {/* Section Header */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Popular Print Categories
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Explore our most requested print products and get started on your next project
            </p>
          </div>

          {/* Category Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {/* Business Cards */}
            <div className="group bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 md:p-8 border-2 border-blue-100 hover:border-blue-300 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="w-16 h-16 bg-blue-500 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <CreditCard className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Business Cards</h3>
              <p className="text-gray-600 mb-5 text-sm leading-relaxed">
                Make powerful first impressions with premium cards that reflect your brand's professionalism
              </p>
              <Link
                to="/services"
                className="inline-flex items-center px-5 py-2.5 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors duration-200 shadow-md hover:shadow-lg"
              >
                Shop Now
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </div>

            {/* Flyers & Brochures */}
            <div className="group bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-6 md:p-8 border-2 border-orange-100 hover:border-orange-300 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="w-16 h-16 bg-orange-500 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Flyers & Brochures</h3>
              <p className="text-gray-600 mb-5 text-sm leading-relaxed">
                Spread your message effectively with eye-catching designs that capture attention instantly
              </p>
              <Link
                to="/services"
                className="inline-flex items-center px-5 py-2.5 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors duration-200 shadow-md hover:shadow-lg"
              >
                Shop Now
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </div>

            {/* Posters & Banners */}
            <div className="group bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl p-6 md:p-8 border-2 border-purple-100 hover:border-purple-300 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="w-16 h-16 bg-purple-500 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <Image className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Posters & Banners</h3>
              <p className="text-gray-600 mb-5 text-sm leading-relaxed">
                Stand out at events and in-store with large format prints that demand attention
              </p>
              <Link
                to="/services"
                className="inline-flex items-center px-5 py-2.5 bg-purple-500 text-white font-semibold rounded-lg hover:bg-purple-600 transition-colors duration-200 shadow-md hover:shadow-lg"
              >
                Shop Now
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </div>

            {/* Stickers & Labels */}
            <div className="group bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl p-6 md:p-8 border-2 border-pink-100 hover:border-pink-300 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="w-16 h-16 bg-pink-500 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <Tag className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Stickers & Labels</h3>
              <p className="text-gray-600 mb-5 text-sm leading-relaxed">
                Custom stickers and labels that stick in customers' minds and on products everywhere
              </p>
              <Link
                to="/services"
                className="inline-flex items-center px-5 py-2.5 bg-pink-500 text-white font-semibold rounded-lg hover:bg-pink-600 transition-colors duration-200 shadow-md hover:shadow-lg"
              >
                Shop Now
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </div>

            {/* Packaging & Custom Boxes */}
            <div className="group bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl p-6 md:p-8 border-2 border-teal-100 hover:border-teal-300 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="w-16 h-16 bg-teal-500 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <Package className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Packaging & Custom Boxes</h3>
              <p className="text-gray-600 mb-5 text-sm leading-relaxed">
                Elevate your unboxing experience with custom packaging that delights customers
              </p>
              <Link
                to="/services"
                className="inline-flex items-center px-5 py-2.5 bg-teal-500 text-white font-semibold rounded-lg hover:bg-teal-600 transition-colors duration-200 shadow-md hover:shadow-lg"
              >
                Shop Now
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </div>

            {/* Corporate Stationery */}
            <div className="group bg-gradient-to-br from-slate-50 to-gray-100 rounded-2xl p-6 md:p-8 border-2 border-slate-200 hover:border-slate-400 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="w-16 h-16 bg-slate-700 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <Briefcase className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Corporate Stationery</h3>
              <p className="text-gray-600 mb-5 text-sm leading-relaxed">
                Complete your brand identity with letterheads, envelopes, and presentation folders
              </p>
              <Link
                to="/services"
                className="inline-flex items-center px-5 py-2.5 bg-slate-700 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors duration-200 shadow-md hover:shadow-lg"
              >
                Shop Now
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* View All CTA */}
          <div className="text-center mt-12">
            <Link
              to="/services"
              className="inline-flex items-center px-8 py-4 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Zap className="mr-2 w-5 h-5 text-yellow-400" />
              Browse All Products
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Premium Branding & Installation Services Section */}
      <section className="relative py-20 md:py-28 bg-gradient-to-br from-gray-900 via-black to-gray-900 overflow-hidden">
        {/* Subtle premium lighting effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-0 w-64 h-64 bg-yellow-400/3 rounded-full blur-2xl"></div>
        </div>
        
        {/* Subtle grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        ></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/20 px-4 py-2 rounded-full mb-6">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-400 text-sm font-semibold uppercase tracking-wider">Professional Services</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-5 tracking-tight">
              Premium Branding & Installation Services
            </h2>
            <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
              Expert solutions for businesses that want professional finish and long-lasting impact.
            </p>
          </div>

          {/* Premium Service Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Custom Signage & Storefront Branding */}
            <div className="group relative bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-2xl p-8 lg:p-10 border border-gray-700/50 hover:border-yellow-400/30 transition-all duration-500 hover:shadow-2xl hover:shadow-yellow-400/10 transform hover:-translate-y-2">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-yellow-400/20 group-hover:scale-110 transition-transform duration-300">
                  <Store className="w-7 h-7 text-black" />
                </div>
                <h3 className="text-xl lg:text-2xl font-bold text-white mb-3 group-hover:text-yellow-400 transition-colors duration-300">
                  Custom Signage & Storefront Branding
                </h3>
                <p className="text-gray-400 mb-6 leading-relaxed">
                  Transform your business facade with eye-catching signage that commands attention and builds instant brand recognition.
                </p>
                <Link
                  to="/services"
                  className="inline-flex items-center text-yellow-400 font-semibold hover:text-yellow-300 transition-colors duration-200 group/btn"
                >
                  Learn More
                  <ArrowRight className="ml-2 w-4 h-4 group-hover/btn:translate-x-1 transition-transform duration-200" />
                </Link>
              </div>
            </div>

            {/* Vehicle Graphics & Wraps */}
            <div className="group relative bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-2xl p-8 lg:p-10 border border-gray-700/50 hover:border-yellow-400/30 transition-all duration-500 hover:shadow-2xl hover:shadow-yellow-400/10 transform hover:-translate-y-2">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-yellow-400/20 group-hover:scale-110 transition-transform duration-300">
                  <Car className="w-7 h-7 text-black" />
                </div>
                <h3 className="text-xl lg:text-2xl font-bold text-white mb-3 group-hover:text-yellow-400 transition-colors duration-300">
                  Vehicle Graphics & Wraps
                </h3>
                <p className="text-gray-400 mb-6 leading-relaxed">
                  Turn your fleet into mobile billboards with premium vehicle wraps that generate thousands of daily impressions.
                </p>
                <Link
                  to="/services"
                  className="inline-flex items-center text-yellow-400 font-semibold hover:text-yellow-300 transition-colors duration-200 group/btn"
                >
                  Learn More
                  <ArrowRight className="ml-2 w-4 h-4 group-hover/btn:translate-x-1 transition-transform duration-200" />
                </Link>
              </div>
            </div>

            {/* Large-Format Print & Installations */}
            <div className="group relative bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-2xl p-8 lg:p-10 border border-gray-700/50 hover:border-yellow-400/30 transition-all duration-500 hover:shadow-2xl hover:shadow-yellow-400/10 transform hover:-translate-y-2">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-yellow-400/20 group-hover:scale-110 transition-transform duration-300">
                  <Maximize className="w-7 h-7 text-black" />
                </div>
                <h3 className="text-xl lg:text-2xl font-bold text-white mb-3 group-hover:text-yellow-400 transition-colors duration-300">
                  Large-Format Print & Installations
                </h3>
                <p className="text-gray-400 mb-6 leading-relaxed">
                  Make a massive impact with wall murals, exhibition displays, and outdoor installations that stop people in their tracks.
                </p>
                <Link
                  to="/services"
                  className="inline-flex items-center text-yellow-400 font-semibold hover:text-yellow-300 transition-colors duration-200 group/btn"
                >
                  Learn More
                  <ArrowRight className="ml-2 w-4 h-4 group-hover/btn:translate-x-1 transition-transform duration-200" />
                </Link>
              </div>
            </div>

            {/* Corporate Branding Solutions */}
            <div className="group relative bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-2xl p-8 lg:p-10 border border-gray-700/50 hover:border-yellow-400/30 transition-all duration-500 hover:shadow-2xl hover:shadow-yellow-400/10 transform hover:-translate-y-2">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-yellow-400/20 group-hover:scale-110 transition-transform duration-300">
                  <Building2 className="w-7 h-7 text-black" />
                </div>
                <h3 className="text-xl lg:text-2xl font-bold text-white mb-3 group-hover:text-yellow-400 transition-colors duration-300">
                  Corporate Branding Solutions
                </h3>
                <p className="text-gray-400 mb-6 leading-relaxed">
                  End-to-end brand identity services from logo design to complete office branding that reflects your corporate vision.
                </p>
                <Link
                  to="/services"
                  className="inline-flex items-center text-yellow-400 font-semibold hover:text-yellow-300 transition-colors duration-200 group/btn"
                >
                  Learn More
                  <ArrowRight className="ml-2 w-4 h-4 group-hover/btn:translate-x-1 transition-transform duration-200" />
                </Link>
              </div>
            </div>

            {/* Apparel & Merchandise Printing */}
            <div className="group relative bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-2xl p-8 lg:p-10 border border-gray-700/50 hover:border-yellow-400/30 transition-all duration-500 hover:shadow-2xl hover:shadow-yellow-400/10 transform hover:-translate-y-2">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-yellow-400/20 group-hover:scale-110 transition-transform duration-300">
                  <Shirt className="w-7 h-7 text-black" />
                </div>
                <h3 className="text-xl lg:text-2xl font-bold text-white mb-3 group-hover:text-yellow-400 transition-colors duration-300">
                  Apparel & Merchandise Printing
                </h3>
                <p className="text-gray-400 mb-6 leading-relaxed">
                  Custom uniforms, promotional merchandise, and branded apparel that turn your team and customers into brand ambassadors.
                </p>
                <Link
                  to="/services"
                  className="inline-flex items-center text-yellow-400 font-semibold hover:text-yellow-300 transition-colors duration-200 group/btn"
                >
                  Learn More
                  <ArrowRight className="ml-2 w-4 h-4 group-hover/btn:translate-x-1 transition-transform duration-200" />
                </Link>
              </div>
            </div>

            {/* Creative Print Consultancy */}
            <div className="group relative bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-2xl p-8 lg:p-10 border border-gray-700/50 hover:border-yellow-400/30 transition-all duration-500 hover:shadow-2xl hover:shadow-yellow-400/10 transform hover:-translate-y-2">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-yellow-400/20 group-hover:scale-110 transition-transform duration-300">
                  <Lightbulb className="w-7 h-7 text-black" />
                </div>
                <h3 className="text-xl lg:text-2xl font-bold text-white mb-3 group-hover:text-yellow-400 transition-colors duration-300">
                  Creative Print Consultancy
                </h3>
                <p className="text-gray-400 mb-6 leading-relaxed">
                  Expert guidance on materials, techniques, and strategies to maximize the impact and ROI of your print investments.
                </p>
                <Link
                  to="/services"
                  className="inline-flex items-center text-yellow-400 font-semibold hover:text-yellow-300 transition-colors duration-200 group/btn"
                >
                  Learn More
                  <ArrowRight className="ml-2 w-4 h-4 group-hover/btn:translate-x-1 transition-transform duration-200" />
                </Link>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <div className="text-center mt-14">
            <Link
              to="/contact"
              className="inline-flex items-center px-10 py-5 bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold text-lg rounded-xl 
                       hover:from-yellow-500 hover:to-amber-600 transition-all duration-300 shadow-xl shadow-yellow-400/20 
                       hover:shadow-2xl hover:shadow-yellow-400/30 transform hover:scale-105"
            >
              Discuss Your Project
              <ArrowRight className="ml-3 w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Best Sellers Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Best Sellers — Our Most Ordered Print Products
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Shop our top-rated print products trusted by thousands of happy customers
            </p>
          </div>

          {/* Best Sellers Grid - Horizontal Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Business Cards */}
            <div className="group relative bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="relative h-48 bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                <CreditCard className="w-20 h-20 text-blue-500 group-hover:scale-110 transition-transform duration-300" />
                <span className="absolute top-3 right-3 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  Popular
                </span>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-bold text-gray-900 mb-1">100 Business Cards</h3>
                <p className="text-yellow-600 font-semibold text-xl mb-3">From €17.50</p>
                <Link
                  to="/services"
                  className="w-full inline-flex items-center justify-center px-5 py-2.5 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors duration-200"
                >
                  Order Now
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Flyers */}
            <div className="group relative bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="relative h-48 bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center">
                <FileText className="w-20 h-20 text-orange-500 group-hover:scale-110 transition-transform duration-300" />
                <span className="absolute top-3 right-3 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  Best Value
                </span>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Flyers</h3>
                <p className="text-yellow-600 font-semibold text-xl mb-3">From €25</p>
                <Link
                  to="/services"
                  className="w-full inline-flex items-center justify-center px-5 py-2.5 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors duration-200"
                >
                  Order Now
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Vinyl Banners */}
            <div className="group relative bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="relative h-48 bg-gradient-to-br from-purple-100 to-violet-100 flex items-center justify-center">
                <Image className="w-20 h-20 text-purple-500 group-hover:scale-110 transition-transform duration-300" />
                <span className="absolute top-3 right-3 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  Popular
                </span>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Vinyl Banners</h3>
                <p className="text-yellow-600 font-semibold text-xl mb-3">From €40</p>
                <Link
                  to="/services"
                  className="w-full inline-flex items-center justify-center px-5 py-2.5 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors duration-200"
                >
                  Order Now
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Stickers */}
            <div className="group relative bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="relative h-48 bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center">
                <Tag className="w-20 h-20 text-pink-500 group-hover:scale-110 transition-transform duration-300" />
                <span className="absolute top-3 right-3 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  Best Value
                </span>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Stickers</h3>
                <p className="text-yellow-600 font-semibold text-xl mb-3">From €12</p>
                <Link
                  to="/services"
                  className="w-full inline-flex items-center justify-center px-5 py-2.5 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors duration-200"
                >
                  Order Now
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Slim Promo Bar */}
      <section className="py-4 bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 text-black font-semibold text-sm md:text-base">
            <div className="flex items-center gap-2">
              <Tag className="w-5 h-5" />
              <span>Special Offers</span>
            </div>
            <span className="hidden sm:block text-black/50">•</span>
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              <span>Bulk Discounts</span>
            </div>
            <span className="hidden sm:block text-black/50">•</span>
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5" />
              <span>Free Delivery on Select Orders</span>
            </div>
          </div>
        </div>
      </section>

      {/* Customer Confidence Strip */}
      <section className="py-10 md:py-14 bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8">
            {/* Fast Delivery */}
            <div className="flex items-center justify-center gap-4 bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-300">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Truck className="w-7 h-7 text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Fast Delivery</h3>
                <p className="text-gray-600 text-sm">Quick turnaround times</p>
              </div>
            </div>

            {/* Premium Quality */}
            <div className="flex items-center justify-center gap-4 bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-300">
              <div className="w-14 h-14 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Award className="w-7 h-7 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Premium Quality</h3>
                <p className="text-gray-600 text-sm">Guaranteed satisfaction</p>
              </div>
            </div>

            {/* Local Business Support */}
            <div className="flex items-center justify-center gap-4 bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-300">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Store className="w-7 h-7 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Local Business Support</h3>
                <p className="text-gray-600 text-sm">Supporting Irish businesses</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Top Selling Services Section */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">
              Our Top Services
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Discover our most popular solutions, trusted by businesses across Ireland
            </p>
          </div>

          {/* Loading State */}
          {isLoadingServices && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 animate-pulse"
                >
                  <div className="h-6 bg-gray-200 rounded mb-4 w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2 w-full"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2 w-5/6"></div>
                  <div className="h-4 bg-gray-200 rounded mb-6 w-4/6"></div>
                  <div className="h-10 bg-gray-200 rounded w-full"></div>
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {servicesError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <p className="text-red-700 font-medium">
                Unable to load services. Please try again later.
              </p>
            </div>
          )}

          {/* Services Grid */}
          {!isLoadingServices && !servicesError && topSellingServices.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {topSellingServices.map((service) => (
                <div
                  key={service.id}
                  className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 
                           hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 
                           flex flex-col"
                >
                  <h3 className="text-xl font-bold text-black mb-3">{service.name}</h3>
                  <p className="text-gray-600 mb-6 flex-grow leading-relaxed">
                    {service.description.length > 120
                      ? `${service.description.substring(0, 120)}...`
                      : service.description}
                  </p>
                  <button
                    onClick={() => handleServiceCardClick(service.slug)}
                    className="w-full px-6 py-3 bg-black text-white font-semibold rounded-lg 
                             hover:bg-gray-800 transition-all duration-200 flex items-center justify-center"
                  >
                    Learn More
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* No Services State */}
          {!isLoadingServices && !servicesError && topSellingServices.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">
                Our services are currently being updated. Please check back soon!
              </p>
            </div>
          )}

          {/* View All Services Link */}
          {topSellingServices.length > 0 && (
            <div className="text-center mt-12">
              <Link
                to="/services"
                className="inline-flex items-center text-black font-semibold hover:text-gray-700 
                         transition-colors text-lg"
              >
                View All Services
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Gallery Preview Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">
              Our Recent Work
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              See how we've helped businesses stand out with stunning print and branding solutions
            </p>
          </div>

          {/* Loading State */}
          {isLoadingGallery && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div
                  key={i}
                  className="aspect-square bg-gray-200 rounded-lg animate-pulse"
                ></div>
              ))}
            </div>
          )}

          {/* Error State */}
          {galleryError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <p className="text-red-700 font-medium">
                Unable to load gallery. Please try again later.
              </p>
            </div>
          )}

          {/* Gallery Grid */}
          {!isLoadingGallery && !galleryError && galleryPreviewItems.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {galleryPreviewItems.map((item) => (
                <Link
                  key={item.id}
                  to="/gallery"
                  className="group relative aspect-square overflow-hidden rounded-lg shadow-md 
                           hover:shadow-xl transition-all duration-300"
                >
                  <img
                    src={item.image_url}
                    alt={item.title || 'Portfolio item'}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  {item.title && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent 
                                  opacity-0 group-hover:opacity-100 transition-opacity duration-300 
                                  flex items-end p-4">
                      <p className="text-white font-semibold text-sm">{item.title}</p>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}

          {/* View Full Gallery CTA */}
          {galleryPreviewItems.length > 0 && (
            <div className="text-center mt-12">
              <Link
                to="/gallery"
                className="inline-flex items-center px-8 py-4 bg-yellow-400 text-black font-bold 
                         rounded-lg hover:bg-yellow-500 transition-all duration-200 shadow-lg 
                         hover:shadow-xl transform hover:scale-105"
              >
                View Full Portfolio
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">
              How It Works
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Our streamlined process ensures your project is delivered on time, every time
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {/* Step 1 */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 text-center 
                          hover:shadow-xl transition-shadow duration-300">
              <div className="w-16 h-16 bg-yellow-400 text-black rounded-full flex items-center 
                            justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <Sparkles className="w-8 h-8 text-black mx-auto mb-3" />
              <h3 className="text-lg font-bold text-black mb-2">Choose Service</h3>
              <p className="text-sm text-gray-600">
                Select from our range of print and branding solutions
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 text-center 
                          hover:shadow-xl transition-shadow duration-300">
              <div className="w-16 h-16 bg-yellow-400 text-black rounded-full flex items-center 
                            justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <MessageSquare className="w-8 h-8 text-black mx-auto mb-3" />
              <h3 className="text-lg font-bold text-black mb-2">Get Quote</h3>
              <p className="text-sm text-gray-600">
                Provide project details and receive transparent pricing
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 text-center 
                          hover:shadow-xl transition-shadow duration-300">
              <div className="w-16 h-16 bg-yellow-400 text-black rounded-full flex items-center 
                            justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <Calendar className="w-8 h-8 text-black mx-auto mb-3" />
              <h3 className="text-lg font-bold text-black mb-2">Book Slot</h3>
              <p className="text-sm text-gray-600">
                Choose your preferred delivery timeline
              </p>
            </div>

            {/* Step 4 */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 text-center 
                          hover:shadow-xl transition-shadow duration-300">
              <div className="w-16 h-16 bg-yellow-400 text-black rounded-full flex items-center 
                            justify-center text-2xl font-bold mx-auto mb-4">
                4
              </div>
              <CheckSquare className="w-8 h-8 text-black mx-auto mb-3" />
              <h3 className="text-lg font-bold text-black mb-2">Approve Proof</h3>
              <p className="text-sm text-gray-600">
                Review and approve your design before production
              </p>
            </div>

            {/* Step 5 */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 text-center 
                          hover:shadow-xl transition-shadow duration-300">
              <div className="w-16 h-16 bg-yellow-400 text-black rounded-full flex items-center 
                            justify-center text-2xl font-bold mx-auto mb-4">
                5
              </div>
              <Upload className="w-8 h-8 text-black mx-auto mb-3" />
              <h3 className="text-lg font-bold text-black mb-2">Receive Order</h3>
              <p className="text-sm text-gray-600">
                Get your high-quality print delivered on schedule
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Blocks Section */}
      <section className="py-16 md:py-24 bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why Choose SultanStamp?
            </h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Three core principles that drive everything we do
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Quality */}
            <div className="bg-gray-900 rounded-xl p-8 text-center hover:bg-gray-800 
                          transition-colors duration-300 border border-gray-800">
              <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-black" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-yellow-400">Uncompromising Quality</h3>
              <p className="text-gray-300 leading-relaxed">
                Premium materials, expert craftsmanship, and rigorous quality control 
                ensure your brand looks its absolute best
              </p>
            </div>

            {/* Timelines */}
            <div className="bg-gray-900 rounded-xl p-8 text-center hover:bg-gray-800 
                          transition-colors duration-300 border border-gray-800">
              <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-black" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-yellow-400">Disciplined Timelines</h3>
              <p className="text-gray-300 leading-relaxed">
                Clear deadlines, real-time tracking, and on-schedule delivery. 
                Your project arrives when we promise it will
              </p>
            </div>

            {/* Pricing */}
            <div className="bg-gray-900 rounded-xl p-8 text-center hover:bg-gray-800 
                          transition-colors duration-300 border border-gray-800">
              <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-8 h-8 text-black" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-yellow-400">Transparent Pricing</h3>
              <p className="text-gray-300 leading-relaxed">
                No hidden fees, no surprises. Get instant quotes with detailed breakdowns 
                before you commit
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-16 md:py-20 bg-gradient-to-br from-yellow-400 to-yellow-500">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">
            Ready to Elevate Your Brand?
          </h2>
          <p className="text-lg text-gray-900 mb-8 max-w-2xl mx-auto">
            Get your custom quote in minutes and start your project with Ireland's 
            most reliable print partner
          </p>
          <button
            onClick={handleGetQuoteClick}
            className="inline-flex items-center px-10 py-5 bg-black text-white font-bold 
                     rounded-lg hover:bg-gray-800 transition-all duration-200 shadow-xl 
                     hover:shadow-2xl transform hover:scale-105 text-lg"
          >
            Get Your Free Quote Now
            <ArrowRight className="ml-3 w-6 h-6" />
          </button>
        </div>
      </section>
    </>
  );
};

export default UV_Landing;