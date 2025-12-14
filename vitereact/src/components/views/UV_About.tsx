import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '@/store/main';
import axios from 'axios';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface AboutContent {
  hero: {
    headline: string;
    subheadline: string;
  };
  narrative: string;
  values: Array<{
    name: string;
    description: string;
    icon_url: string | null;
  }>;
  team: Array<{
    name: string;
    role: string;
    photo_url: string | null;
    bio: string | null;
  }> | null;
}

interface ContentPageResponse {
  id: string;
  page_key: string;
  title: string;
  content: AboutContent;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// API FETCHER FUNCTION
// ============================================================================

const fetchAboutContent = async (): Promise<ContentPageResponse> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/content-pages/about_us`
  );
  return response.data;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_About: React.FC = () => {
  // ============================================================================
  // GLOBAL STATE ACCESS (Individual selectors, no object destructuring)
  // ============================================================================
  const isAuthenticated = useAppStore(
    (state) => state.authentication_state.authentication_status.is_authenticated
  );
  const currentUser = useAppStore(
    (state) => state.authentication_state.current_user
  );

  // ============================================================================
  // DATA FETCHING WITH REACT QUERY
  // ============================================================================
  const {
    data: contentPage,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['about-content'],
    queryFn: fetchAboutContent,
    staleTime: 60 * 60 * 1000, // 1 hour
    retry: 2,
  });

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center min-h-screen">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-black"></div>
              <p className="text-gray-900 text-lg font-semibold">Loading...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-gray-200 p-8">
              <div className="text-center">
                <svg
                  className="mx-auto h-12 w-12 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <h2 className="mt-4 text-2xl font-bold text-gray-900">
                  Failed to Load Content
                </h2>
                <p className="mt-2 text-gray-600">
                  {error instanceof Error
                    ? error.message
                    : 'Unable to fetch about page content. Please try again.'}
                </p>
                <button
                  onClick={() => refetch()}
                  className="mt-6 px-6 py-3 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors duration-200"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        {contentPage && !isLoading && !error && (
          <>
            {/* Hero Section */}
            <section className="bg-gradient-to-br from-gray-50 to-gray-100 py-16 md:py-24 lg:py-32">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-4xl mx-auto">
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                    {contentPage.content.hero.headline || 'About SultanStamp'}
                  </h1>
                  <p className="mt-6 text-xl md:text-2xl text-gray-600 leading-relaxed">
                    {contentPage.content.hero.subheadline ||
                      'Your trusted partner for premium print and branding solutions'}
                  </p>
                </div>
              </div>
            </section>

            {/* Narrative Section */}
            <section className="py-16 md:py-20 lg:py-24">
              <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <article className="prose prose-lg max-w-none">
                  <div className="text-gray-700 leading-relaxed space-y-6">
                    {contentPage.content.narrative
                      .split('\n\n')
                      .map((paragraph, index) => (
                        <p key={index} className="text-lg">
                          {paragraph}
                        </p>
                      ))}
                  </div>
                </article>
              </div>
            </section>

            {/* Values Section */}
            <section className="py-16 md:py-20 lg:py-24 bg-white">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12 lg:mb-16">
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                    Our Values
                  </h2>
                  <p className="mt-4 text-xl text-gray-600">
                    The principles that guide everything we do
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {contentPage.content.values.map((value, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-xl border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-200 p-8"
                    >
                      {value.icon_url && (
                        <div className="w-16 h-16 mb-6">
                          <img
                            src={value.icon_url}
                            alt={`${value.name} icon`}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              // Fallback to emoji/icon if image fails
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      {!value.icon_url && (
                        <div className="w-16 h-16 mb-6 bg-yellow-400 rounded-lg flex items-center justify-center">
                          <svg
                            className="w-8 h-8 text-black"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>
                      )}
                      <h3 className="text-xl font-bold text-gray-900 mb-3">
                        {value.name}
                      </h3>
                      <p className="text-gray-600 leading-relaxed">
                        {value.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Team Section (Optional) */}
            {contentPage.content.team && contentPage.content.team.length > 0 && (
              <section className="py-16 md:py-20 lg:py-24 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="text-center mb-12 lg:mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                      Meet Our Team
                    </h2>
                    <p className="mt-4 text-xl text-gray-600">
                      The people behind your perfect print
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {contentPage.content.team.map((member, index) => (
                      <div
                        key={index}
                        className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden hover:shadow-xl transition-all duration-200"
                      >
                        {member.photo_url && (
                          <div className="aspect-w-3 aspect-h-4 bg-gray-200">
                            <img
                              src={member.photo_url}
                              alt={member.name}
                              className="w-full h-64 object-cover"
                              onError={(e) => {
                                e.currentTarget.src = '';
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                        {!member.photo_url && (
                          <div className="w-full h-64 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                            <svg
                              className="w-24 h-24 text-gray-400"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        )}
                        <div className="p-6">
                          <h3 className="text-xl font-bold text-gray-900 mb-1">
                            {member.name}
                          </h3>
                          <p className="text-yellow-600 font-semibold mb-3">
                            {member.role}
                          </p>
                          {member.bio && (
                            <p className="text-gray-600 leading-relaxed">
                              {member.bio}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* CTA Section */}
            <section className="py-16 md:py-20 lg:py-24 bg-gradient-to-br from-gray-900 to-black">
              <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
                  Ready to Start Your Project?
                </h2>
                <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                  Let's bring your vision to life with our disciplined approach to
                  quality printing and branding.
                </p>
                <Link
                  to={
                    isAuthenticated
                      ? '/app/quotes/new'
                      : '/login?redirect_url=/app/quotes/new'
                  }
                  className="inline-flex items-center px-8 py-4 bg-yellow-400 text-black font-bold text-lg rounded-lg hover:bg-yellow-500 hover:scale-105 transition-all duration-200 shadow-xl"
                >
                  Start Your Project
                  <svg
                    className="ml-2 w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </Link>
                {!isAuthenticated && (
                  <p className="mt-4 text-sm text-gray-400">
                    You'll be prompted to log in or create an account
                  </p>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </>
  );
};

export default UV_About;