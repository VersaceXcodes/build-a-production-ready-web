import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { X, Filter, Image as ImageIcon, ExternalLink } from 'lucide-react';

// Types based on Zod schemas
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

interface CaseStudy {
  id: string;
  title: string;
  slug: string;
  client_name: string | null;
  description: string;
  service_ids: string[];
  tier_id: string | null;
  image_urls: string[];
  created_at: string;
  updated_at: string;
}

const UV_Gallery: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // State variables
  const [selectedCaseStudy, setSelectedCaseStudy] = useState<CaseStudy | null>(null);
  const [activeFilters, setActiveFilters] = useState({
    category: searchParams.get('category') || null,
    tag: searchParams.get('tag') || null,
  });

  // Fetch gallery items
  const {
    data: galleryData,
    isLoading: isLoadingGallery,
    error: galleryError,
  } = useQuery({
    queryKey: ['gallery-items', activeFilters.category, activeFilters.tag],
    queryFn: async () => {
      const params = new URLSearchParams({
        is_visible: 'true',
        limit: '50',
        sort_by: 'sort_order',
        sort_order: 'asc',
      });

      if (activeFilters.category) {
        params.append('category', activeFilters.category);
      }
      if (activeFilters.tag) {
        params.append('tag', activeFilters.tag);
      }

      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/gallery-items?${params.toString()}`
      );

      return response.data;
    },
    staleTime: 60000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Extract items and filter options
  const galleryItems: GalleryItem[] = galleryData?.items || [];
  const availableCategories = [...new Set(galleryItems.map(item => item.category).filter(Boolean))] as string[];
  const availableTags = [...new Set(galleryItems.map(item => item.tag).filter(Boolean))] as string[];

  // Fetch case study when modal opens
  const {
    data: caseStudyData,
    isLoading: isLoadingCaseStudy,
    refetch: refetchCaseStudy,
  } = useQuery({
    queryKey: ['case-study', selectedCaseStudy?.id],
    queryFn: async () => {
      if (!selectedCaseStudy?.id) return null;

      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/case-studies/${selectedCaseStudy.id}`
      );

      return response.data;
    },
    enabled: false,
    staleTime: 60000,
  });

  // Update URL params when filters change
  useEffect(() => {
    const newParams = new URLSearchParams();
    if (activeFilters.category) {
      newParams.set('category', activeFilters.category);
    }
    if (activeFilters.tag) {
      newParams.set('tag', activeFilters.tag);
    }
    setSearchParams(newParams);
  }, [activeFilters, setSearchParams]);

  // Sync filters with URL params on mount
  useEffect(() => {
    const category = searchParams.get('category');
    const tag = searchParams.get('tag');
    setActiveFilters({
      category: category || null,
      tag: tag || null,
    });
  }, []);

  // Escape key handler for modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedCaseStudy) {
        closeCaseStudy();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [selectedCaseStudy]);

  // Filter actions
  const applyCategoryFilter = (category: string) => {
    setActiveFilters(prev => ({ ...prev, category }));
  };

  const applyTagFilter = (tag: string) => {
    setActiveFilters(prev => ({ ...prev, tag }));
  };

  const clearAllFilters = () => {
    setActiveFilters({ category: null, tag: null });
  };

  const openCaseStudy = async (item: GalleryItem) => {
    if (item.case_study_id) {
      // Set initial case study with item id to trigger query
      setSelectedCaseStudy({ id: item.case_study_id } as CaseStudy);
      // Refetch will populate full data
      const result = await refetchCaseStudy();
      if (result.data) {
        setSelectedCaseStudy(result.data);
      }
    }
  };

  const closeCaseStudy = () => {
    setSelectedCaseStudy(null);
  };

  const navigateToQuoteWithService = (serviceId: string) => {
    navigate(`/app/quotes/new?service_id=${serviceId}`);
  };

  const hasActiveFilters = activeFilters.category || activeFilters.tag;

  return (
    <>
      {/* Header Section */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-black mb-4 leading-tight">
              Our Portfolio
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Explore our comprehensive portfolio showcasing high-quality print, branding, and signage projects
            </p>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Filter Header */}
            <div className="flex items-center gap-3">
              <Filter className="w-5 h-5 text-black" />
              <h2 className="text-lg font-semibold text-black">Filter Gallery</h2>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="ml-4 text-sm font-medium text-gray-600 hover:text-black transition-colors duration-200"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Filter Chips */}
            <div className="flex flex-wrap gap-4">
              {/* Category Filters */}
              {availableCategories.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm font-semibold text-gray-700 mr-2 flex items-center">Categories:</span>
                  {availableCategories.map((category) => (
                    <button
                      key={category}
                      onClick={() => applyCategoryFilter(category)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                        activeFilters.category === category
                          ? 'bg-yellow-400 text-black shadow-lg scale-105'
                          : 'bg-gray-100 text-gray-900 hover:bg-gray-200 border-2 border-gray-300'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              )}

              {/* Tag Filters */}
              {availableTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm font-semibold text-gray-700 mr-2 flex items-center">Tags:</span>
                  {availableTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => applyTagFilter(tag)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                        activeFilters.tag === tag
                          ? 'bg-yellow-400 text-black shadow-lg scale-105'
                          : 'bg-gray-100 text-gray-900 hover:bg-gray-200 border-2 border-gray-300'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="mt-4 flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium text-gray-600">Active Filters:</span>
              {activeFilters.category && (
                <div className="flex items-center gap-2 bg-yellow-100 text-black px-3 py-1 rounded-full text-sm font-semibold border border-yellow-300">
                  Category: {activeFilters.category}
                  <button
                    onClick={() => setActiveFilters(prev => ({ ...prev, category: null }))}
                    className="ml-1 hover:text-gray-700 transition-colors"
                    aria-label="Remove category filter"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              {activeFilters.tag && (
                <div className="flex items-center gap-2 bg-yellow-100 text-black px-3 py-1 rounded-full text-sm font-semibold border border-yellow-300">
                  Tag: {activeFilters.tag}
                  <button
                    onClick={() => setActiveFilters(prev => ({ ...prev, tag: null }))}
                    className="ml-1 hover:text-gray-700 transition-colors"
                    aria-label="Remove tag filter"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {isLoadingGallery ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-yellow-400"></div>
              <p className="text-gray-600 text-lg font-medium">Loading gallery...</p>
            </div>
          </div>
        ) : galleryError ? (
          <div className="bg-red-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-lg">
            <p className="font-semibold">Error loading gallery</p>
            <p className="text-sm mt-1">Please try again later</p>
          </div>
        ) : galleryItems.length === 0 ? (
          <div className="text-center py-16">
            <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-black mb-2">No items found</h3>
            <p className="text-gray-600 mb-6">
              {hasActiveFilters
                ? 'Try adjusting your filters to see more results'
                : 'Gallery items will appear here once added'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="bg-yellow-400 text-black px-6 py-3 rounded-lg font-bold hover:bg-yellow-500 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {galleryItems.map((item) => (
              <div
                key={item.id}
                onClick={() => openCaseStudy(item)}
                className="group relative bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 border-gray-100"
              >
                {/* Image */}
                <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                  <img
                    src={item.image_url}
                    alt={item.title || 'Gallery item'}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      {item.case_study_id ? (
                        <div className="bg-yellow-400 text-black px-6 py-3 rounded-lg font-bold flex items-center gap-2 shadow-xl">
                          View Case Study
                          <ExternalLink className="w-5 h-5" />
                        </div>
                      ) : (
                        <div className="bg-white text-black px-6 py-3 rounded-lg font-bold shadow-xl">
                          View Image
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="absolute top-3 left-3 flex gap-2">
                    {item.category && (
                      <span className="bg-yellow-400 text-black px-3 py-1 rounded-full text-xs font-bold shadow-md">
                        {item.category}
                      </span>
                    )}
                    {item.tag && (
                      <span className="bg-black text-white px-3 py-1 rounded-full text-xs font-bold shadow-md">
                        {item.tag}
                      </span>
                    )}
                  </div>
                </div>

                {/* Title */}
                {item.title && (
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-black line-clamp-2">
                      {item.title}
                    </h3>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Case Study Modal */}
      {selectedCaseStudy && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-75 flex items-center justify-center p-4"
          onClick={closeCaseStudy}
        >
          <div 
            className="relative bg-white rounded-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={closeCaseStudy}
              className="absolute top-4 right-4 z-10 bg-white text-black p-2 rounded-full shadow-lg hover:bg-gray-100 transition-colors border-2 border-gray-300"
              aria-label="Close modal"
            >
              <X className="w-6 h-6" />
            </button>

            {isLoadingCaseStudy ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-4">
                  <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-yellow-400"></div>
                  <p className="text-gray-600 text-lg font-medium">Loading case study...</p>
                </div>
              </div>
            ) : caseStudyData ? (
              <>
                {/* Image Gallery */}
                {caseStudyData.image_urls && caseStudyData.image_urls.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
                    {caseStudyData.image_urls.map((imageUrl: string, index: number) => (
                      <div key={index} className="relative aspect-[4/3] rounded-lg overflow-hidden bg-gray-100 border-2 border-gray-200">
                        <img
                          src={imageUrl}
                          alt={`${caseStudyData.title} - Image ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Content */}
                <div className="px-6 pb-6 space-y-6">
                  {/* Title & Client */}
                  <div>
                    <h2 className="text-3xl md:text-4xl font-bold text-black mb-2 leading-tight">
                      {caseStudyData.title}
                    </h2>
                    {caseStudyData.client_name && (
                      <p className="text-lg text-gray-600">
                        Client: <span className="font-semibold text-black">{caseStudyData.client_name}</span>
                      </p>
                    )}
                  </div>

                  {/* Description */}
                  <div className="prose max-w-none">
                    <p className="text-gray-700 text-base leading-relaxed whitespace-pre-wrap">
                      {caseStudyData.description}
                    </p>
                  </div>

                  {/* Services & Tier */}
                  <div className="flex flex-wrap gap-3">
                    {caseStudyData.service_ids && caseStudyData.service_ids.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-700">Services:</span>
                        {caseStudyData.service_ids.map((serviceId: string) => (
                          <span
                            key={serviceId}
                            className="bg-yellow-400 text-black px-3 py-1 rounded-full text-sm font-bold"
                          >
                            {serviceId}
                          </span>
                        ))}
                      </div>
                    )}
                    {caseStudyData.tier_id && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-700">Tier:</span>
                        <span className="bg-black text-white px-3 py-1 rounded-full text-sm font-bold">
                          {caseStudyData.tier_id}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* CTA Buttons */}
                  <div className="flex flex-wrap gap-4 pt-4 border-t-2 border-gray-200">
                    {caseStudyData.service_ids && caseStudyData.service_ids.length > 0 && (
                      <button
                        onClick={() => navigateToQuoteWithService(caseStudyData.service_ids[0])}
                        className="bg-yellow-400 text-black px-8 py-4 rounded-lg font-bold text-lg hover:bg-yellow-500 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
                      >
                        Request Similar Quote
                        <ExternalLink className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={closeCaseStudy}
                      className="bg-gray-100 text-black px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-200 transition-colors border-2 border-gray-300"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-6">
                <p className="text-center text-gray-600 text-lg">Case study not found</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default UV_Gallery;