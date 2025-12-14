import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import {
  Package,
  AlertCircle,
  Plus,
  Edit2,
  Search,
  FileText,
  TrendingDown,
  TrendingUp,
  X,
  Check,
  Loader2,
} from 'lucide-react';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  unit: string;
  qty_on_hand: number;
  reorder_point: number;
  reorder_qty: number;
  supplier_name: string | null;
  cost_per_unit: number;
  created_at: string;
  updated_at: string;
}

interface ConsumptionRule {
  id: string;
  service_id: string;
  item_id: string;
  qty_per_unit: number;
  created_at: string;
  updated_at: string;
  // Joined data
  service_name?: string;
  item_name?: string;
}

interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_name: string;
  status: 'DRAFT' | 'PENDING' | 'ORDERED' | 'RECEIVED' | 'CANCELLED';
  total_cost: number;
  created_at: string;
  updated_at: string;
}

interface PurchaseOrderItem {
  id: string;
  po_id: string;
  item_id: string;
  qty: number;
  unit_cost: number;
  line_cost: number;
  // Joined data
  item_name?: string;
  item_sku?: string;
}

interface Service {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
}

interface FormErrors {
  [key: string]: string;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api`;

const fetchInventoryItems = async (
  token: string,
  search?: string,
  sku?: string,
  lowStock?: boolean
): Promise<{ items: InventoryItem[]; total: number }> => {
  const params = new URLSearchParams();
  if (search) params.append('query', search);
  if (sku) params.append('sku', sku);
  if (lowStock) params.append('low_stock', 'true');
  params.append('limit', '100');

  const response = await axios.get(`${API_BASE_URL}/inventory-items?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return response.data;
};

const fetchConsumptionRules = async (
  token: string,
  serviceId?: string
): Promise<{ rules: ConsumptionRule[] }> => {
  const params = new URLSearchParams();
  if (serviceId) params.append('service_id', serviceId);

  const response = await axios.get(`${API_BASE_URL}/material-consumption-rules?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return response.data;
};

const fetchPurchaseOrders = async (
  token: string,
  supplierName?: string,
  status?: string
): Promise<{ orders: PurchaseOrder[]; total: number }> => {
  const params = new URLSearchParams();
  if (supplierName) params.append('supplier_name', supplierName);
  if (status) params.append('status', status);
  params.append('limit', '50');

  const response = await axios.get(`${API_BASE_URL}/purchase-orders?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return response.data;
};

const fetchServices = async (token: string): Promise<{ services: Service[] }> => {
  const response = await axios.get(`${API_BASE_URL}/services?is_active=true&limit=100`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return response.data;
};

const createInventoryItem = async (
  token: string,
  data: {
    sku: string;
    name: string;
    unit: string;
    qty_on_hand: number;
    reorder_point: number;
    reorder_qty: number;
    supplier_name: string | null;
    cost_per_unit: number;
  }
): Promise<InventoryItem> => {
  const response = await axios.post(`${API_BASE_URL}/inventory-items`, data, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  return response.data;
};

const updateInventoryItem = async (
  token: string,
  id: string,
  data: {
    name?: string;
    unit?: string;
    qty_on_hand?: number;
    reorder_point?: number;
    reorder_qty?: number;
    supplier_name?: string | null;
    cost_per_unit?: number;
  }
): Promise<InventoryItem> => {
  const response = await axios.put(`${API_BASE_URL}/inventory-items/${id}`, data, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  return response.data;
};

const createConsumptionRule = async (
  token: string,
  data: {
    service_id: string;
    item_id: string;
    qty_per_unit: number;
  }
): Promise<ConsumptionRule> => {
  const response = await axios.post(`${API_BASE_URL}/material-consumption-rules`, data, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  return response.data;
};

const createPurchaseOrder = async (
  token: string,
  data: {
    supplier_name: string;
    total_cost: number;
    items: Array<{ item_id: string; qty: number; unit_cost: number }>;
  }
): Promise<PurchaseOrder> => {
  const response = await axios.post(`${API_BASE_URL}/purchase-orders`, data, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  return response.data;
};

const receivePurchaseOrder = async (
  token: string,
  id: string,
  data: {
    items_received: Array<{ item_id: string; qty_received: number }>;
  }
): Promise<void> => {
  await axios.post(`${API_BASE_URL}/purchase-orders/${id}/receive`, data, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_InventoryManagement: React.FC = () => {
  // URL params for tab and filters
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab') || 'items';
  const urlStatusFilter = searchParams.get('status_filter');

  // Global state
  const authToken = useAppStore((state) => state.authentication_state.auth_token);
  const currentUser = useAppStore((state) => state.authentication_state.current_user);

  // Local state
  const [activeTab, setActiveTab] = useState<'items' | 'consumption_rules' | 'purchase_orders'>(
    urlTab as any
  );
  const [statusFilter, setStatusFilter] = useState<string | null>(urlStatusFilter);
  const [searchQuery, setSearchQuery] = useState('');
  const [skuFilter, setSkuFilter] = useState('');
  const [serviceFilter, setServiceFilter] = useState<string>('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [poStatusFilter, setPOStatusFilter] = useState<string>('');

  // Modal state
  const [modalOpen, setModalOpen] = useState<
    'create_item' | 'edit_item' | 'create_rule' | 'create_po' | 'receive_po' | null
  >(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Form state
  const [itemForm, setItemForm] = useState({
    sku: '',
    name: '',
    unit: '',
    qty_on_hand: '',
    reorder_point: '',
    reorder_qty: '',
    supplier_name: '',
    cost_per_unit: '',
  });

  const [ruleForm, setRuleForm] = useState({
    service_id: '',
    item_id: '',
    qty_per_unit: '',
  });

  const [poForm, setPOForm] = useState({
    supplier_name: '',
    items: [] as Array<{ item_id: string; qty: string; unit_cost: string }>,
  });

  const [receiveForm, setReceiveForm] = useState<Array<{ item_id: string; qty_received: string }>>(
    []
  );

  // Notification state
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // React Query
  const queryClient = useQueryClient();

  // Fetch inventory items
  const {
    data: inventoryData,
    isLoading: isLoadingInventory,
    error: inventoryError,
  } = useQuery({
    queryKey: ['inventory-items', searchQuery, skuFilter, statusFilter],
    queryFn: () =>
      fetchInventoryItems(
        authToken || '',
        searchQuery,
        skuFilter,
        statusFilter === 'low_stock'
      ),
    enabled: !!authToken && activeTab === 'items',
    staleTime: 60000,
    select: (data) => ({
      ...data,
      items: data.items.map((item) => ({
        ...item,
        qty_on_hand: Number(item.qty_on_hand || 0),
        reorder_point: Number(item.reorder_point || 0),
        reorder_qty: Number(item.reorder_qty || 0),
        cost_per_unit: Number(item.cost_per_unit || 0),
      })),
    }),
  });

  // Fetch consumption rules
  const {
    data: rulesData,
    isLoading: isLoadingRules,
    error: rulesError,
  } = useQuery({
    queryKey: ['consumption-rules', serviceFilter],
    queryFn: () => fetchConsumptionRules(authToken || '', serviceFilter),
    enabled: !!authToken && activeTab === 'consumption_rules',
    staleTime: 60000,
    select: (data) => ({
      ...data,
      rules: data.rules.map((rule) => ({
        ...rule,
        qty_per_unit: Number(rule.qty_per_unit || 0),
      })),
    }),
  });

  // Fetch purchase orders
  const {
    data: poData,
    isLoading: isLoadingPO,
    error: poError,
  } = useQuery({
    queryKey: ['purchase-orders', supplierFilter, poStatusFilter],
    queryFn: () => fetchPurchaseOrders(authToken || '', supplierFilter, poStatusFilter),
    enabled: !!authToken && activeTab === 'purchase_orders',
    staleTime: 60000,
    select: (data) => ({
      ...data,
      orders: data.orders.map((order) => ({
        ...order,
        total_cost: Number(order.total_cost || 0),
      })),
    }),
  });

  // Fetch services for consumption rule form
  const { data: servicesData } = useQuery({
    queryKey: ['services'],
    queryFn: () => fetchServices(authToken || ''),
    enabled: !!authToken,
    staleTime: 300000,
  });

  // Mutations
  const createItemMutation = useMutation({
    mutationFn: (data: Parameters<typeof createInventoryItem>[1]) =>
      createInventoryItem(authToken || '', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      setModalOpen(null);
      setNotification({ type: 'success', message: 'Inventory item created successfully' });
      setTimeout(() => setNotification(null), 3000);
      resetItemForm();
    },
    onError: (error: any) => {
      setNotification({
        type: 'error',
        message: error.response?.data?.message || 'Failed to create item',
      });
      setTimeout(() => setNotification(null), 3000);
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: (data: { id: string; updates: Parameters<typeof updateInventoryItem>[2] }) =>
      updateInventoryItem(authToken || '', data.id, data.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      setModalOpen(null);
      setNotification({ type: 'success', message: 'Inventory item updated successfully' });
      setTimeout(() => setNotification(null), 3000);
      resetItemForm();
      setSelectedItem(null);
    },
    onError: (error: any) => {
      setNotification({
        type: 'error',
        message: error.response?.data?.message || 'Failed to update item',
      });
      setTimeout(() => setNotification(null), 3000);
    },
  });

  const createRuleMutation = useMutation({
    mutationFn: (data: Parameters<typeof createConsumptionRule>[1]) =>
      createConsumptionRule(authToken || '', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consumption-rules'] });
      setModalOpen(null);
      setNotification({ type: 'success', message: 'Consumption rule created successfully' });
      setTimeout(() => setNotification(null), 3000);
      resetRuleForm();
    },
    onError: (error: any) => {
      setNotification({
        type: 'error',
        message: error.response?.data?.message || 'Failed to create rule',
      });
      setTimeout(() => setNotification(null), 3000);
    },
  });

  const createPOMutation = useMutation({
    mutationFn: (data: Parameters<typeof createPurchaseOrder>[1]) =>
      createPurchaseOrder(authToken || '', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      setModalOpen(null);
      setNotification({ type: 'success', message: 'Purchase order created successfully' });
      setTimeout(() => setNotification(null), 3000);
      resetPOForm();
    },
    onError: (error: any) => {
      setNotification({
        type: 'error',
        message: error.response?.data?.message || 'Failed to create purchase order',
      });
      setTimeout(() => setNotification(null), 3000);
    },
  });

  const receivePOMutation = useMutation({
    mutationFn: (data: { id: string; items_received: Parameters<typeof receivePurchaseOrder>[2]['items_received'] }) =>
      receivePurchaseOrder(authToken || '', data.id, { items_received: data.items_received }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      setModalOpen(null);
      setNotification({ type: 'success', message: 'Purchase order received successfully' });
      setTimeout(() => setNotification(null), 3000);
      setSelectedPO(null);
      setReceiveForm([]);
    },
    onError: (error: any) => {
      setNotification({
        type: 'error',
        message: error.response?.data?.message || 'Failed to receive purchase order',
      });
      setTimeout(() => setNotification(null), 3000);
    },
  });

  // Helper functions
  const resetItemForm = () => {
    setItemForm({
      sku: '',
      name: '',
      unit: '',
      qty_on_hand: '',
      reorder_point: '',
      reorder_qty: '',
      supplier_name: '',
      cost_per_unit: '',
    });
    setFormErrors({});
  };

  const resetRuleForm = () => {
    setRuleForm({
      service_id: '',
      item_id: '',
      qty_per_unit: '',
    });
    setFormErrors({});
  };

  const resetPOForm = () => {
    setPOForm({
      supplier_name: '',
      items: [],
    });
    setFormErrors({});
  };

  const isLowStock = (item: InventoryItem): boolean => {
    return item.qty_on_hand <= item.reorder_point;
  };

  const lowStockItems = inventoryData?.items.filter(isLowStock) || [];

  // Update URL when tab changes
  const handleTabChange = (tab: 'items' | 'consumption_rules' | 'purchase_orders') => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams);
    params.set('tab', tab);
    setSearchParams(params);
  };

  // Update URL when status filter changes
  const handleStatusFilterChange = (filter: string | null) => {
    setStatusFilter(filter);
    const params = new URLSearchParams(searchParams);
    if (filter) {
      params.set('status_filter', filter);
    } else {
      params.delete('status_filter');
    }
    setSearchParams(params);
  };

  // Form handlers
  const handleCreateItem = () => {
    const errors: FormErrors = {};

    if (!itemForm.sku.trim()) errors.sku = 'SKU is required';
    if (!itemForm.name.trim()) errors.name = 'Name is required';
    if (!itemForm.unit.trim()) errors.unit = 'Unit is required';
    if (!itemForm.qty_on_hand || Number(itemForm.qty_on_hand) < 0)
      errors.qty_on_hand = 'Valid quantity required';
    if (!itemForm.reorder_point || Number(itemForm.reorder_point) < 0)
      errors.reorder_point = 'Valid reorder point required';
    if (!itemForm.reorder_qty || Number(itemForm.reorder_qty) <= 0)
      errors.reorder_qty = 'Valid reorder quantity required';
    if (!itemForm.cost_per_unit || Number(itemForm.cost_per_unit) <= 0)
      errors.cost_per_unit = 'Valid cost required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    createItemMutation.mutate({
      sku: itemForm.sku.toUpperCase(),
      name: itemForm.name,
      unit: itemForm.unit,
      qty_on_hand: Number(itemForm.qty_on_hand),
      reorder_point: Number(itemForm.reorder_point),
      reorder_qty: Number(itemForm.reorder_qty),
      supplier_name: itemForm.supplier_name || null,
      cost_per_unit: Number(itemForm.cost_per_unit),
    });
  };

  const handleUpdateItem = () => {
    if (!selectedItem) return;

    const errors: FormErrors = {};

    if (!itemForm.name.trim()) errors.name = 'Name is required';
    if (!itemForm.unit.trim()) errors.unit = 'Unit is required';
    if (!itemForm.qty_on_hand || Number(itemForm.qty_on_hand) < 0)
      errors.qty_on_hand = 'Valid quantity required';
    if (!itemForm.reorder_point || Number(itemForm.reorder_point) < 0)
      errors.reorder_point = 'Valid reorder point required';
    if (!itemForm.reorder_qty || Number(itemForm.reorder_qty) <= 0)
      errors.reorder_qty = 'Valid reorder quantity required';
    if (!itemForm.cost_per_unit || Number(itemForm.cost_per_unit) <= 0)
      errors.cost_per_unit = 'Valid cost required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    updateItemMutation.mutate({
      id: selectedItem.id,
      updates: {
        name: itemForm.name,
        unit: itemForm.unit,
        qty_on_hand: Number(itemForm.qty_on_hand),
        reorder_point: Number(itemForm.reorder_point),
        reorder_qty: Number(itemForm.reorder_qty),
        supplier_name: itemForm.supplier_name || null,
        cost_per_unit: Number(itemForm.cost_per_unit),
      },
    });
  };

  const handleCreateRule = () => {
    const errors: FormErrors = {};

    if (!ruleForm.service_id) errors.service_id = 'Service is required';
    if (!ruleForm.item_id) errors.item_id = 'Inventory item is required';
    if (!ruleForm.qty_per_unit || Number(ruleForm.qty_per_unit) <= 0)
      errors.qty_per_unit = 'Valid quantity required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    createRuleMutation.mutate({
      service_id: ruleForm.service_id,
      item_id: ruleForm.item_id,
      qty_per_unit: Number(ruleForm.qty_per_unit),
    });
  };

  const handleCreatePO = () => {
    const errors: FormErrors = {};

    if (!poForm.supplier_name.trim()) errors.supplier_name = 'Supplier name is required';
    if (poForm.items.length === 0) errors.items = 'At least one item is required';

    const validItems = poForm.items.every(
      (item) =>
        item.item_id &&
        item.qty &&
        Number(item.qty) > 0 &&
        item.unit_cost &&
        Number(item.unit_cost) > 0
    );

    if (!validItems) errors.items = 'All items must have valid quantities and costs';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const items = poForm.items.map((item) => ({
      item_id: item.item_id,
      qty: Number(item.qty),
      unit_cost: Number(item.unit_cost),
    }));

    const totalCost = items.reduce((sum, item) => sum + item.qty * item.unit_cost, 0);

    createPOMutation.mutate({
      supplier_name: poForm.supplier_name,
      total_cost: totalCost,
      items,
    });
  };

  const handleReceivePO = () => {
    if (!selectedPO) return;

    const errors: FormErrors = {};

    const validItems = receiveForm.every(
      (item) => item.qty_received && Number(item.qty_received) > 0
    );

    if (!validItems) errors.items = 'All quantities must be positive';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const items_received = receiveForm.map((item) => ({
      item_id: item.item_id,
      qty_received: Number(item.qty_received),
    }));

    receivePOMutation.mutate({
      id: selectedPO.id,
      items_received,
    });
  };

  const openEditItemModal = (item: InventoryItem) => {
    setSelectedItem(item);
    setItemForm({
      sku: item.sku,
      name: item.name,
      unit: item.unit,
      qty_on_hand: item.qty_on_hand.toString(),
      reorder_point: item.reorder_point.toString(),
      reorder_qty: item.reorder_qty.toString(),
      supplier_name: item.supplier_name || '',
      cost_per_unit: item.cost_per_unit.toString(),
    });
    setModalOpen('edit_item');
  };

  const openReceivePOModal = (po: PurchaseOrder) => {
    setSelectedPO(po);
    // Initialize receive form - in real app, fetch PO items from API
    // For now, use empty array
    setReceiveForm([]);
    setModalOpen('receive_po');
  };

  const addPOItem = () => {
    setPOForm((prev) => ({
      ...prev,
      items: [...prev.items, { item_id: '', qty: '', unit_cost: '' }],
    }));
  };

  const removePOItem = (index: number) => {
    setPOForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const updatePOItem = (index: number, field: string, value: string) => {
    setPOForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  // Sync URL params with state
  useEffect(() => {
    const urlTab = searchParams.get('tab');
    if (urlTab && ['items', 'consumption_rules', 'purchase_orders'].includes(urlTab)) {
      setActiveTab(urlTab as any);
    }

    const urlFilter = searchParams.get('status_filter');
    setStatusFilter(urlFilter);
  }, [searchParams]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className="w-8 h-8 text-black" />
                <h1 className="text-3xl font-bold text-black">Inventory Management</h1>
              </div>
              <div className="flex items-center gap-3">
                {activeTab === 'items' && (
                  <button
                    onClick={() => {
                      resetItemForm();
                      setModalOpen('create_item');
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    <Plus className="w-5 h-5" />
                    Add Item
                  </button>
                )}
                {activeTab === 'consumption_rules' && (
                  <button
                    onClick={() => {
                      resetRuleForm();
                      setModalOpen('create_rule');
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    <Plus className="w-5 h-5" />
                    Add Rule
                  </button>
                )}
                {activeTab === 'purchase_orders' && (
                  <button
                    onClick={() => {
                      resetPOForm();
                      setModalOpen('create_po');
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    <Plus className="w-5 h-5" />
                    Create PO
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Notification */}
        {notification && (
          <div className="fixed top-4 right-4 z-50">
            <div
              className={`px-6 py-4 rounded-lg shadow-lg ${
                notification.type === 'success'
                  ? 'bg-green-600 text-white'
                  : 'bg-red-600 text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                {notification.type === 'success' ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
                <p className="font-medium">{notification.message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Low Stock Alert Banner */}
        {activeTab === 'items' && lowStockItems.length > 0 && (
          <div className="bg-yellow-50 border-b border-yellow-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-yellow-600" />
                <div className="flex-1">
                  <p className="font-semibold text-yellow-900">
                    {lowStockItems.length} item{lowStockItems.length !== 1 ? 's' : ''} below
                    reorder point
                  </p>
                  <p className="text-sm text-yellow-700">
                    Review low stock items and generate purchase orders
                  </p>
                </div>
                <button
                  onClick={() => handleStatusFilterChange('low_stock')}
                  className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-black font-medium rounded-lg transition-colors"
                >
                  View Items
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex gap-8">
              <button
                onClick={() => handleTabChange('items')}
                className={`px-4 py-4 border-b-2 font-semibold transition-colors ${
                  activeTab === 'items'
                    ? 'border-yellow-400 text-black'
                    : 'border-transparent text-gray-600 hover:text-black'
                }`}
              >
                Inventory Items
              </button>
              <button
                onClick={() => handleTabChange('consumption_rules')}
                className={`px-4 py-4 border-b-2 font-semibold transition-colors ${
                  activeTab === 'consumption_rules'
                    ? 'border-yellow-400 text-black'
                    : 'border-transparent text-gray-600 hover:text-black'
                }`}
              >
                Consumption Rules
              </button>
              <button
                onClick={() => handleTabChange('purchase_orders')}
                className={`px-4 py-4 border-b-2 font-semibold transition-colors ${
                  activeTab === 'purchase_orders'
                    ? 'border-yellow-400 text-black'
                    : 'border-transparent text-gray-600 hover:text-black'
                }`}
              >
                Purchase Orders
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Inventory Items Tab */}
          {activeTab === 'items' && (
            <>
              {/* Filters */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by name..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                      }}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="Filter by SKU..."
                      value={skuFilter}
                      onChange={(e) => {
                        setSkuFilter(e.target.value);
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <select
                      value={statusFilter || 'all'}
                      onChange={(e) =>
                        handleStatusFilterChange(e.target.value === 'all' ? null : e.target.value)
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                    >
                      <option value="all">All Items</option>
                      <option value="low_stock">Low Stock Only</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              {isLoadingInventory ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-yellow-400" />
                </div>
              ) : inventoryError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                  <p className="text-red-700">Failed to load inventory items</p>
                </div>
              ) : !inventoryData || inventoryData.items.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No inventory items found</p>
                  <button
                    onClick={() => {
                      resetItemForm();
                      setModalOpen('create_item');
                    }}
                    className="px-6 py-3 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold rounded-lg transition-colors"
                  >
                    Add Your First Item
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-black">
                            SKU
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-black">
                            Name
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-black">
                            Unit
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-black">
                            Qty On Hand
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-black">
                            Reorder Point
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-black">
                            Supplier
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-black">
                            Cost/Unit
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-black">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {inventoryData.items.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 text-sm font-medium text-black">
                              {item.sku}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-black">{item.name}</span>
                                {isLowStock(item) && (
                                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">
                                    LOW STOCK
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700">{item.unit}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-sm font-semibold ${
                                    isLowStock(item) ? 'text-red-600' : 'text-gray-900'
                                  }`}
                                >
                                  {item.qty_on_hand}
                                </span>
                                {isLowStock(item) && (
                                  <TrendingDown className="w-4 h-4 text-red-600" />
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700">
                              {item.reorder_point}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700">
                              {item.supplier_name || '-'}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                              €{Number(item.cost_per_unit || 0).toFixed(2)}
                            </td>
                            <td className="px-6 py-4">
                              <button
                                onClick={() => openEditItemModal(item)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              >
                                <Edit2 className="w-4 h-4 text-gray-600" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Consumption Rules Tab */}
          {activeTab === 'consumption_rules' && (
            <>
              {/* Filters */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-black mb-2">
                      Filter by Service
                    </label>
                    <select
                      value={serviceFilter}
                      onChange={(e) => setServiceFilter(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                    >
                      <option value="">All Services</option>
                      {servicesData?.services.map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Rules Table */}
              {isLoadingRules ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-yellow-400" />
                </div>
              ) : rulesError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                  <p className="text-red-700">Failed to load consumption rules</p>
                </div>
              ) : !rulesData || rulesData.rules.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No consumption rules found</p>
                  <button
                    onClick={() => {
                      resetRuleForm();
                      setModalOpen('create_rule');
                    }}
                    className="px-6 py-3 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold rounded-lg transition-colors"
                  >
                    Create First Rule
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-black">
                            Service
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-black">
                            Inventory Item
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-black">
                            Qty Per Unit
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-black">
                            Created
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {rulesData.rules.map((rule) => (
                          <tr key={rule.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 text-sm text-black">
                              {rule.service_name || rule.service_id}
                            </td>
                            <td className="px-6 py-4 text-sm text-black">
                              {rule.item_name || rule.item_id}
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                              {Number(rule.qty_per_unit || 0).toFixed(2)}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700">
                              {new Date(rule.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Purchase Orders Tab */}
          {activeTab === 'purchase_orders' && (
            <>
              {/* Filters */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <input
                      type="text"
                      placeholder="Filter by supplier..."
                      value={supplierFilter}
                      onChange={(e) => setSupplierFilter(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <select
                      value={poStatusFilter}
                      onChange={(e) => setPOStatusFilter(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                    >
                      <option value="">All Statuses</option>
                      <option value="DRAFT">Draft</option>
                      <option value="PENDING">Pending</option>
                      <option value="ORDERED">Ordered</option>
                      <option value="RECEIVED">Received</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* PO Table */}
              {isLoadingPO ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-yellow-400" />
                </div>
              ) : poError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                  <p className="text-red-700">Failed to load purchase orders</p>
                </div>
              ) : !poData || poData.orders.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No purchase orders found</p>
                  <button
                    onClick={() => {
                      resetPOForm();
                      setModalOpen('create_po');
                    }}
                    className="px-6 py-3 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold rounded-lg transition-colors"
                  >
                    Create Purchase Order
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-black">
                            PO Number
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-black">
                            Supplier
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-black">
                            Status
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-black">
                            Total Cost
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-black">
                            Created
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-black">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {poData.orders.map((po) => (
                          <tr key={po.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 text-sm font-medium text-black">
                              {po.po_number}
                            </td>
                            <td className="px-6 py-4 text-sm text-black">{po.supplier_name}</td>
                            <td className="px-6 py-4">
                              <span
                                className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                  po.status === 'RECEIVED'
                                    ? 'bg-green-100 text-green-800'
                                    : po.status === 'ORDERED'
                                    ? 'bg-blue-100 text-blue-800'
                                    : po.status === 'CANCELLED'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {po.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                              €{Number(po.total_cost || 0).toFixed(2)}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700">
                              {new Date(po.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4">
                              {po.status === 'ORDERED' && (
                                <button
                                  onClick={() => openReceivePOModal(po)}
                                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                                >
                                  Receive
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Create/Edit Item Modal */}
        {(modalOpen === 'create_item' || modalOpen === 'edit_item') && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-black">
                  {modalOpen === 'create_item' ? 'Add Inventory Item' : 'Edit Inventory Item'}
                </h2>
                <button
                  onClick={() => {
                    setModalOpen(null);
                    setSelectedItem(null);
                    resetItemForm();
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  {modalOpen === 'create_item' && (
                    <div>
                      <label className="block text-sm font-semibold text-black mb-2">
                        SKU <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={itemForm.sku}
                        onChange={(e) => {
                          setFormErrors((prev) => ({ ...prev, sku: '' }));
                          setItemForm((prev) => ({ ...prev, sku: e.target.value }));
                        }}
                        placeholder="e.g., VINYL-001"
                        className={`w-full px-4 py-2 border ${
                          formErrors.sku ? 'border-red-500' : 'border-gray-300'
                        } rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent`}
                      />
                      {formErrors.sku && (
                        <p className="text-red-600 text-sm mt-1">{formErrors.sku}</p>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-black mb-2">
                      Name <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={itemForm.name}
                      onChange={(e) => {
                        setFormErrors((prev) => ({ ...prev, name: '' }));
                        setItemForm((prev) => ({ ...prev, name: e.target.value }));
                      }}
                      placeholder="e.g., Premium Vinyl Roll"
                      className={`w-full px-4 py-2 border ${
                        formErrors.name ? 'border-red-500' : 'border-gray-300'
                      } rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent`}
                    />
                    {formErrors.name && (
                      <p className="text-red-600 text-sm mt-1">{formErrors.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-black mb-2">
                      Unit <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={itemForm.unit}
                      onChange={(e) => {
                        setFormErrors((prev) => ({ ...prev, unit: '' }));
                        setItemForm((prev) => ({ ...prev, unit: e.target.value }));
                      }}
                      placeholder="e.g., rolls, sheets, boxes"
                      className={`w-full px-4 py-2 border ${
                        formErrors.unit ? 'border-red-500' : 'border-gray-300'
                      } rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent`}
                    />
                    {formErrors.unit && (
                      <p className="text-red-600 text-sm mt-1">{formErrors.unit}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-black mb-2">
                        Qty On Hand <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="number"
                        value={itemForm.qty_on_hand}
                        onChange={(e) => {
                          setFormErrors((prev) => ({ ...prev, qty_on_hand: '' }));
                          setItemForm((prev) => ({ ...prev, qty_on_hand: e.target.value }));
                        }}
                        min="0"
                        step="1"
                        className={`w-full px-4 py-2 border ${
                          formErrors.qty_on_hand ? 'border-red-500' : 'border-gray-300'
                        } rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent`}
                      />
                      {formErrors.qty_on_hand && (
                        <p className="text-red-600 text-sm mt-1">{formErrors.qty_on_hand}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-black mb-2">
                        Reorder Point <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="number"
                        value={itemForm.reorder_point}
                        onChange={(e) => {
                          setFormErrors((prev) => ({ ...prev, reorder_point: '' }));
                          setItemForm((prev) => ({ ...prev, reorder_point: e.target.value }));
                        }}
                        min="0"
                        step="1"
                        className={`w-full px-4 py-2 border ${
                          formErrors.reorder_point ? 'border-red-500' : 'border-gray-300'
                        } rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent`}
                      />
                      {formErrors.reorder_point && (
                        <p className="text-red-600 text-sm mt-1">{formErrors.reorder_point}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-black mb-2">
                        Reorder Qty <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="number"
                        value={itemForm.reorder_qty}
                        onChange={(e) => {
                          setFormErrors((prev) => ({ ...prev, reorder_qty: '' }));
                          setItemForm((prev) => ({ ...prev, reorder_qty: e.target.value }));
                        }}
                        min="1"
                        step="1"
                        className={`w-full px-4 py-2 border ${
                          formErrors.reorder_qty ? 'border-red-500' : 'border-gray-300'
                        } rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent`}
                      />
                      {formErrors.reorder_qty && (
                        <p className="text-red-600 text-sm mt-1">{formErrors.reorder_qty}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-black mb-2">
                      Supplier Name
                    </label>
                    <input
                      type="text"
                      value={itemForm.supplier_name}
                      onChange={(e) => {
                        setItemForm((prev) => ({ ...prev, supplier_name: e.target.value }));
                      }}
                      placeholder="Optional"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-black mb-2">
                      Cost Per Unit (€) <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="number"
                      value={itemForm.cost_per_unit}
                      onChange={(e) => {
                        setFormErrors((prev) => ({ ...prev, cost_per_unit: '' }));
                        setItemForm((prev) => ({ ...prev, cost_per_unit: e.target.value }));
                      }}
                      min="0"
                      step="0.01"
                      className={`w-full px-4 py-2 border ${
                        formErrors.cost_per_unit ? 'border-red-500' : 'border-gray-300'
                      } rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent`}
                    />
                    {formErrors.cost_per_unit && (
                      <p className="text-red-600 text-sm mt-1">{formErrors.cost_per_unit}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 mt-6">
                  <button
                    onClick={() => {
                      setModalOpen(null);
                      setSelectedItem(null);
                      resetItemForm();
                    }}
                    className="px-6 py-3 border border-gray-300 text-black font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (modalOpen === 'create_item') {
                        handleCreateItem();
                      } else {
                        handleUpdateItem();
                      }
                    }}
                    disabled={createItemMutation.isPending || updateItemMutation.isPending}
                    className="px-6 py-3 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {(createItemMutation.isPending || updateItemMutation.isPending) && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    {modalOpen === 'create_item' ? 'Create Item' : 'Update Item'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Consumption Rule Modal */}
        {modalOpen === 'create_rule' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-black">Add Consumption Rule</h2>
                <button
                  onClick={() => {
                    setModalOpen(null);
                    resetRuleForm();
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-black mb-2">
                      Service <span className="text-red-600">*</span>
                    </label>
                    <select
                      value={ruleForm.service_id}
                      onChange={(e) => {
                        setFormErrors((prev) => ({ ...prev, service_id: '' }));
                        setRuleForm((prev) => ({ ...prev, service_id: e.target.value }));
                      }}
                      className={`w-full px-4 py-2 border ${
                        formErrors.service_id ? 'border-red-500' : 'border-gray-300'
                      } rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent`}
                    >
                      <option value="">Select service...</option>
                      {servicesData?.services.map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.name}
                        </option>
                      ))}
                    </select>
                    {formErrors.service_id && (
                      <p className="text-red-600 text-sm mt-1">{formErrors.service_id}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-black mb-2">
                      Inventory Item <span className="text-red-600">*</span>
                    </label>
                    <select
                      value={ruleForm.item_id}
                      onChange={(e) => {
                        setFormErrors((prev) => ({ ...prev, item_id: '' }));
                        setRuleForm((prev) => ({ ...prev, item_id: e.target.value }));
                      }}
                      className={`w-full px-4 py-2 border ${
                        formErrors.item_id ? 'border-red-500' : 'border-gray-300'
                      } rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent`}
                    >
                      <option value="">Select item...</option>
                      {inventoryData?.items.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({item.sku})
                        </option>
                      ))}
                    </select>
                    {formErrors.item_id && (
                      <p className="text-red-600 text-sm mt-1">{formErrors.item_id}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-black mb-2">
                      Quantity Per Unit <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="number"
                      value={ruleForm.qty_per_unit}
                      onChange={(e) => {
                        setFormErrors((prev) => ({ ...prev, qty_per_unit: '' }));
                        setRuleForm((prev) => ({ ...prev, qty_per_unit: e.target.value }));
                      }}
                      min="0"
                      step="0.01"
                      placeholder="e.g., 2.5"
                      className={`w-full px-4 py-2 border ${
                        formErrors.qty_per_unit ? 'border-red-500' : 'border-gray-300'
                      } rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent`}
                    />
                    {formErrors.qty_per_unit && (
                      <p className="text-red-600 text-sm mt-1">{formErrors.qty_per_unit}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 mt-6">
                  <button
                    onClick={() => {
                      setModalOpen(null);
                      resetRuleForm();
                    }}
                    className="px-6 py-3 border border-gray-300 text-black font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateRule}
                    disabled={createRuleMutation.isPending}
                    className="px-6 py-3 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {createRuleMutation.isPending && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    Create Rule
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Purchase Order Modal */}
        {modalOpen === 'create_po' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-black">Create Purchase Order</h2>
                <button
                  onClick={() => {
                    setModalOpen(null);
                    resetPOForm();
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <div className="p-6">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-black mb-2">
                      Supplier Name <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={poForm.supplier_name}
                      onChange={(e) => {
                        setFormErrors((prev) => ({ ...prev, supplier_name: '' }));
                        setPOForm((prev) => ({ ...prev, supplier_name: e.target.value }));
                      }}
                      placeholder="e.g., Materials Supplier Ltd"
                      className={`w-full px-4 py-2 border ${
                        formErrors.supplier_name ? 'border-red-500' : 'border-gray-300'
                      } rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent`}
                    />
                    {formErrors.supplier_name && (
                      <p className="text-red-600 text-sm mt-1">{formErrors.supplier_name}</p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <label className="block text-sm font-semibold text-black">
                        Items <span className="text-red-600">*</span>
                      </label>
                      <button
                        onClick={addPOItem}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-black font-medium rounded-lg transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Add Item
                      </button>
                    </div>

                    {formErrors.items && (
                      <p className="text-red-600 text-sm mb-2">{formErrors.items}</p>
                    )}

                    <div className="space-y-3">
                      {poForm.items.map((item, index) => (
                        <div key={index} className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg">
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Item
                              </label>
                              <select
                                value={item.item_id}
                                onChange={(e) => updatePOItem(index, 'item_id', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                              >
                                <option value="">Select...</option>
                                {inventoryData?.items.map((invItem) => (
                                  <option key={invItem.id} value={invItem.id}>
                                    {invItem.name} ({invItem.sku})
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Quantity
                              </label>
                              <input
                                type="number"
                                value={item.qty}
                                onChange={(e) => updatePOItem(index, 'qty', e.target.value)}
                                min="1"
                                step="1"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Unit Cost (€)
                              </label>
                              <input
                                type="number"
                                value={item.unit_cost}
                                onChange={(e) => updatePOItem(index, 'unit_cost', e.target.value)}
                                min="0"
                                step="0.01"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                              />
                            </div>
                          </div>

                          <button
                            onClick={() => removePOItem(index)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}

                      {poForm.items.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          No items added yet. Click "Add Item" to get started.
                        </div>
                      )}
                    </div>
                  </div>

                  {poForm.items.length > 0 && (
                    <div className="border-t border-gray-200 pt-4">
                      <div className="flex items-center justify-between text-lg font-bold">
                        <span className="text-black">Total Cost:</span>
                        <span className="text-black">
                          €
                          {poForm.items
                            .reduce((sum, item) => {
                              const qty = Number(item.qty) || 0;
                              const cost = Number(item.unit_cost) || 0;
                              return sum + qty * cost;
                            }, 0)
                            .toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 mt-6">
                  <button
                    onClick={() => {
                      setModalOpen(null);
                      resetPOForm();
                    }}
                    className="px-6 py-3 border border-gray-300 text-black font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreatePO}
                    disabled={createPOMutation.isPending}
                    className="px-6 py-3 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {createPOMutation.isPending && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    Create Purchase Order
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Receive Purchase Order Modal */}
        {modalOpen === 'receive_po' && selectedPO && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-black">
                  Receive Purchase Order: {selectedPO.po_number}
                </h2>
                <button
                  onClick={() => {
                    setModalOpen(null);
                    setSelectedPO(null);
                    setReceiveForm([]);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <div className="p-6">
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-900">
                    <strong>Supplier:</strong> {selectedPO.supplier_name}
                  </p>
                  <p className="text-sm text-blue-900 mt-1">
                    <strong>Total Cost:</strong> €{Number(selectedPO.total_cost || 0).toFixed(2)}
                  </p>
                </div>

                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-black">
                    Enter Received Quantities
                  </label>

                  {/* In a real implementation, fetch PO items from API */}
                  {receiveForm.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>No items to receive. Purchase order items will be loaded here.</p>
                      <p className="text-sm mt-2">
                        (In production, this would fetch items from GET /purchase-orders/{'{'}id{'}'}/items)
                      </p>
                    </div>
                  ) : (
                    receiveForm.map((item, index) => (
                      <div key={index} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-black">Item #{index + 1}</p>
                        </div>
                        <div className="w-40">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Qty Received
                          </label>
                          <input
                            type="number"
                            value={item.qty_received}
                            onChange={(e) => {
                              setFormErrors((prev) => ({ ...prev, items: '' }));
                              setReceiveForm((prev) =>
                                prev.map((itm, i) =>
                                  i === index ? { ...itm, qty_received: e.target.value } : itm
                                )
                              );
                            }}
                            min="0"
                            step="1"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                          />
                        </div>
                      </div>
                    ))
                  )}

                  {formErrors.items && (
                    <p className="text-red-600 text-sm">{formErrors.items}</p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 mt-6">
                  <button
                    onClick={() => {
                      setModalOpen(null);
                      setSelectedPO(null);
                      setReceiveForm([]);
                    }}
                    className="px-6 py-3 border border-gray-300 text-black font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReceivePO}
                    disabled={receivePOMutation.isPending || receiveForm.length === 0}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {receivePOMutation.isPending && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    Confirm Receipt
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default UV_InventoryManagement;