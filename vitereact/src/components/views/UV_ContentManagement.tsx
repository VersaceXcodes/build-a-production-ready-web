import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  Save, 
  Plus, 
  Edit2, 
  Trash2, 
  Upload, 
  Eye, 
  EyeOff,
  Image as ImageIcon,
  FileText,
  Layout,
  Info,
  X,
  ChevronUp,
  ChevronDown,
  Check,
  AlertCircle
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ContentPage {
  id: string;
  page_key: string;
  title: string;
  content: any;
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

interface Service {
  id: string;
  name: string;
  slug: string;
  category_id: string;
}

interface GalleryFormData {
  image_url: string;
  title: string | null;
  tag: string | null;
  category: string | null;
  service_id: string | null;
  case_study_id: string | null;
  is_visible: boolean;
  sort_order: number;
}

interface CaseStudyFormData {
  title: string;
  slug: string;
  client_name: string | null;
  description: string;
  service_ids: string[];
  tier_id: string | null;
  image_urls: string[];
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchContentPages = async (authToken: string | null): Promise<ContentPage[]> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/content-pages`,
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    }
  );
  return response.data.pages || [];
};

const fetchContentPageDetail = async (
  pageKey: string,
  authToken: string | null
): Promise<ContentPage> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/content-pages/${pageKey}`,
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    }
  );
  return response.data;
};

const updateContentPage = async (
  pageKey: string,
  data: { title: string; content: any },
  authToken: string | null
): Promise<ContentPage> => {
  const response = await axios.put(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/content-pages/${pageKey}`,
    data,
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
};

const fetchGalleryItems = async (authToken: string | null): Promise<GalleryItem[]> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/gallery-items`,
    {
      params: {
        limit: 100,
        offset: 0,
        sort_by: 'sort_order',
        sort_order: 'asc',
      },
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    }
  );
  return response.data.items || [];
};

const createGalleryItem = async (
  data: GalleryFormData,
  authToken: string | null
): Promise<GalleryItem> => {
  const response = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/gallery-items`,
    data,
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
};

const updateGalleryItem = async (
  id: string,
  data: Partial<GalleryFormData>,
  authToken: string | null
): Promise<GalleryItem> => {
  const response = await axios.put(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/gallery-items/${id}`,
    data,
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
};

const deleteGalleryItem = async (id: string, authToken: string | null): Promise<void> => {
  await axios.delete(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/gallery-items/${id}`,
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    }
  );
};

const fetchCaseStudies = async (authToken: string | null): Promise<CaseStudy[]> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/case-studies`,
    {
      params: {
        limit: 100,
        sort_by: 'created_at',
        sort_order: 'desc',
      },
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    }
  );
  return response.data.case_studies || [];
};

const createCaseStudy = async (
  data: CaseStudyFormData,
  authToken: string | null
): Promise<CaseStudy> => {
  const response = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/case-studies`,
    data,
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
};

const updateCaseStudy = async (
  id: string,
  data: Partial<CaseStudyFormData>,
  authToken: string | null
): Promise<CaseStudy> => {
  const response = await axios.put(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/case-studies/${id}`,
    data,
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
};

const fetchServicesForAssociation = async (authToken: string | null): Promise<Service[]> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/services`,
    {
      params: {
        is_active: true,
        limit: 100,
        sort_by: 'name',
      },
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    }
  );
  return response.data.services.map((service: any) => ({
    id: service.id,
    name: service.name,
    slug: service.slug,
    category_id: service.category_id,
  }));
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_ContentManagement: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // CRITICAL: Individual Zustand selectors
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const currentUser = useAppStore(state => state.authentication_state.current_user);

  // Tab management
  const activeTabParam = searchParams.get('tab') || 'about_us';
  const [activeTab, setActiveTab] = useState<'about_us' | 'how_it_works' | 'gallery' | 'footer'>(
    activeTabParam as any
  );

  // Content page editing state
  const [contentFormData, setContentFormData] = useState<any>(null);

  // Gallery management state
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [editingGalleryItem, setEditingGalleryItem] = useState<GalleryItem | null>(null);
  const [galleryFormData, setGalleryFormData] = useState<GalleryFormData>({
    image_url: '',
    title: null,
    tag: null,
    category: null,
    service_id: null,
    case_study_id: null,
    is_visible: true,
    sort_order: 0,
  });

  // Case study management state
  const [showCaseStudyModal, setShowCaseStudyModal] = useState(false);
  const [editingCaseStudy, setEditingCaseStudy] = useState<CaseStudy | null>(null);
  const [caseStudyFormData, setCaseStudyFormData] = useState<CaseStudyFormData>({
    title: '',
    slug: '',
    client_name: null,
    description: '',
    service_ids: [],
    tier_id: null,
    image_urls: [],
  });

  // Notification state (NO NATIVE ALERTS)
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Update active tab when URL param changes
  useEffect(() => {
    const tab = searchParams.get('tab') || 'about_us';
    setActiveTab(tab as any);
  }, [searchParams]);

  // ============================================================================
  // REACT QUERY - DATA FETCHING
  // ============================================================================

  const { data: contentPages = [], isLoading: isLoadingContent } = useQuery({
    queryKey: ['content-pages'],
    queryFn: () => fetchContentPages(authToken),
    staleTime: 5 * 60 * 1000,
    enabled: !!authToken,
  });

  const { data: selectedContentPage, isLoading: isLoadingContentDetail } = useQuery({
    queryKey: ['content-page-detail', activeTab],
    queryFn: () => fetchContentPageDetail(activeTab, authToken),
    staleTime: 5 * 60 * 1000,
    enabled: !!authToken && (activeTab === 'about_us' || activeTab === 'how_it_works' || activeTab === 'footer'),
  });

  const { data: galleryItems = [], isLoading: isLoadingGallery } = useQuery({
    queryKey: ['gallery-items'],
    queryFn: () => fetchGalleryItems(authToken),
    staleTime: 5 * 60 * 1000,
    enabled: !!authToken && activeTab === 'gallery',
  });

  const { data: caseStudies = [] } = useQuery({
    queryKey: ['case-studies'],
    queryFn: () => fetchCaseStudies(authToken),
    staleTime: 5 * 60 * 1000,
    enabled: !!authToken && activeTab === 'gallery',
  });

  const { data: servicesForAssociation = [] } = useQuery({
    queryKey: ['services-for-association'],
    queryFn: () => fetchServicesForAssociation(authToken),
    staleTime: 10 * 60 * 1000,
    enabled: !!authToken && activeTab === 'gallery',
  });

  // ============================================================================
  // REACT QUERY - MUTATIONS
  // ============================================================================

  const updateContentPageMutation = useMutation({
    mutationFn: (data: { pageKey: string; title: string; content: any }) =>
      updateContentPage(data.pageKey, { title: data.title, content: data.content }, authToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-page-detail'] });
      setNotification({ type: 'success', message: 'Content updated successfully!' });
      setTimeout(() => setNotification(null), 3000);
    },
    onError: (error: any) => {
      setNotification({
        type: 'error',
        message: error.response?.data?.message || 'Failed to update content',
      });
      setTimeout(() => setNotification(null), 5000);
    },
  });

  const createGalleryItemMutation = useMutation({
    mutationFn: (data: GalleryFormData) => createGalleryItem(data, authToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery-items'] });
      setShowGalleryModal(false);
      resetGalleryForm();
      setNotification({ type: 'success', message: 'Gallery item created successfully!' });
      setTimeout(() => setNotification(null), 3000);
    },
    onError: (error: any) => {
      setNotification({
        type: 'error',
        message: error.response?.data?.message || 'Failed to create gallery item',
      });
      setTimeout(() => setNotification(null), 5000);
    },
  });

  const updateGalleryItemMutation = useMutation({
    mutationFn: (data: { id: string; updates: Partial<GalleryFormData> }) =>
      updateGalleryItem(data.id, data.updates, authToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery-items'] });
      setShowGalleryModal(false);
      setEditingGalleryItem(null);
      resetGalleryForm();
      setNotification({ type: 'success', message: 'Gallery item updated successfully!' });
      setTimeout(() => setNotification(null), 3000);
    },
    onError: (error: any) => {
      setNotification({
        type: 'error',
        message: error.response?.data?.message || 'Failed to update gallery item',
      });
      setTimeout(() => setNotification(null), 5000);
    },
  });

  const deleteGalleryItemMutation = useMutation({
    mutationFn: (id: string) => deleteGalleryItem(id, authToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery-items'] });
      setNotification({ type: 'success', message: 'Gallery item deleted successfully!' });
      setTimeout(() => setNotification(null), 3000);
    },
    onError: (error: any) => {
      setNotification({
        type: 'error',
        message: error.response?.data?.message || 'Failed to delete gallery item',
      });
      setTimeout(() => setNotification(null), 5000);
    },
  });

  const createCaseStudyMutation = useMutation({
    mutationFn: (data: CaseStudyFormData) => createCaseStudy(data, authToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case-studies'] });
      setShowCaseStudyModal(false);
      resetCaseStudyForm();
      setNotification({ type: 'success', message: 'Case study created successfully!' });
      setTimeout(() => setNotification(null), 3000);
    },
    onError: (error: any) => {
      setNotification({
        type: 'error',
        message: error.response?.data?.message || 'Failed to create case study',
      });
      setTimeout(() => setNotification(null), 5000);
    },
  });

  const updateCaseStudyMutation = useMutation({
    mutationFn: (data: { id: string; updates: Partial<CaseStudyFormData> }) =>
      updateCaseStudy(data.id, data.updates, authToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case-studies'] });
      setShowCaseStudyModal(false);
      setEditingCaseStudy(null);
      resetCaseStudyForm();
      setNotification({ type: 'success', message: 'Case study updated successfully!' });
      setTimeout(() => setNotification(null), 3000);
    },
    onError: (error: any) => {
      setNotification({
        type: 'error',
        message: error.response?.data?.message || 'Failed to update case study',
      });
      setTimeout(() => setNotification(null), 5000);
    },
  });

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const handleTabChange = (tab: 'about_us' | 'how_it_works' | 'gallery' | 'footer') => {
    setSearchParams({ tab });
    setActiveTab(tab);
  };

  const resetGalleryForm = () => {
    setGalleryFormData({
      image_url: '',
      title: null,
      tag: null,
      category: null,
      service_id: null,
      case_study_id: null,
      is_visible: true,
      sort_order: 0,
    });
  };

  const resetCaseStudyForm = () => {
    setCaseStudyFormData({
      title: '',
      slug: '',
      client_name: null,
      description: '',
      service_ids: [],
      tier_id: null,
      image_urls: [],
    });
  };

  const handleOpenGalleryModal = (item?: GalleryItem) => {
    if (item) {
      setEditingGalleryItem(item);
      setGalleryFormData({
        image_url: item.image_url,
        title: item.title,
        tag: item.tag,
        category: item.category,
        service_id: item.service_id,
        case_study_id: item.case_study_id,
        is_visible: item.is_visible,
        sort_order: item.sort_order,
      });
    } else {
      setEditingGalleryItem(null);
      resetGalleryForm();
    }
    setShowGalleryModal(true);
  };

  const handleSaveGalleryItem = () => {
    if (editingGalleryItem) {
      updateGalleryItemMutation.mutate({
        id: editingGalleryItem.id,
        updates: galleryFormData,
      });
    } else {
      createGalleryItemMutation.mutate(galleryFormData);
    }
  };

  const handleDeleteGalleryItem = (id: string) => {
    if (window.confirm('Are you sure you want to delete this gallery item?')) {
      deleteGalleryItemMutation.mutate(id);
    }
  };

  const handleToggleGalleryVisibility = (item: GalleryItem) => {
    updateGalleryItemMutation.mutate({
      id: item.id,
      updates: { is_visible: !item.is_visible },
    });
  };

  const handleOpenCaseStudyModal = (caseStudy?: CaseStudy) => {
    if (caseStudy) {
      setEditingCaseStudy(caseStudy);
      setCaseStudyFormData({
        title: caseStudy.title,
        slug: caseStudy.slug,
        client_name: caseStudy.client_name,
        description: caseStudy.description,
        service_ids: caseStudy.service_ids,
        tier_id: caseStudy.tier_id,
        image_urls: caseStudy.image_urls,
      });
    } else {
      setEditingCaseStudy(null);
      resetCaseStudyForm();
    }
    setShowCaseStudyModal(true);
  };

  const handleSaveCaseStudy = () => {
    if (editingCaseStudy) {
      updateCaseStudyMutation.mutate({
        id: editingCaseStudy.id,
        updates: caseStudyFormData,
      });
    } else {
      createCaseStudyMutation.mutate(caseStudyFormData);
    }
  };

  const handleSaveContentPage = () => {
    if (selectedContentPage && contentFormData) {
      updateContentPageMutation.mutate({
        pageKey: activeTab,
        title: contentFormData.title || selectedContentPage.title,
        content: contentFormData.content || selectedContentPage.content,
      });
    }
  };

  // Initialize content form data when content page loads
  useEffect(() => {
    if (selectedContentPage) {
      setContentFormData({
        title: selectedContentPage.title,
        content: selectedContentPage.content,
      });
    }
  }, [selectedContentPage]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Notification Toast */}
        {notification && (
          <div
            className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg transition-all ${
              notification.type === 'success'
                ? 'bg-green-600 text-white'
                : 'bg-red-600 text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              {notification.type === 'success' ? (
                <Check className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <p className="font-medium">{notification.message}</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Content Management</h1>
                <p className="mt-2 text-sm text-gray-600">
                  Manage website content, gallery, and marketing materials
                </p>
              </div>
              <Link
                to="/admin"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => handleTabChange('about_us')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'about_us'
                    ? 'border-yellow-400 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  About Us
                </div>
              </button>

              <button
                onClick={() => handleTabChange('how_it_works')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'how_it_works'
                    ? 'border-yellow-400 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  How It Works
                </div>
              </button>

              <button
                onClick={() => handleTabChange('gallery')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'gallery'
                    ? 'border-yellow-400 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Gallery
                </div>
              </button>

              <button
                onClick={() => handleTabChange('footer')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'footer'
                    ? 'border-yellow-400 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Layout className="w-4 h-4" />
                  Footer
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* About Us Tab */}
          {activeTab === 'about_us' && (
            <div className="space-y-6">
              {isLoadingContentDetail ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
                </div>
              ) : (
                <>
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">About Us Content</h2>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Page Title
                        </label>
                        <input
                          type="text"
                          value={contentFormData?.title || ''}
                          onChange={(e) =>
                            setContentFormData((prev: any) => ({
                              ...prev,
                              title: e.target.value,
                            }))
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Content (JSON)
                        </label>
                        <textarea
                          value={JSON.stringify(contentFormData?.content || {}, null, 2)}
                          onChange={(e) => {
                            try {
                              const parsed = JSON.parse(e.target.value);
                              setContentFormData((prev: any) => ({
                                ...prev,
                                content: parsed,
                              }));
                            } catch (err) {
                              // Invalid JSON, keep editing
                            }
                          }}
                          rows={20}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent font-mono text-sm"
                        />
                        <p className="mt-2 text-xs text-gray-500">
                          Edit the JSON content for the About Us page. Be careful with formatting.
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                      <button
                        onClick={handleSaveContentPage}
                        disabled={updateContentPageMutation.isPending}
                        className="px-6 py-3 bg-yellow-400 text-black font-semibold rounded-lg hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {updateContentPageMutation.isPending ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            Save Changes
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* How It Works Tab */}
          {activeTab === 'how_it_works' && (
            <div className="space-y-6">
              {isLoadingContentDetail ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
                </div>
              ) : (
                <>
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">How It Works Content</h2>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Page Title
                        </label>
                        <input
                          type="text"
                          value={contentFormData?.title || ''}
                          onChange={(e) =>
                            setContentFormData((prev: any) => ({
                              ...prev,
                              title: e.target.value,
                            }))
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Content (JSON)
                        </label>
                        <textarea
                          value={JSON.stringify(contentFormData?.content || {}, null, 2)}
                          onChange={(e) => {
                            try {
                              const parsed = JSON.parse(e.target.value);
                              setContentFormData((prev: any) => ({
                                ...prev,
                                content: parsed,
                              }));
                            } catch (err) {
                              // Invalid JSON, keep editing
                            }
                          }}
                          rows={20}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent font-mono text-sm"
                        />
                        <p className="mt-2 text-xs text-gray-500">
                          Edit the JSON content for the How It Works page. Include steps array with title, description, and icon.
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                      <button
                        onClick={handleSaveContentPage}
                        disabled={updateContentPageMutation.isPending}
                        className="px-6 py-3 bg-yellow-400 text-black font-semibold rounded-lg hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {updateContentPageMutation.isPending ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            Save Changes
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Gallery Tab */}
          {activeTab === 'gallery' && (
            <div className="space-y-6">
              {/* Gallery Items Section */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Gallery Items</h2>
                  <button
                    onClick={() => handleOpenGalleryModal()}
                    className="px-4 py-2 bg-yellow-400 text-black font-semibold rounded-lg hover:bg-yellow-500 transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Gallery Item
                  </button>
                </div>

                {isLoadingGallery ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
                  </div>
                ) : galleryItems.length === 0 ? (
                  <div className="text-center py-12">
                    <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No gallery items yet. Add your first one!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {galleryItems.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                      >
                        <div className="relative aspect-video bg-gray-100">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.title || 'Gallery item'}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <ImageIcon className="w-12 h-12 text-gray-400" />
                            </div>
                          )}
                          <div className="absolute top-2 right-2">
                            <button
                              onClick={() => handleToggleGalleryVisibility(item)}
                              className={`p-2 rounded-full ${
                                item.is_visible
                                  ? 'bg-green-600 text-white'
                                  : 'bg-red-600 text-white'
                              }`}
                              title={item.is_visible ? 'Visible' : 'Hidden'}
                            >
                              {item.is_visible ? (
                                <Eye className="w-4 h-4" />
                              ) : (
                                <EyeOff className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="p-4">
                          <h3 className="font-semibold text-gray-900 mb-2">
                            {item.title || 'Untitled'}
                          </h3>
                          {item.tag && (
                            <span className="inline-block px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
                              {item.tag}
                            </span>
                          )}
                          {item.category && (
                            <span className="inline-block ml-2 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                              {item.category}
                            </span>
                          )}

                          <div className="mt-4 flex items-center gap-2">
                            <button
                              onClick={() => handleOpenGalleryModal(item)}
                              className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                            >
                              <Edit2 className="w-4 h-4" />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteGalleryItem(item.id)}
                              className="px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Case Studies Section */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Case Studies</h2>
                  <button
                    onClick={() => handleOpenCaseStudyModal()}
                    className="px-4 py-2 bg-yellow-400 text-black font-semibold rounded-lg hover:bg-yellow-500 transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Case Study
                  </button>
                </div>

                {caseStudies.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No case studies yet. Add your first one!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {caseStudies.map((caseStudy) => (
                      <div
                        key={caseStudy.id}
                        className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 mb-1">
                              {caseStudy.title}
                            </h3>
                            {caseStudy.client_name && (
                              <p className="text-sm text-gray-600 mb-2">
                                Client: {caseStudy.client_name}
                              </p>
                            )}
                            <p className="text-sm text-gray-700 line-clamp-2 mb-3">
                              {caseStudy.description}
                            </p>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">
                                {caseStudy.service_ids.length} services
                              </span>
                              <span className="text-xs text-gray-500">•</span>
                              <span className="text-xs text-gray-500">
                                {caseStudy.image_urls.length} images
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <button
                              onClick={() => handleOpenCaseStudyModal(caseStudy)}
                              className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer Tab */}
          {activeTab === 'footer' && (
            <div className="space-y-6">
              {isLoadingContentDetail ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
                </div>
              ) : (
                <>
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Footer Content</h2>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Content (JSON)
                        </label>
                        <textarea
                          value={JSON.stringify(contentFormData?.content || {}, null, 2)}
                          onChange={(e) => {
                            try {
                              const parsed = JSON.parse(e.target.value);
                              setContentFormData((prev: any) => ({
                                ...prev,
                                content: parsed,
                              }));
                            } catch (err) {
                              // Invalid JSON, keep editing
                            }
                          }}
                          rows={20}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent font-mono text-sm"
                        />
                        <p className="mt-2 text-xs text-gray-500">
                          Edit footer content including contact info, social links, and office hours.
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                      <button
                        onClick={handleSaveContentPage}
                        disabled={updateContentPageMutation.isPending}
                        className="px-6 py-3 bg-yellow-400 text-black font-semibold rounded-lg hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {updateContentPageMutation.isPending ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            Save Changes
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Gallery Item Modal */}
        {showGalleryModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {editingGalleryItem ? 'Edit Gallery Item' : 'Add Gallery Item'}
                  </h3>
                  <button
                    onClick={() => {
                      setShowGalleryModal(false);
                      setEditingGalleryItem(null);
                      resetGalleryForm();
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Image URL *
                  </label>
                  <input
                    type="url"
                    required
                    value={galleryFormData.image_url}
                    onChange={(e) =>
                      setGalleryFormData((prev) => ({ ...prev, image_url: e.target.value }))
                    }
                    placeholder="https://example.com/image.jpg"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={galleryFormData.title || ''}
                    onChange={(e) =>
                      setGalleryFormData((prev) => ({ ...prev, title: e.target.value || null }))
                    }
                    placeholder="Optional title"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tag
                    </label>
                    <input
                      type="text"
                      value={galleryFormData.tag || ''}
                      onChange={(e) =>
                        setGalleryFormData((prev) => ({
                          ...prev,
                          tag: e.target.value || null,
                        }))
                      }
                      placeholder="e.g., premium"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <input
                      type="text"
                      value={galleryFormData.category || ''}
                      onChange={(e) =>
                        setGalleryFormData((prev) => ({
                          ...prev,
                          category: e.target.value || null,
                        }))
                      }
                      placeholder="e.g., vehicle-graphics"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Associated Service
                    </label>
                    <select
                      value={galleryFormData.service_id || ''}
                      onChange={(e) =>
                        setGalleryFormData((prev) => ({
                          ...prev,
                          service_id: e.target.value || null,
                        }))
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                    >
                      <option value="">None</option>
                      {servicesForAssociation.map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Case Study
                    </label>
                    <select
                      value={galleryFormData.case_study_id || ''}
                      onChange={(e) =>
                        setGalleryFormData((prev) => ({
                          ...prev,
                          case_study_id: e.target.value || null,
                        }))
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                    >
                      <option value="">None</option>
                      {caseStudies.map((cs) => (
                        <option key={cs.id} value={cs.id}>
                          {cs.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sort Order
                    </label>
                    <input
                      type="number"
                      value={galleryFormData.sort_order}
                      onChange={(e) =>
                        setGalleryFormData((prev) => ({
                          ...prev,
                          sort_order: parseInt(e.target.value) || 0,
                        }))
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Visibility
                    </label>
                    <div className="flex items-center h-10">
                      <input
                        type="checkbox"
                        checked={galleryFormData.is_visible}
                        onChange={(e) =>
                          setGalleryFormData((prev) => ({
                            ...prev,
                            is_visible: e.target.checked,
                          }))
                        }
                        className="w-4 h-4 text-yellow-400 border-gray-300 rounded focus:ring-yellow-400"
                      />
                      <label className="ml-2 text-sm text-gray-700">Visible on website</label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowGalleryModal(false);
                    setEditingGalleryItem(null);
                    resetGalleryForm();
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveGalleryItem}
                  disabled={
                    !galleryFormData.image_url ||
                    createGalleryItemMutation.isPending ||
                    updateGalleryItemMutation.isPending
                  }
                  className="px-6 py-2 bg-yellow-400 text-black font-semibold rounded-lg hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {(createGalleryItemMutation.isPending || updateGalleryItemMutation.isPending) ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {editingGalleryItem ? 'Update' : 'Create'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Case Study Modal */}
        {showCaseStudyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {editingCaseStudy ? 'Edit Case Study' : 'Add Case Study'}
                  </h3>
                  <button
                    onClick={() => {
                      setShowCaseStudyModal(false);
                      setEditingCaseStudy(null);
                      resetCaseStudyForm();
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={caseStudyFormData.title}
                    onChange={(e) =>
                      setCaseStudyFormData((prev) => ({ ...prev, title: e.target.value }))
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Slug *
                  </label>
                  <input
                    type="text"
                    required
                    value={caseStudyFormData.slug}
                    onChange={(e) =>
                      setCaseStudyFormData((prev) => ({
                        ...prev,
                        slug: e.target.value.toLowerCase().replace(/\s+/g, '-'),
                      }))
                    }
                    placeholder="case-study-slug"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Client Name
                  </label>
                  <input
                    type="text"
                    value={caseStudyFormData.client_name || ''}
                    onChange={(e) =>
                      setCaseStudyFormData((prev) => ({
                        ...prev,
                        client_name: e.target.value || null,
                      }))
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    required
                    value={caseStudyFormData.description}
                    onChange={(e) =>
                      setCaseStudyFormData((prev) => ({ ...prev, description: e.target.value }))
                    }
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Image URLs (comma-separated) *
                  </label>
                  <textarea
                    required
                    value={caseStudyFormData.image_urls.join(', ')}
                    onChange={(e) =>
                      setCaseStudyFormData((prev) => ({
                        ...prev,
                        image_urls: e.target.value.split(',').map((url) => url.trim()),
                      }))
                    }
                    rows={3}
                    placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowCaseStudyModal(false);
                    setEditingCaseStudy(null);
                    resetCaseStudyForm();
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCaseStudy}
                  disabled={
                    !caseStudyFormData.title ||
                    !caseStudyFormData.slug ||
                    !caseStudyFormData.description ||
                    caseStudyFormData.image_urls.length === 0 ||
                    createCaseStudyMutation.isPending ||
                    updateCaseStudyMutation.isPending
                  }
                  className="px-6 py-2 bg-yellow-400 text-black font-semibold rounded-lg hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {(createCaseStudyMutation.isPending || updateCaseStudyMutation.isPending) ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {editingCaseStudy ? 'Update' : 'Create'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default UV_ContentManagement;