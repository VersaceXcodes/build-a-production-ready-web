import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { ChevronDown, ChevronUp, FileText, AlertCircle } from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface PoliciesContent {
  payment_terms: string;
  tax_vat: string;
  file_requirements: string;
  refunds_cancellations: string;
  turnaround_disclaimers: string;
  installation_terms: string;
}

interface PolicySection {
  id: string;
  title: string;
  icon: React.ElementType;
  contentKey: keyof PoliciesContent;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_Policies: React.FC = () => {
  // ========================================================================
  // STATE MANAGEMENT
  // ========================================================================
  
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [expandedAccordions, setExpandedAccordions] = useState<Set<string>>(new Set());
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const observerRef = useRef<IntersectionObserver | null>(null);

  // ========================================================================
  // POLICY SECTIONS CONFIGURATION
  // ========================================================================

  const sections: PolicySection[] = [
    {
      id: 'payment-terms',
      title: 'Payment Terms',
      icon: FileText,
      contentKey: 'payment_terms'
    },
    {
      id: 'tax-vat',
      title: 'Tax & VAT',
      icon: FileText,
      contentKey: 'tax_vat'
    },
    {
      id: 'file-requirements',
      title: 'File Requirements',
      icon: FileText,
      contentKey: 'file_requirements'
    },
    {
      id: 'refunds-cancellations',
      title: 'Refunds & Cancellations',
      icon: FileText,
      contentKey: 'refunds_cancellations'
    },
    {
      id: 'turnaround-disclaimers',
      title: 'Turnaround Disclaimers',
      icon: FileText,
      contentKey: 'turnaround_disclaimers'
    },
    {
      id: 'installation-terms',
      title: 'Installation Terms',
      icon: FileText,
      contentKey: 'installation_terms'
    }
  ];

  // ========================================================================
  // DATA FETCHING
  // ========================================================================

  const { data: policiesContent, isLoading, error } = useQuery<PoliciesContent>({
    queryKey: ['policies-content'],
    queryFn: async () => {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/content-pages/policies`,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    },
    staleTime: 60000,
    retry: 1,
    refetchOnWindowFocus: false,
    select: (data: any) => ({
      payment_terms: data.content?.payment_terms || '<p>Payment terms content coming soon.</p>',
      tax_vat: data.content?.tax_vat || '<p>Tax & VAT information coming soon.</p>',
      file_requirements: data.content?.file_requirements || '<p>File requirements coming soon.</p>',
      refunds_cancellations: data.content?.refunds_cancellations || '<p>Refund & cancellation policy coming soon.</p>',
      turnaround_disclaimers: data.content?.turnaround_disclaimers || '<p>Turnaround disclaimers coming soon.</p>',
      installation_terms: data.content?.installation_terms || '<p>Installation terms coming soon.</p>'
    })
  });

  // ========================================================================
  // SCROLL TO SECTION HANDLER
  // ========================================================================

  const scrollToSection = useCallback((sectionId: string) => {
    const element = sectionRefs.current[sectionId];
    if (element) {
      const headerOffset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });

      // Update URL hash
      window.history.pushState(null, '', `#${sectionId}`);
      setActiveSection(sectionId);
    }
  }, []);

  // ========================================================================
  // ACCORDION TOGGLE HANDLER
  // ========================================================================

  const toggleAccordion = useCallback((sectionId: string) => {
    setExpandedAccordions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  }, []);

  // ========================================================================
  // INTERSECTION OBSERVER SETUP
  // ========================================================================

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            const sectionId = entry.target.getAttribute('data-section-id');
            if (sectionId) {
              setActiveSection(sectionId);
            }
          }
        });
      },
      {
        root: null,
        rootMargin: '-100px 0px -50% 0px',
        threshold: [0, 0.5, 1]
      }
    );

    // Observe all sections
    Object.values(sectionRefs.current).forEach((ref) => {
      if (ref && observerRef.current) {
        observerRef.current.observe(ref);
      }
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [isLoading]);

  // ========================================================================
  // HANDLE URL HASH ON MOUNT
  // ========================================================================

  useEffect(() => {
    if (!isLoading && policiesContent) {
      const hash = window.location.hash.replace('#', '');
      if (hash && sectionRefs.current[hash]) {
        setTimeout(() => {
          scrollToSection(hash);
        }, 100);
      }
    }
  }, [isLoading, policiesContent, scrollToSection]);

  // ========================================================================
  // LOADING STATE
  // ========================================================================

  if (isLoading) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-yellow-400"></div>
            <p className="text-gray-900 text-lg font-semibold">Loading policies...</p>
          </div>
        </div>
      </>
    );
  }

  // ========================================================================
  // ERROR STATE
  // ========================================================================

  if (error) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
            <div className="flex items-center justify-center mb-6">
              <AlertCircle className="w-16 h-16 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-4">
              Failed to Load Policies
            </h2>
            <p className="text-gray-600 text-center mb-6">
              We couldn't load the policy content. Please try again later.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full px-6 py-3 bg-yellow-400 text-black font-semibold rounded-lg hover:bg-yellow-500 transition-colors duration-200"
            >
              Retry
            </button>
          </div>
        </div>
      </>
    );
  }

  // ========================================================================
  // MAIN RENDER
  // ========================================================================

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-gray-900 to-black text-white py-16 lg:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                Policies & Terms
              </h1>
              <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
                Complete transparency on our payment terms, file requirements, refund policies, and service commitments.
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
          <div className="lg:grid lg:grid-cols-12 lg:gap-12">
            {/* Desktop Table of Contents (Sticky Sidebar) */}
            <aside className="hidden lg:block lg:col-span-3">
              <nav className="sticky top-24 bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4 pb-3 border-b border-gray-200">
                  Table of Contents
                </h2>
                <ul className="space-y-2">
                  {sections.map((section) => {
                    const Icon = section.icon;
                    const isActive = activeSection === section.id;
                    
                    return (
                      <li key={section.id}>
                        <button
                          onClick={() => scrollToSection(section.id)}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                            isActive
                              ? 'bg-yellow-400 text-black font-semibold shadow-md'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <Icon className="w-5 h-5 flex-shrink-0" />
                          <span className="text-sm">{section.title}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </aside>

            {/* Mobile Table of Contents (Horizontal Scroll) */}
            <div className="lg:hidden mb-8 -mx-4 sm:mx-0">
              <div className="bg-white border-y lg:border lg:rounded-xl border-gray-200 p-4 overflow-x-auto">
                <div className="flex gap-2 min-w-max">
                  {sections.map((section) => {
                    const isActive = activeSection === section.id;
                    
                    return (
                      <button
                        key={section.id}
                        onClick={() => scrollToSection(section.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                          isActive
                            ? 'bg-yellow-400 text-black shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {section.title}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Policy Content */}
            <main className="lg:col-span-9">
              {/* Desktop: Full Content Visible */}
              <div className="hidden md:block space-y-12">
                {sections.map((section) => (
                  <article
                    key={section.id}
                    ref={(el) => {
                      sectionRefs.current[section.id] = el;
                    }}
                    data-section-id={section.id}
                    className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
                  >
                    <div className="bg-gradient-to-r from-gray-900 to-black px-8 py-6">
                      <h2 className="text-2xl lg:text-3xl font-bold text-white flex items-center gap-3">
                        <section.icon className="w-8 h-8 text-yellow-400" />
                        {section.title}
                      </h2>
                    </div>
                    <div className="p-8 lg:p-12">
                      <div
                        className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-blue-600 prose-strong:text-gray-900 prose-ul:text-gray-700 prose-ol:text-gray-700"
                        dangerouslySetInnerHTML={{
                          __html: policiesContent?.[section.contentKey] || '<p>Content coming soon.</p>'
                        }}
                      />
                    </div>
                  </article>
                ))}
              </div>

              {/* Mobile: Accordion Sections */}
              <div className="md:hidden space-y-4">
                {sections.map((section) => {
                  const isExpanded = expandedAccordions.has(section.id);
                  
                  return (
                    <div
                      key={section.id}
                      ref={(el) => {
                        sectionRefs.current[section.id] = el;
                      }}
                      data-section-id={section.id}
                      className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
                    >
                      <button
                        onClick={() => toggleAccordion(section.id)}
                        className="w-full flex items-center justify-between gap-3 px-6 py-5 bg-gradient-to-r from-gray-900 to-black text-white"
                      >
                        <div className="flex items-center gap-3">
                          <section.icon className="w-6 h-6 text-yellow-400 flex-shrink-0" />
                          <span className="text-lg font-bold text-left">{section.title}</span>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-6 h-6 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-6 h-6 flex-shrink-0" />
                        )}
                      </button>
                      
                      {isExpanded && (
                        <div className="p-6">
                          <div
                            className="prose max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-blue-600 prose-strong:text-gray-900 prose-ul:text-gray-700 prose-ol:text-gray-700"
                            dangerouslySetInnerHTML={{
                              __html: policiesContent?.[section.contentKey] || '<p>Content coming soon.</p>'
                            }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Last Updated Notice */}
              <div className="mt-12 bg-gray-100 rounded-xl p-6 border border-gray-200">
                <p className="text-sm text-gray-600 text-center">
                  <strong className="text-gray-900">Note:</strong> These policies were last updated on{' '}
                  {new Date().toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}. 
                  We reserve the right to modify these terms at any time. Continued use of our services constitutes acceptance of any changes.
                </p>
              </div>
            </main>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_Policies;