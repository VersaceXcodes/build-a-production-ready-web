import React, { useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { Check, X, ArrowRight, Clock, RotateCcw, AlertCircle, Loader2 } from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS (from Zod schemas)
// ============================================================================

interface TierPackage {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  revision_limit: number;
  turnaround_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface TierFeature {
  id: string;
  tier_id: string;
  group_name: string;
  feature_key: string;
  feature_label: string;
  feature_value: string;
  is_included: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface TierPackagesResponse {
  tiers: TierPackage[];
}

interface TierFeaturesResponse {
  features: TierFeature[];
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchTierPackages = async (): Promise<TierPackage[]> => {
  const response = await axios.get<TierPackagesResponse>(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/tier-packages`,
    {
      params: {
        is_active: true,
      },
    }
  );
  return response.data.tiers;
};

const fetchTierFeatures = async (tier_id: string): Promise<TierFeature[]> => {
  const response = await axios.get<TierFeaturesResponse>(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/tier-packages/${tier_id}/features`
  );
  return response.data.features;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_Pricing: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sectionParam = searchParams.get('section');

  // CRITICAL: Individual Zustand selectors (no object destructuring)
  const isAuthenticated = useAppStore(
    (state) => state.authentication_state.authentication_status.is_authenticated
  );

  // Fetch tier packages
  const {
    data: tierPackages = [],
    isLoading: isLoadingTiers,
    error: tierPackagesError,
  } = useQuery<TierPackage[], Error>({
    queryKey: ['tier-packages'],
    queryFn: fetchTierPackages,
    staleTime: 5 * 60 * 1000, // 5 minutes (pricing changes infrequently)
    retry: 2,
  });

  // Fetch features for all tiers (parallel queries)
  const tierFeaturesQueries = useQuery({
    queryKey: ['tier-features', tierPackages.map((t) => t.id)],
    queryFn: async () => {
      if (tierPackages.length === 0) return [];
      const featuresPromises = tierPackages.map((tier) => fetchTierFeatures(tier.id));
      const featuresArrays = await Promise.all(featuresPromises);
      return featuresArrays.flat();
    },
    enabled: tierPackages.length > 0,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  const tierFeatures = tierFeaturesQueries.data || [];
  const isLoadingFeatures = tierFeaturesQueries.isLoading;
  const featuresError = tierFeaturesQueries.error;

  // Group features by group_name and tier_id
  const featuresByGroup = useMemo(() => {
    const groups: Record<string, Record<string, TierFeature[]>> = {};

    tierFeatures.forEach((feature) => {
      if (!groups[feature.group_name]) {
        groups[feature.group_name] = {};
      }
      if (!groups[feature.group_name][feature.tier_id]) {
        groups[feature.group_name][feature.tier_id] = [];
      }
      groups[feature.group_name][feature.tier_id].push(feature);
    });

    // Sort features within each group by sort_order
    Object.keys(groups).forEach((groupName) => {
      Object.keys(groups[groupName]).forEach((tierId) => {
        groups[groupName][tierId].sort((a, b) => a.sort_order - b.sort_order);
      });
    });

    return groups;
  }, [tierFeatures]);

  // Navigate to quote builder with auth check
  const handleGetQuoteClick = () => {
    if (isAuthenticated) {
      navigate('/app/quotes/new');
    } else {
      navigate('/login?redirect_url=/app/quotes/new');
    }
  };

  // Scroll to section if section param exists
  React.useEffect(() => {
    if (sectionParam) {
      const element = document.getElementById(sectionParam);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [sectionParam]);

  const isLoading = isLoadingTiers || isLoadingFeatures;
  const hasError = tierPackagesError || featuresError;

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-gray-900 to-black py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
                Transparent, Custom Pricing for Every Project
              </h1>
              <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                At SultanStamp, every project is unique. We don't believe in one-size-fits-all
                pricing. Instead, we offer custom quotes tailored to your specific needs, with
                clear tier-based service levels to match your requirements.
              </p>
              <button
                onClick={handleGetQuoteClick}
                className="inline-flex items-center gap-2 bg-yellow-400 text-black px-8 py-4 rounded-lg font-bold text-lg hover:bg-yellow-300 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
              >
                Get Your Custom Quote
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </section>

        {/* Error State */}
        {hasError && (
          <section className="py-12 bg-red-50 border-b border-red-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3 text-red-800">
                <AlertCircle className="w-6 h-6 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Unable to load pricing information</p>
                  <p className="text-sm text-red-700 mt-1">
                    Please try refreshing the page or contact us directly for pricing details.
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Loading State */}
        {isLoading && (
          <section className="py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-12 h-12 text-yellow-400 animate-spin mb-4" />
                <p className="text-gray-600 font-medium">Loading pricing information...</p>
              </div>
            </div>
          </section>
        )}

        {/* Custom Pricing Statement */}
        {!isLoading && !hasError && (
          <>
            <section className="py-16 bg-white border-b border-gray-200">
              <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-400 rounded-xl p-8 md:p-10">
                  <h2 className="text-2xl md:text-3xl font-bold text-black mb-4">
                    Why Custom Pricing?
                  </h2>
                  <p className="text-lg text-gray-800 mb-4 leading-relaxed">
                    Every project has unique requirements—from materials and complexity to
                    quantity and timeline. Custom pricing ensures you only pay for what you
                    need, with transparent cost breakdowns and no hidden fees.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    <div className="flex items-start gap-3">
                      <div className="bg-yellow-400 rounded-full p-2 flex-shrink-0">
                        <Check className="w-5 h-5 text-black" />
                      </div>
                      <div>
                        <p className="font-semibold text-black">No Surprises</p>
                        <p className="text-sm text-gray-700">
                          Detailed quotes before you commit
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="bg-yellow-400 rounded-full p-2 flex-shrink-0">
                        <Check className="w-5 h-5 text-black" />
                      </div>
                      <div>
                        <p className="font-semibold text-black">Pay for What You Need</p>
                        <p className="text-sm text-gray-700">
                          Tailored pricing for your requirements
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Tier Comparison Section */}
            <section id="tiers" className="py-16 bg-gray-50">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                  <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">
                    Service Tier Comparison
                  </h2>
                  <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                    Choose the service level that matches your project needs. All tiers include
                    professional design and production—the differences are in turnaround time,
                    revisions, and additional features.
                  </p>
                </div>

                {/* Mobile Accordion View (< 768px) */}
                <div className="md:hidden space-y-4">
                  {tierPackages.map((tier) => {
                    const tierFeaturesList = featuresByGroup;
                    const groupNames = Object.keys(tierFeaturesList);

                    return (
                      <div
                        key={tier.id}
                        className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden shadow-lg"
                      >
                        {/* Tier Header */}
                        <div className="bg-gradient-to-br from-black to-gray-900 p-6">
                          <h3 className="text-2xl font-bold text-white mb-2">{tier.name}</h3>
                          {tier.description && (
                            <p className="text-gray-300 text-sm mb-4">{tier.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-yellow-400">
                            <div className="flex items-center gap-2">
                              <Clock className="w-5 h-5" />
                              <span className="font-semibold">
                                {tier.turnaround_days} day
                                {tier.turnaround_days !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <RotateCcw className="w-5 h-5" />
                              <span className="font-semibold">
                                {tier.revision_limit === 0
                                  ? 'Unlimited'
                                  : `${tier.revision_limit} revision${
                                      tier.revision_limit !== 1 ? 's' : ''
                                    }`}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Tier Features */}
                        <div className="p-6 space-y-4">
                          {groupNames.map((groupName) => {
                            const featuresForTier = tierFeaturesList[groupName][tier.id] || [];
                            if (featuresForTier.length === 0) return null;

                            return (
                              <div key={groupName}>
                                <h4 className="font-bold text-black text-sm uppercase tracking-wide mb-2 pb-2 border-b border-gray-200">
                                  {groupName}
                                </h4>
                                <ul className="space-y-2">
                                  {featuresForTier.map((feature) => (
                                    <li
                                      key={feature.id}
                                      className="flex items-start gap-2 text-sm"
                                    >
                                      {feature.is_included ? (
                                        <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                      ) : (
                                        <X className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                                      )}
                                      <span
                                        className={
                                          feature.is_included
                                            ? 'text-gray-900'
                                            : 'text-gray-400 line-through'
                                        }
                                      >
                                        {feature.feature_label}: {feature.feature_value}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table View (>= 768px) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full bg-white rounded-xl border-2 border-gray-200 overflow-hidden shadow-lg">
                    <thead>
                      <tr className="bg-gradient-to-br from-black to-gray-900">
                        <th className="text-left p-6 text-white font-bold text-lg w-1/4">
                          Features
                        </th>
                        {tierPackages.map((tier) => (
                          <th
                            key={tier.id}
                            className="text-center p-6 border-l border-gray-700 w-1/4"
                          >
                            <div className="text-white">
                              <p className="text-xl font-bold mb-2">{tier.name}</p>
                              {tier.description && (
                                <p className="text-sm text-gray-300 mb-3">{tier.description}</p>
                              )}
                              <div className="flex flex-col gap-2 text-yellow-400 text-sm">
                                <div className="flex items-center justify-center gap-2">
                                  <Clock className="w-4 h-4" />
                                  <span className="font-semibold">
                                    {tier.turnaround_days} day
                                    {tier.turnaround_days !== 1 ? 's' : ''}
                                  </span>
                                </div>
                                <div className="flex items-center justify-center gap-2">
                                  <RotateCcw className="w-4 h-4" />
                                  <span className="font-semibold">
                                    {tier.revision_limit === 0
                                      ? 'Unlimited'
                                      : `${tier.revision_limit} revision${
                                          tier.revision_limit !== 1 ? 's' : ''
                                        }`}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(featuresByGroup).map((groupName, groupIndex) => {
                        const featuresInGroup = featuresByGroup[groupName];
                        const allFeaturesForGroup: TierFeature[] = [];

                        // Collect all unique features across all tiers for this group
                        Object.values(featuresInGroup).forEach((tierFeatures) => {
                          tierFeatures.forEach((feature) => {
                            if (
                              !allFeaturesForGroup.find(
                                (f) => f.feature_key === feature.feature_key
                              )
                            ) {
                              allFeaturesForGroup.push(feature);
                            }
                          });
                        });

                        allFeaturesForGroup.sort((a, b) => a.sort_order - b.sort_order);

                        return (
                          <React.Fragment key={groupName}>
                            {/* Group Header Row */}
                            <tr className="bg-gray-100 border-t-2 border-gray-300">
                              <td
                                colSpan={tierPackages.length + 1}
                                className="p-4 font-bold text-black text-sm uppercase tracking-wide"
                              >
                                {groupName}
                              </td>
                            </tr>

                            {/* Feature Rows */}
                            {allFeaturesForGroup.map((baseFeature, featureIndex) => (
                              <tr
                                key={baseFeature.feature_key}
                                className={
                                  featureIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                }
                              >
                                <td className="p-4 text-gray-900 font-medium border-r border-gray-200">
                                  {baseFeature.feature_label}
                                </td>
                                {tierPackages.map((tier) => {
                                  const feature = featuresInGroup[tier.id]?.find(
                                    (f) => f.feature_key === baseFeature.feature_key
                                  );

                                  return (
                                    <td
                                      key={tier.id}
                                      className="p-4 text-center border-l border-gray-200"
                                    >
                                      {feature ? (
                                        feature.is_included ? (
                                          <div className="flex flex-col items-center gap-1">
                                            <Check className="w-6 h-6 text-green-600" />
                                            <span className="text-sm text-gray-700">
                                              {feature.feature_value}
                                            </span>
                                          </div>
                                        ) : (
                                          <X className="w-6 h-6 text-gray-400 mx-auto" />
                                        )
                                      ) : (
                                        <span className="text-gray-400 text-sm">—</span>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* Pricing Factors Section */}
            <section id="factors" className="py-16 bg-white border-t border-gray-200">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                  <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">
                    What Affects Your Price?
                  </h2>
                  <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                    Understanding the factors that influence pricing helps you make informed
                    decisions about your project.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Factor 1: Quantity */}
                  <div className="bg-gray-50 rounded-xl p-8 border border-gray-200">
                    <div className="bg-yellow-400 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                      <span className="text-2xl font-bold text-black">1</span>
                    </div>
                    <h3 className="text-2xl font-bold text-black mb-3">Quantity</h3>
                    <p className="text-gray-700 leading-relaxed">
                      Larger print runs typically result in lower per-unit costs due to
                      economies of scale. We offer volume discounts for bulk orders.
                    </p>
                  </div>

                  {/* Factor 2: Complexity */}
                  <div className="bg-gray-50 rounded-xl p-8 border border-gray-200">
                    <div className="bg-yellow-400 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                      <span className="text-2xl font-bold text-black">2</span>
                    </div>
                    <h3 className="text-2xl font-bold text-black mb-3">Design Complexity</h3>
                    <p className="text-gray-700 leading-relaxed">
                      Projects with intricate designs, multiple colors, special effects, or
                      custom shapes may require additional production time and specialized
                      techniques.
                    </p>
                  </div>

                  {/* Factor 3: Materials */}
                  <div className="bg-gray-50 rounded-xl p-8 border border-gray-200">
                    <div className="bg-yellow-400 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                      <span className="text-2xl font-bold text-black">3</span>
                    </div>
                    <h3 className="text-2xl font-bold text-black mb-3">Materials & Finishes</h3>
                    <p className="text-gray-700 leading-relaxed">
                      Premium materials, special coatings, or unique substrates impact both
                      material costs and production processes.
                    </p>
                  </div>

                  {/* Factor 4: Timeline */}
                  <div className="bg-gray-50 rounded-xl p-8 border border-gray-200">
                    <div className="bg-yellow-400 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                      <span className="text-2xl font-bold text-black">4</span>
                    </div>
                    <h3 className="text-2xl font-bold text-black mb-3">Timeline</h3>
                    <p className="text-gray-700 leading-relaxed">
                      Your chosen service tier determines turnaround time. Rush orders or
                      emergency bookings may incur additional fees.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Terms & Fees Section */}
            <section id="terms" className="py-16 bg-gray-50 border-t border-gray-200">
              <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                  <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">
                    Payment Terms & Fees
                  </h2>
                  <p className="text-lg text-gray-600">
                    We believe in transparency. Here's what you need to know about payments.
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Deposit Requirement */}
                  <div className="bg-white rounded-xl p-8 border-2 border-gray-200 shadow-lg">
                    <div className="flex items-start gap-4">
                      <div className="bg-yellow-400 rounded-lg p-3 flex-shrink-0">
                        <svg
                          className="w-6 h-6 text-black"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-black mb-2">
                          50% Deposit Required
                        </h3>
                        <p className="text-gray-700 leading-relaxed mb-4">
                          We require a 50% deposit to begin production on all projects. This
                          deposit secures your spot in our production schedule and covers
                          initial material costs.
                        </p>
                        <ul className="space-y-2 text-gray-700">
                          <li className="flex items-start gap-2">
                            <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <span>
                              Deposit due upon quote approval before production begins
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <span>Remaining balance due upon project completion</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <span>
                              Secure payment processing via credit/debit card or bank transfer
                            </span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Emergency Booking Fee */}
                  <div className="bg-white rounded-xl p-8 border-2 border-yellow-400 shadow-lg">
                    <div className="flex items-start gap-4">
                      <div className="bg-yellow-400 rounded-lg p-3 flex-shrink-0">
                        <AlertCircle className="w-6 h-6 text-black" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-black mb-2">
                          Emergency Booking Fee: +20%
                        </h3>
                        <p className="text-gray-700 leading-relaxed mb-4">
                          Need your project completed urgently? Our emergency booking service
                          prioritizes your project and adjusts our production schedule to meet
                          tight deadlines.
                        </p>
                        <ul className="space-y-2 text-gray-700">
                          <li className="flex items-start gap-2">
                            <ArrowRight className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                            <span>
                              20% urgent fee added to total project cost for priority
                              scheduling
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <ArrowRight className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                            <span>
                              Available only when production capacity allows—subject to
                              approval
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <ArrowRight className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                            <span>Guaranteed rush turnaround based on your chosen tier</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Additional Terms */}
                  <div className="bg-gray-100 rounded-xl p-6 border border-gray-300">
                    <p className="text-sm text-gray-700">
                      <strong className="text-black">Payment Methods:</strong> We accept all
                      major credit cards, debit cards, and bank transfers. For large B2B
                      accounts, NET-30 payment terms may be available upon approval.
                    </p>
                    <p className="text-sm text-gray-700 mt-3">
                      For detailed information about refunds, cancellations, and file
                      requirements, please review our{' '}
                      <Link to="/policies" className="text-yellow-600 hover:text-yellow-700 font-semibold underline">
                        full policies
                      </Link>
                      .
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Final CTA Section */}
            <section className="py-16 bg-gradient-to-br from-black to-gray-900">
              <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  Ready to Get Started?
                </h2>
                <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                  Request your custom quote today. It's fast, free, and there's no obligation.
                  Our team will review your requirements and provide a detailed quote within 24
                  hours.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <button
                    onClick={handleGetQuoteClick}
                    className="inline-flex items-center gap-2 bg-yellow-400 text-black px-8 py-4 rounded-lg font-bold text-lg hover:bg-yellow-300 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 w-full sm:w-auto"
                  >
                    Get Your Custom Quote
                    <ArrowRight className="w-5 h-5" />
                  </button>
                  <Link
                    to="/contact"
                    className="inline-flex items-center gap-2 bg-white text-black px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition-all duration-200 border-2 border-white w-full sm:w-auto"
                  >
                    Contact Us
                  </Link>
                </div>
                <p className="text-gray-400 text-sm mt-6">
                  Questions? Our team is here to help.{' '}
                  <Link
                    to="/contact"
                    className="text-yellow-400 hover:text-yellow-300 underline font-semibold"
                  >
                    Get in touch
                  </Link>
                </p>
              </div>
            </section>
          </>
        )}
      </div>
    </>
  );
};

export default UV_Pricing;