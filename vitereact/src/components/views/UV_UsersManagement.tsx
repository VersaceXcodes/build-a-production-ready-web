import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// ============================================================================
// TYPE DEFINITIONS (matching Zod schemas and OpenAPI specs)
// ============================================================================

interface User {
  id: string;
  email: string;
  name: string;
  role: 'CUSTOMER' | 'STAFF' | 'ADMIN';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  created_at: string;
  updated_at: string;
}

interface CustomerProfile {
  id: string;
  user_id: string;
  phone: string | null;
  address: string | null;
  company_name: string | null;
  b2b_account_id: string | null;
}

interface StaffProfile {
  id: string;
  user_id: string;
  department: string | null;
  permissions: Record<string, boolean> | null;
}

interface UserDetailResponse {
  id: string;
  email: string;
  name: string;
  role: 'CUSTOMER' | 'STAFF' | 'ADMIN';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  created_at: string;
  updated_at: string;
  customer_profile?: CustomerProfile;
  staff_profile?: StaffProfile;
}

interface CreateUserPayload {
  email: string;
  password: string;
  name: string;
  role?: 'CUSTOMER' | 'STAFF' | 'ADMIN';
  phone?: string;
  company_name?: string;
}

interface UpdateUserPayload {
  name?: string;
  email?: string;
  role?: 'CUSTOMER' | 'STAFF' | 'ADMIN';
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_UsersManagement: React.FC = () => {
  // URL params for filters
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Global state (CRITICAL: individual selectors, no object destructuring)
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  
  // Local state
  const [selectedUser, setSelectedUser] = useState<UserDetailResponse | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  
  // Filter state (synced with URL params)
  const [filters, setFilters] = useState({
    role: searchParams.get('role') || null,
    status: searchParams.get('status') || null,
    search: searchParams.get('search') || ''
  });
  
  // Create user form state
  const [createForm, setCreateForm] = useState({
    email: '',
    name: '',
    role: 'CUSTOMER' as 'CUSTOMER' | 'STAFF' | 'ADMIN',
    phone: '',
    company_name: '',
    department: '',
    permissions: {} as Record<string, boolean>
  });
  
  // Edit user form state
  const [editForm, setEditForm] = useState<UpdateUserPayload>({
    name: '',
    email: '',
    role: 'CUSTOMER',
    status: 'ACTIVE'
  });
  
  // React Query client
  const queryClient = useQueryClient();
  
  // Auto-dismiss notifications after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);
  
  // Sync filters with URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.role) params.set('role', filters.role);
    if (filters.status) params.set('status', filters.status);
    if (filters.search) params.set('search', filters.search);
    setSearchParams(params);
  }, [filters, setSearchParams]);
  
  // ============================================================================
  // DATA FETCHING - React Query
  // ============================================================================
  
  // Fetch users list with filters
  const { data: usersData, isLoading: isLoadingUsers, error: usersError } = useQuery({
    queryKey: ['users', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.role) params.append('role', filters.role);
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('query', filters.search);
      params.append('limit', '50');
      params.append('offset', '0');
      params.append('sort_by', 'name');
      params.append('sort_order', 'asc');
      
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/users?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );
      return response.data.users as User[];
    },
    staleTime: 60000,
    refetchOnWindowFocus: false,
    retry: 1,
    enabled: !!authToken
  });
  
  // Fetch user detail (called on edit click)
  const fetchUserDetail = async (userId: string) => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/users/${userId}`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );
      setSelectedUser(response.data as UserDetailResponse);
      setEditForm({
        name: response.data.name,
        email: response.data.email,
        role: response.data.role,
        status: response.data.status
      });
      setShowEditModal(true);
    } catch (error: any) {
      setNotification({
        type: 'error',
        message: error.response?.data?.message || 'Failed to fetch user details'
      });
    }
  };
  
  // ============================================================================
  // MUTATIONS - Create/Update/Delete
  // ============================================================================
  
  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (payload: CreateUserPayload) => {
      // Generate temporary password (8 chars alphanumeric + special)
      const tempPassword = `Temp${Math.random().toString(36).slice(2, 10)}!`;
      
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/auth/register`,
        {
          ...payload,
          password: tempPassword
        },
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowCreateModal(false);
      setCreateForm({
        email: '',
        name: '',
        role: 'CUSTOMER',
        phone: '',
        company_name: '',
        department: '',
        permissions: {}
      });
      setNotification({
        type: 'success',
        message: 'User created successfully. Temporary password sent to email.'
      });
    },
    onError: (error: any) => {
      setNotification({
        type: 'error',
        message: error.response?.data?.message || 'Failed to create user'
      });
    }
  });
  
  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, payload }: { userId: string; payload: UpdateUserPayload }) => {
      const response = await axios.put(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/users/${userId}`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowEditModal(false);
      setSelectedUser(null);
      setNotification({
        type: 'success',
        message: 'User updated successfully'
      });
    },
    onError: (error: any) => {
      setNotification({
        type: 'error',
        message: error.response?.data?.message || 'Failed to update user'
      });
    }
  });
  
  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await axios.delete(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/users/${userId}`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowDeleteConfirm(false);
      setSelectedUser(null);
      setNotification({
        type: 'success',
        message: 'User deleted successfully'
      });
    },
    onError: (error: any) => {
      setNotification({
        type: 'error',
        message: error.response?.data?.message || 'Failed to delete user'
      });
    }
  });
  
  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  const handleFilterChange = (key: 'role' | 'status' | 'search', value: string | null) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };
  
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload: CreateUserPayload = {
      email: createForm.email,
      name: createForm.name,
      role: createForm.role
    };
    
    if (createForm.role === 'CUSTOMER') {
      if (createForm.phone) payload.phone = createForm.phone;
      if (createForm.company_name) payload.company_name = createForm.company_name;
    }
    
    createUserMutation.mutate(payload);
  };
  
  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUser) {
      updateUserMutation.mutate({
        userId: selectedUser.id,
        payload: editForm
      });
    }
  };
  
  const handleDeleteConfirm = () => {
    if (selectedUser) {
      deleteUserMutation.mutate(selectedUser.id);
    }
  };
  
  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================
  
  // Role badge styling
  const getRoleBadge = (role: string) => {
    const styles = {
      ADMIN: 'bg-yellow-400 text-black',
      STAFF: 'bg-gray-800 text-white',
      CUSTOMER: 'bg-gray-200 text-gray-800'
    };
    return styles[role as keyof typeof styles] || styles.CUSTOMER;
  };
  
  // Status badge styling
  const getStatusBadge = (status: string) => {
    const styles = {
      ACTIVE: 'bg-green-600 text-white',
      INACTIVE: 'bg-gray-400 text-white',
      SUSPENDED: 'bg-red-600 text-white'
    };
    return styles[status as keyof typeof styles] || styles.INACTIVE;
  };
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-black">User Management</h1>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-yellow-400 text-black font-semibold rounded-lg hover:bg-yellow-500 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Create New User
              </button>
            </div>
          </div>
        </div>
        
        {/* Notification Banner */}
        {notification && (
          <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg ${
            notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}>
            {notification.message}
          </div>
        )}
        
        {/* Main Content */}
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {/* Filters Section */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search Input */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-black mb-2">
                  Search Users
                </label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 transition-all"
                />
              </div>
              
              {/* Role Filter */}
              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Filter by Role
                </label>
                <select
                  value={filters.role || ''}
                  onChange={(e) => handleFilterChange('role', e.target.value || null)}
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 transition-all"
                >
                  <option value="">All Roles</option>
                  <option value="CUSTOMER">Customer</option>
                  <option value="STAFF">Staff</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Filter by Status
                </label>
                <select
                  value={filters.status || ''}
                  onChange={(e) => handleFilterChange('status', e.target.value || null)}
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 transition-all"
                >
                  <option value="">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>
            </div>
            
            {/* Active Filters Display */}
            {(filters.role || filters.status || filters.search) && (
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200">
                <span className="text-sm font-semibold text-gray-600">Active Filters:</span>
                {filters.role && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-800 text-white text-sm rounded-full">
                    Role: {filters.role}
                    <button
                      onClick={() => handleFilterChange('role', null)}
                      className="hover:text-gray-300"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.status && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-800 text-white text-sm rounded-full">
                    Status: {filters.status}
                    <button
                      onClick={() => handleFilterChange('status', null)}
                      className="hover:text-gray-300"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.search && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-800 text-white text-sm rounded-full">
                    Search: "{filters.search}"
                    <button
                      onClick={() => handleFilterChange('search', '')}
                      className="hover:text-gray-300"
                    >
                      ×
                    </button>
                  </span>
                )}
                <button
                  onClick={() => setFilters({ role: null, status: null, search: '' })}
                  className="ml-2 text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Clear All
                </button>
              </div>
            )}
          </div>
          
          {/* Users Table */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            {isLoadingUsers ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-yellow-400"></div>
              </div>
            ) : usersError ? (
              <div className="py-12 text-center">
                <p className="text-red-600">Failed to load users. Please try again.</p>
              </div>
            ) : !usersData || usersData.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-gray-600">No users found matching your criteria.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-900 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {usersData.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-semibold text-black">{user.name}</div>
                            <div className="text-sm text-gray-600">{user.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadge(user.role)}`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(user.status)}`}>
                            {user.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => fetchUserDetail(user.id)}
                            className="text-yellow-600 hover:text-yellow-700 font-semibold mr-4"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUser(user as UserDetailResponse);
                              setShowDeleteConfirm(true);
                            }}
                            className="text-red-600 hover:text-red-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={user.id === currentUser?.id}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        
        {/* Create User Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-black">Create New User</h2>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
                {/* Role Selection */}
                <div>
                  <label className="block text-sm font-bold text-black mb-2">
                    User Role *
                  </label>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, role: e.target.value as any }))}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100"
                    required
                  >
                    <option value="CUSTOMER">Customer</option>
                    <option value="STAFF">Staff</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  
                  {createForm.role === 'ADMIN' && (
                    <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-700 font-semibold">
                        ⚠️ Warning: Admin users have full system access. Only create admin accounts for trusted personnel.
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Name */}
                <div>
                  <label className="block text-sm font-bold text-black mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100"
                    required
                  />
                </div>
                
                {/* Email */}
                <div>
                  <label className="block text-sm font-bold text-black mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100"
                    required
                  />
                  <p className="mt-1 text-sm text-gray-600">
                    A temporary password will be sent to this email address
                  </p>
                </div>
                
                {/* Customer-specific fields */}
                {createForm.role === 'CUSTOMER' && (
                  <>
                    <div>
                      <label className="block text-sm font-bold text-black mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={createForm.phone}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-bold text-black mb-2">
                        Company Name
                      </label>
                      <input
                        type="text"
                        value={createForm.company_name}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, company_name: e.target.value }))}
                        className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100"
                      />
                    </div>
                  </>
                )}
                
                {/* Staff-specific fields */}
                {createForm.role === 'STAFF' && (
                  <div>
                    <label className="block text-sm font-bold text-black mb-2">
                      Department
                    </label>
                    <input
                      type="text"
                      value={createForm.department}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, department: e.target.value }))}
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100"
                      placeholder="e.g., Design, Production, Administration"
                    />
                    <p className="mt-1 text-sm text-gray-600">
                      Permissions can be configured after user creation
                    </p>
                  </div>
                )}
                
                {/* Actions */}
                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={createUserMutation.isPending}
                    className="flex-1 px-6 py-3 bg-yellow-400 text-black font-bold rounded-lg hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    {createUserMutation.isPending ? 'Creating...' : 'Create User'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-6 py-3 bg-gray-200 text-black font-bold rounded-lg hover:bg-gray-300 transition-all duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        
        {/* Edit User Modal */}
        {showEditModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-black">Edit User</h2>
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedUser(null);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <form onSubmit={handleUpdateSubmit} className="p-6 space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-bold text-black mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100"
                    required
                  />
                </div>
                
                {/* Email */}
                <div>
                  <label className="block text-sm font-bold text-black mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100"
                    required
                  />
                </div>
                
                {/* Role */}
                <div>
                  <label className="block text-sm font-bold text-black mb-2">
                    User Role *
                  </label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value as any }))}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100"
                    required
                  >
                    <option value="CUSTOMER">Customer</option>
                    <option value="STAFF">Staff</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  
                  {editForm.role === 'ADMIN' && selectedUser.role !== 'ADMIN' && (
                    <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-700 font-semibold">
                        ⚠️ Warning: Changing to Admin role grants full system access.
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Status */}
                <div>
                  <label className="block text-sm font-bold text-black mb-2">
                    Account Status *
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100"
                    required
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>
                  
                  {editForm.status !== 'ACTIVE' && (
                    <p className="mt-1 text-sm text-gray-600">
                      Note: Inactive/Suspended users cannot log in to the system
                    </p>
                  )}
                </div>
                
                {/* Profile Info Display */}
                {selectedUser.customer_profile && (
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h3 className="text-sm font-bold text-black mb-2">Customer Profile</h3>
                    <div className="space-y-1 text-sm text-gray-600">
                      {selectedUser.customer_profile.phone && (
                        <p><strong>Phone:</strong> {selectedUser.customer_profile.phone}</p>
                      )}
                      {selectedUser.customer_profile.company_name && (
                        <p><strong>Company:</strong> {selectedUser.customer_profile.company_name}</p>
                      )}
                      {selectedUser.customer_profile.address && (
                        <p><strong>Address:</strong> {selectedUser.customer_profile.address}</p>
                      )}
                    </div>
                  </div>
                )}
                
                {selectedUser.staff_profile && (
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h3 className="text-sm font-bold text-black mb-2">Staff Profile</h3>
                    <div className="space-y-1 text-sm text-gray-600">
                      {selectedUser.staff_profile.department && (
                        <p><strong>Department:</strong> {selectedUser.staff_profile.department}</p>
                      )}
                      {selectedUser.staff_profile.permissions && (
                        <div>
                          <p className="font-semibold mb-1">Permissions:</p>
                          <ul className="ml-4 list-disc">
                            {Object.entries(selectedUser.staff_profile.permissions).map(([key, value]) => (
                              <li key={key}>
                                {key}: {value ? 'Enabled' : 'Disabled'}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Actions */}
                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={updateUserMutation.isPending}
                    className="flex-1 px-6 py-3 bg-yellow-400 text-black font-bold rounded-lg hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    {updateUserMutation.isPending ? 'Updating...' : 'Update User'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedUser(null);
                    }}
                    className="flex-1 px-6 py-3 bg-gray-200 text-black font-bold rounded-lg hover:bg-gray-300 transition-all duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        
        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <h2 className="text-2xl font-bold text-black mb-4">Delete User</h2>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete <strong>{selectedUser.name}</strong> ({selectedUser.email})?
                This action cannot be undone.
              </p>
              
              <div className="flex gap-4">
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deleteUserMutation.isPending}
                  className="flex-1 px-6 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  {deleteUserMutation.isPending ? 'Deleting...' : 'Delete User'}
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setSelectedUser(null);
                  }}
                  className="flex-1 px-6 py-3 bg-gray-200 text-black font-bold rounded-lg hover:bg-gray-300 transition-all duration-200"
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

export default UV_UsersManagement;