import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  Calendar, 
  Clock, 
  AlertCircle, 
  Plus, 
  Trash, 
  Edit, 
  Save, 
  X,
  Settings,
  AlertTriangle
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface CalendarCapacityRule {
  id: string;
  service_id: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  max_standard_slots: number;
  max_emergency_slots: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface BlackoutDate {
  id: string;
  date: string;
  reason: string;
  created_at: string;
  updated_at: string;
}

interface EmergencyBookingSettings {
  enabled: boolean;
  urgent_fee_percentage: number;
  max_slots_per_day: number;
}

interface Service {
  id: string;
  name: string;
  slug: string;
  category_id: string;
}

interface Notification {
  id: string;
  type: 'success' | 'error';
  message: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_CalendarManagement: React.FC = () => {
  // ========================================
  // ZUSTAND STATE (Individual Selectors)
  // ========================================
  const auth_token = useAppStore(state => state.authentication_state.auth_token);
  const current_user = useAppStore(state => state.authentication_state.current_user);

  // ========================================
  // URL PARAMS
  // ========================================
  const [searchParams, setSearchParams] = useSearchParams();
  const section_param = searchParams.get('section');

  // ========================================
  // LOCAL STATE
  // ========================================
  const [active_section, setActiveSection] = useState<'capacity' | 'blackout' | 'emergency'>(
    (section_param === 'capacity' || section_param === 'blackout' || section_param === 'emergency') 
      ? section_param 
      : 'capacity'
  );

  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Capacity Form State
  const [capacity_form_open, setCapacityFormOpen] = useState(false);
  const [editing_capacity_id, setEditingCapacityId] = useState<string | null>(null);
  const [capacity_form, setCapacityForm] = useState({
    service_id: '',
    day_of_week: '0',
    start_time: '09:00',
    end_time: '17:00',
    max_standard_slots: '5',
    max_emergency_slots: '2',
    is_active: true
  });

  // Blackout Form State
  const [blackout_form_open, setBlackoutFormOpen] = useState(false);
  const [blackout_form, setBlackoutForm] = useState({
    date: '',
    reason: ''
  });

  // Emergency Settings Form State
  const [emergency_form, setEmergencyForm] = useState<EmergencyBookingSettings>({
    enabled: false,
    urgent_fee_percentage: 20,
    max_slots_per_day: 2
  });

  // Delete Confirmation State
  const [delete_confirm, setDeleteConfirm] = useState<{
    type: 'capacity' | 'blackout';
    id: string;
  } | null>(null);

  const queryClient = useQueryClient();

  // ========================================
  // API BASE URL
  // ========================================
  const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api`;

  // ========================================
  // DATA FETCHING (React Query)
  // ========================================

  // Fetch Capacity Rules
  const { 
    data: capacity_rules = [], 
    isLoading: is_loading_capacity,
    error: capacity_error
  } = useQuery({
    queryKey: ['calendar-capacity'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/calendar-capacity`, {
        headers: {
          Authorization: `Bearer ${auth_token}`
        },
        params: {
          limit: 50,
          offset: 0
        }
      });
      return (response.data.capacity || []).map((rule: any) => ({
        ...rule,
        max_standard_slots: Number(rule.max_standard_slots || 0),
        max_emergency_slots: Number(rule.max_emergency_slots || 0),
        day_of_week: Number(rule.day_of_week)
      }));
    },
    enabled: active_section === 'capacity' && !!auth_token,
    staleTime: 60000
  });

  // Fetch Blackout Dates
  const { 
    data: blackout_dates = [], 
    isLoading: is_loading_blackout,
    error: blackout_error
  } = useQuery({
    queryKey: ['calendar-blackout-dates'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/calendar-blackout-dates`, {
        headers: {
          Authorization: `Bearer ${auth_token}`
        }
      });
      return response.data.dates || [];
    },
    enabled: active_section === 'blackout' && !!auth_token,
    staleTime: 60000
  });

  // Fetch Services for Dropdown
  const { data: services_list = [] } = useQuery({
    queryKey: ['services-list'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/services`, {
        headers: {
          Authorization: `Bearer ${auth_token}`
        },
        params: {
          is_active: true,
          limit: 100
        }
      });
      return (response.data.services || []).map((service: any) => ({
        id: service.id,
        name: service.name,
        slug: service.slug,
        category_id: service.category_id
      }));
    },
    enabled: !!auth_token,
    staleTime: 300000
  });

  // Fetch Emergency Settings
  const { data: emergency_settings_data } = useQuery({
    queryKey: ['emergency-settings'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/system-settings`, {
        headers: {
          Authorization: `Bearer ${auth_token}`
        }
      });
      const settings = response.data.settings || [];
      const emergency_setting = settings.find((s: any) => s.key === 'emergency_booking_settings');
      return emergency_setting?.value || {
        enabled: false,
        urgent_fee_percentage: 20,
        max_slots_per_day: 2
      };
    },
    enabled: active_section === 'emergency' && !!auth_token,
    staleTime: 60000,
    onSuccess: (data) => {
      setEmergencyForm({
        enabled: data.enabled || false,
        urgent_fee_percentage: Number(data.urgent_fee_percentage || 20),
        max_slots_per_day: Number(data.max_slots_per_day || 2)
      });
    }
  });

  // ========================================
  // MUTATIONS
  // ========================================

  // Create Capacity Rule
  const create_capacity_mutation = useMutation({
    mutationFn: async (data: any) => {
      return await axios.post(`${API_BASE_URL}/calendar-capacity`, data, {
        headers: {
          Authorization: `Bearer ${auth_token}`,
          'Content-Type': 'application/json'
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['calendar-capacity']);
      addNotification('success', 'Capacity rule created successfully');
      setCapacityFormOpen(false);
      resetCapacityForm();
    },
    onError: (error: any) => {
      addNotification('error', error.response?.data?.message || 'Failed to create capacity rule');
    }
  });

  // Update Capacity Rule
  const update_capacity_mutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await axios.put(`${API_BASE_URL}/calendar-capacity/${id}`, data, {
        headers: {
          Authorization: `Bearer ${auth_token}`,
          'Content-Type': 'application/json'
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['calendar-capacity']);
      addNotification('success', 'Capacity rule updated successfully');
      setCapacityFormOpen(false);
      setEditingCapacityId(null);
      resetCapacityForm();
    },
    onError: (error: any) => {
      addNotification('error', error.response?.data?.message || 'Failed to update capacity rule');
    }
  });

  // Delete Capacity Rule
  const delete_capacity_mutation = useMutation({
    mutationFn: async (id: string) => {
      return await axios.delete(`${API_BASE_URL}/calendar-capacity/${id}`, {
        headers: {
          Authorization: `Bearer ${auth_token}`
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['calendar-capacity']);
      addNotification('success', 'Capacity rule deleted successfully');
      setDeleteConfirm(null);
    },
    onError: (error: any) => {
      addNotification('error', error.response?.data?.message || 'Failed to delete capacity rule');
    }
  });

  // Create Blackout Date
  const create_blackout_mutation = useMutation({
    mutationFn: async (data: any) => {
      return await axios.post(`${API_BASE_URL}/calendar-blackout-dates`, data, {
        headers: {
          Authorization: `Bearer ${auth_token}`,
          'Content-Type': 'application/json'
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['calendar-blackout-dates']);
      addNotification('success', 'Blackout date added successfully');
      setBlackoutFormOpen(false);
      setBlackoutForm({ date: '', reason: '' });
    },
    onError: (error: any) => {
      addNotification('error', error.response?.data?.message || 'Failed to add blackout date');
    }
  });

  // Delete Blackout Date
  const delete_blackout_mutation = useMutation({
    mutationFn: async (id: string) => {
      return await axios.delete(`${API_BASE_URL}/calendar-blackout-dates/${id}`, {
        headers: {
          Authorization: `Bearer ${auth_token}`
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['calendar-blackout-dates']);
      addNotification('success', 'Blackout date removed successfully');
      setDeleteConfirm(null);
    },
    onError: (error: any) => {
      addNotification('error', error.response?.data?.message || 'Failed to remove blackout date');
    }
  });

  // Update Emergency Settings
  const update_emergency_mutation = useMutation({
    mutationFn: async (data: EmergencyBookingSettings) => {
      return await axios.put(`${API_BASE_URL}/system-settings/emergency_booking_settings`, {
        value: data
      }, {
        headers: {
          Authorization: `Bearer ${auth_token}`,
          'Content-Type': 'application/json'
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['emergency-settings']);
      addNotification('success', 'Emergency settings updated successfully');
    },
    onError: (error: any) => {
      addNotification('error', error.response?.data?.message || 'Failed to update emergency settings');
    }
  });

  // ========================================
  // HELPER FUNCTIONS
  // ========================================

  const addNotification = (type: 'success' | 'error', message: string) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  };

  const getDayName = (day_of_week: number): string => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[day_of_week] || 'Unknown';
  };

  const resetCapacityForm = () => {
    setCapacityForm({
      service_id: '',
      day_of_week: '0',
      start_time: '09:00',
      end_time: '17:00',
      max_standard_slots: '5',
      max_emergency_slots: '2',
      is_active: true
    });
  };

  const handleSectionChange = (section: 'capacity' | 'blackout' | 'emergency') => {
    setActiveSection(section);
    setSearchParams({ section });
  };

  // ========================================
  // FORM HANDLERS
  // ========================================

  const handleCapacitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = {
      service_id: capacity_form.service_id || null,
      day_of_week: parseInt(capacity_form.day_of_week),
      start_time: capacity_form.start_time,
      end_time: capacity_form.end_time,
      max_standard_slots: parseInt(capacity_form.max_standard_slots),
      max_emergency_slots: parseInt(capacity_form.max_emergency_slots),
      is_active: capacity_form.is_active
    };

    if (editing_capacity_id) {
      update_capacity_mutation.mutate({ id: editing_capacity_id, data: payload });
    } else {
      create_capacity_mutation.mutate(payload);
    }
  };

  const handleEditCapacity = (rule: CalendarCapacityRule) => {
    setCapacityForm({
      service_id: rule.service_id || '',
      day_of_week: rule.day_of_week.toString(),
      start_time: rule.start_time,
      end_time: rule.end_time,
      max_standard_slots: rule.max_standard_slots.toString(),
      max_emergency_slots: rule.max_emergency_slots.toString(),
      is_active: rule.is_active
    });
    setEditingCapacityId(rule.id);
    setCapacityFormOpen(true);
  };

  const handleBlackoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    create_blackout_mutation.mutate(blackout_form);
  };

  const handleEmergencySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    update_emergency_mutation.mutate(emergency_form);
  };

  // Group capacity rules by day of week
  const grouped_capacity_rules = capacity_rules.reduce((acc: Record<number, CalendarCapacityRule[]>, rule) => {
    if (!acc[rule.day_of_week]) {
      acc[rule.day_of_week] = [];
    }
    acc[rule.day_of_week].push(rule);
    return acc;
  }, {});

  // ========================================
  // RENDER
  // ========================================

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-7xl mx-auto mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Calendar & Capacity Management</h1>
              <p className="mt-2 text-sm text-gray-600">Configure booking hours, capacity limits, and blackout dates</p>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {notifications.map(notif => (
            <div
              key={notif.id}
              className={`px-6 py-4 rounded-lg shadow-lg ${
                notif.type === 'success'
                  ? 'bg-green-600 text-white'
                  : 'bg-red-600 text-white'
              } flex items-center space-x-3`}
            >
              {notif.type === 'success' ? (
                <Calendar className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <span className="font-medium">{notif.message}</span>
            </div>
          ))}
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => handleSectionChange('capacity')}
                className={`${
                  active_section === 'capacity'
                    ? 'border-black text-black'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2`}
              >
                <Clock className="w-5 h-5" />
                <span>Capacity Rules</span>
              </button>
              <button
                onClick={() => handleSectionChange('blackout')}
                className={`${
                  active_section === 'blackout'
                    ? 'border-black text-black'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2`}
              >
                <Calendar className="w-5 h-5" />
                <span>Blackout Dates</span>
              </button>
              <button
                onClick={() => handleSectionChange('emergency')}
                className={`${
                  active_section === 'emergency'
                    ? 'border-black text-black'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2`}
              >
                <Settings className="w-5 h-5" />
                <span>Emergency Settings</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto">
          {/* Capacity Section */}
          {active_section === 'capacity' && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Capacity Rules</h2>
                  <p className="mt-1 text-sm text-gray-600">Define working hours and booking limits by day of week</p>
                </div>
                <button
                  onClick={() => {
                    resetCapacityForm();
                    setEditingCapacityId(null);
                    setCapacityFormOpen(true);
                  }}
                  className="flex items-center space-x-2 px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  <span>Add Rule</span>
                </button>
              </div>

              {is_loading_capacity && (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
                </div>
              )}

              {!is_loading_capacity && capacity_rules.length === 0 && (
                <div className="text-center py-12">
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No capacity rules configured yet</p>
                </div>
              )}

              {!is_loading_capacity && capacity_rules.length > 0 && (
                <div className="space-y-6">
                  {[0, 1, 2, 3, 4, 5, 6].map(day => {
                    const rules = grouped_capacity_rules[day] || [];
                    if (rules.length === 0) return null;

                    return (
                      <div key={day} className="border border-gray-200 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-3">{getDayName(day)}</h3>
                        <div className="space-y-3">
                          {rules.map(rule => (
                            <div
                              key={rule.id}
                              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                            >
                              <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Service</p>
                                  <p className="font-medium text-gray-900">
                                    {rule.service_id
                                      ? services_list.find(s => s.id === rule.service_id)?.name || 'Unknown Service'
                                      : 'All Services'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Hours</p>
                                  <p className="font-medium text-gray-900">
                                    {rule.start_time} - {rule.end_time}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Standard Slots</p>
                                  <p className="font-medium text-gray-900">{rule.max_standard_slots}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Emergency Slots</p>
                                  <p className="font-medium text-gray-900">{rule.max_emergency_slots}</p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2 ml-4">
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                                    rule.is_active
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}
                                >
                                  {rule.is_active ? 'Active' : 'Inactive'}
                                </span>
                                <button
                                  onClick={() => handleEditCapacity(rule)}
                                  className="p-2 text-gray-600 hover:text-black transition-colors"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm({ type: 'capacity', id: rule.id })}
                                  className="p-2 text-gray-600 hover:text-red-600 transition-colors"
                                >
                                  <Trash className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Capacity Form Modal */}
              {capacity_form_open && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-8">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-gray-900">
                        {editing_capacity_id ? 'Edit Capacity Rule' : 'Add Capacity Rule'}
                      </h3>
                      <button
                        onClick={() => {
                          setCapacityFormOpen(false);
                          setEditingCapacityId(null);
                          resetCapacityForm();
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>

                    <form onSubmit={handleCapacitySubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                          Service (optional - leave blank for all services)
                        </label>
                        <select
                          value={capacity_form.service_id}
                          onChange={e => setCapacityForm(prev => ({ ...prev, service_id: e.target.value }))}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-black focus:ring-4 focus:ring-gray-100 transition-all"
                        >
                          <option value="">All Services</option>
                          {services_list.map(service => (
                            <option key={service.id} value={service.id}>
                              {service.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                          Day of Week
                        </label>
                        <select
                          value={capacity_form.day_of_week}
                          onChange={e => setCapacityForm(prev => ({ ...prev, day_of_week: e.target.value }))}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-black focus:ring-4 focus:ring-gray-100 transition-all"
                          required
                        >
                          {[0, 1, 2, 3, 4, 5, 6].map(day => (
                            <option key={day} value={day}>
                              {getDayName(day)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Start Time
                          </label>
                          <input
                            type="time"
                            value={capacity_form.start_time}
                            onChange={e => setCapacityForm(prev => ({ ...prev, start_time: e.target.value }))}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-black focus:ring-4 focus:ring-gray-100 transition-all"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            End Time
                          </label>
                          <input
                            type="time"
                            value={capacity_form.end_time}
                            onChange={e => setCapacityForm(prev => ({ ...prev, end_time: e.target.value }))}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-black focus:ring-4 focus:ring-gray-100 transition-all"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Max Standard Slots
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={capacity_form.max_standard_slots}
                            onChange={e => setCapacityForm(prev => ({ ...prev, max_standard_slots: e.target.value }))}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-black focus:ring-4 focus:ring-gray-100 transition-all"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Max Emergency Slots
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={capacity_form.max_emergency_slots}
                            onChange={e => setCapacityForm(prev => ({ ...prev, max_emergency_slots: e.target.value }))}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-black focus:ring-4 focus:ring-gray-100 transition-all"
                            required
                          />
                        </div>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="is_active"
                          checked={capacity_form.is_active}
                          onChange={e => setCapacityForm(prev => ({ ...prev, is_active: e.target.checked }))}
                          className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
                        />
                        <label htmlFor="is_active" className="ml-2 text-sm font-medium text-gray-900">
                          Active
                        </label>
                      </div>

                      <div className="flex space-x-3 pt-4">
                        <button
                          type="submit"
                          disabled={create_capacity_mutation.isLoading || update_capacity_mutation.isLoading}
                          className="flex-1 px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {(create_capacity_mutation.isLoading || update_capacity_mutation.isLoading) ? (
                            <span className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Saving...
                            </span>
                          ) : (
                            editing_capacity_id ? 'Update Rule' : 'Create Rule'
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCapacityFormOpen(false);
                            setEditingCapacityId(null);
                            resetCapacityForm();
                          }}
                          className="px-6 py-3 bg-gray-100 text-gray-900 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Blackout Dates Section */}
          {active_section === 'blackout' && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Blackout Dates</h2>
                  <p className="mt-1 text-sm text-gray-600">Block specific dates from booking</p>
                </div>
                <button
                  onClick={() => setBlackoutFormOpen(true)}
                  className="flex items-center space-x-2 px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  <span>Add Blackout Date</span>
                </button>
              </div>

              {is_loading_blackout && (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
                </div>
              )}

              {!is_loading_blackout && blackout_dates.length === 0 && (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No blackout dates configured</p>
                </div>
              )}

              {!is_loading_blackout && blackout_dates.length > 0 && (
                <div className="space-y-3">
                  {blackout_dates.map(blackout => (
                    <div
                      key={blackout.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 mb-1">
                          {new Date(blackout.date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                        <p className="text-sm text-gray-600">{blackout.reason}</p>
                      </div>
                      <button
                        onClick={() => setDeleteConfirm({ type: 'blackout', id: blackout.id })}
                        className="p-2 text-gray-600 hover:text-red-600 transition-colors"
                      >
                        <Trash className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Blackout Form Modal */}
              {blackout_form_open && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-8">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-gray-900">Add Blackout Date</h3>
                      <button
                        onClick={() => {
                          setBlackoutFormOpen(false);
                          setBlackoutForm({ date: '', reason: '' });
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>

                    <form onSubmit={handleBlackoutSubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                          Date
                        </label>
                        <input
                          type="date"
                          value={blackout_form.date}
                          onChange={e => setBlackoutForm(prev => ({ ...prev, date: e.target.value }))}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-black focus:ring-4 focus:ring-gray-100 transition-all"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                          Reason
                        </label>
                        <textarea
                          value={blackout_form.reason}
                          onChange={e => setBlackoutForm(prev => ({ ...prev, reason: e.target.value }))}
                          rows={3}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-black focus:ring-4 focus:ring-gray-100 transition-all"
                          placeholder="e.g., Public Holiday, Staff Training"
                          required
                        />
                      </div>

                      <div className="flex space-x-3 pt-4">
                        <button
                          type="submit"
                          disabled={create_blackout_mutation.isLoading}
                          className="flex-1 px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {create_blackout_mutation.isLoading ? (
                            <span className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Adding...
                            </span>
                          ) : (
                            'Add Blackout Date'
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setBlackoutFormOpen(false);
                            setBlackoutForm({ date: '', reason: '' });
                          }}
                          className="px-6 py-3 bg-gray-100 text-gray-900 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Emergency Settings Section */}
          {active_section === 'emergency' && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
              <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900">Emergency Booking Settings</h2>
                <p className="mt-1 text-sm text-gray-600">Configure urgent booking fees and capacity limits</p>
              </div>

              <form onSubmit={handleEmergencySubmit} className="space-y-6">
                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-yellow-800 font-medium mb-1">About Emergency Bookings</p>
                    <p className="text-sm text-yellow-700">
                      Emergency bookings allow customers to request urgent service with additional fees.
                      These settings control availability and pricing for emergency slots.
                    </p>
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="emergency_enabled"
                    checked={emergency_form.enabled}
                    onChange={e => setEmergencyForm(prev => ({ ...prev, enabled: e.target.checked }))}
                    className="w-5 h-5 text-black border-gray-300 rounded focus:ring-black"
                  />
                  <label htmlFor="emergency_enabled" className="ml-3 text-sm font-medium text-gray-900">
                    Enable Emergency Bookings
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Urgent Fee Percentage
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={emergency_form.urgent_fee_percentage}
                      onChange={e => setEmergencyForm(prev => ({
                        ...prev,
                        urgent_fee_percentage: Number(e.target.value)
                      }))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-black focus:ring-4 focus:ring-gray-100 transition-all"
                      required
                      disabled={!emergency_form.enabled}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Additional fee percentage applied to emergency bookings (0-100%)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Max Emergency Slots Per Day
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={emergency_form.max_slots_per_day}
                    onChange={e => setEmergencyForm(prev => ({
                      ...prev,
                      max_slots_per_day: Number(e.target.value)
                    }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-black focus:ring-4 focus:ring-gray-100 transition-all"
                    required
                    disabled={!emergency_form.enabled}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Maximum number of emergency bookings allowed per day (set to 0 for unlimited)
                  </p>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={update_emergency_mutation.isLoading}
                    className="w-full px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {update_emergency_mutation.isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Saving Settings...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        <span>Save Emergency Settings</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {delete_confirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-8">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Confirm Delete</h3>
                  <p className="text-sm text-gray-600">
                    Are you sure you want to delete this {delete_confirm.type === 'capacity' ? 'capacity rule' : 'blackout date'}?
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-700 mb-6">
                This action cannot be undone.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    if (delete_confirm.type === 'capacity') {
                      delete_capacity_mutation.mutate(delete_confirm.id);
                    } else {
                      delete_blackout_mutation.mutate(delete_confirm.id);
                    }
                  }}
                  disabled={delete_capacity_mutation.isLoading || delete_blackout_mutation.isLoading}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {(delete_capacity_mutation.isLoading || delete_blackout_mutation.isLoading) ? (
                    <span className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Deleting...
                    </span>
                  ) : (
                    'Delete'
                  )}
                </button>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-6 py-3 bg-gray-100 text-gray-900 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default UV_CalendarManagement;