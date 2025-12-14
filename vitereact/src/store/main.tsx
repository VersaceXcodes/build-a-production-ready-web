import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

// User Types
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
  created_at: string;
  updated_at: string;
}

interface StaffProfile {
  id: string;
  user_id: string;
  department: string | null;
  permissions: Record<string, boolean> | null;
  created_at: string;
  updated_at: string;
}

// Authentication State
interface AuthenticationState {
  current_user: (User & {
    customer_profile?: CustomerProfile;
    staff_profile?: StaffProfile;
  }) | null;
  auth_token: string | null;
  authentication_status: {
    is_authenticated: boolean;
    is_loading: boolean;
  };
  error_message: string | null;
}

// Notification State
interface Notification {
  id: string;
  type: string;
  message: string;
  created_at: string;
  is_read: boolean;
  entity_id?: string;
}

interface NotificationState {
  unread_counts: {
    quotes: number;
    orders: number;
    messages: number;
    jobs?: number;
    inventory_alerts?: number;
  };
  notifications: Notification[];
  last_updated: string | null;
}

// Feature Flags
interface FeatureFlags {
  b2b_accounts: boolean;
  inventory_management: boolean;
  analytics_dashboard: boolean;
  sla_scheduling: boolean;
}

// System Configuration
interface CompanyInfo {
  name: string;
  email: string;
  phone: string;
  address?: string;
}

interface SystemConfig {
  stripe_enabled: boolean;
  deposit_percentage: number;
  tax_rate: number;
  emergency_booking_fee_percentage: number;
  company_info: CompanyInfo;
}

// Quote Builder State
interface UploadedFile {
  id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  file_type: string;
  dpi_warning: boolean;
  upload_progress: number;
  upload_status: 'pending' | 'uploading' | 'completed' | 'failed';
}

interface EstimateRange {
  min: number;
  max: number;
}

interface QuoteBuilderState {
  current_step: number;
  selected_service_id: string | null;
  project_answers: Record<string, any>;
  uploaded_files: UploadedFile[];
  selected_tier_id: string | null;
  estimate_range: EstimateRange | null;
  is_draft_saved: boolean;
  draft_quote_id: string | null;
}

// Booking State
interface BookingState {
  selected_date: string | null;
  selected_time_slot: string | null;
  is_emergency_booking: boolean;
  urgent_fee_amount: number;
  booking_step: string;
}

// ============================================================================
// MAIN STORE INTERFACE
// ============================================================================

interface AppState {
  // State slices
  authentication_state: AuthenticationState;
  notification_state: NotificationState;
  feature_flags: FeatureFlags;
  system_config: SystemConfig;
  quote_builder_state: QuoteBuilderState;
  booking_state: BookingState;

  // Authentication actions
  login_user: (email: string, password: string) => Promise<void>;
  logout_user: () => Promise<void>;
  register_user: (email: string, password: string, name: string, phone?: string, company_name?: string, address?: string) => Promise<void>;
  initialize_auth: () => Promise<void>;
  clear_auth_error: () => void;
  update_user_profile: (user_data: Partial<User>, customer_profile?: Partial<CustomerProfile>, staff_profile?: Partial<StaffProfile>) => void;

  // Notification actions
  set_notifications: (notifications: Notification[]) => void;
  add_notification: (notification: Notification) => void;
  mark_notification_read: (notification_id: string) => void;
  mark_all_notifications_read: () => void;
  update_unread_counts: (counts: Partial<NotificationState['unread_counts']>) => void;
  clear_notifications: () => void;

  // Feature flags actions
  load_feature_flags: (flags: FeatureFlags) => void;
  update_feature_flag: (flag_key: keyof FeatureFlags, value: boolean) => void;

  // System config actions
  load_system_config: (config: Partial<SystemConfig>) => void;
  update_system_config: (config: Partial<SystemConfig>) => void;

  // Quote builder actions
  set_quote_step: (step: number) => void;
  select_service: (service_id: string) => void;
  update_project_answer: (key: string, value: any) => void;
  update_project_answers: (answers: Record<string, any>) => void;
  add_uploaded_file: (file: UploadedFile) => void;
  remove_uploaded_file: (file_id: string) => void;
  update_uploaded_file: (file_id: string, updates: Partial<UploadedFile>) => void;
  select_tier: (tier_id: string) => void;
  set_estimate_range: (range: EstimateRange | null) => void;
  set_draft_saved: (is_saved: boolean) => void;
  set_draft_quote_id: (quote_id: string | null) => void;
  reset_quote_builder: () => void;
  load_draft_quote: (draft_data: Partial<QuoteBuilderState>) => void;

  // Booking actions
  set_selected_date: (date: string | null) => void;
  set_selected_time_slot: (time_slot: string | null) => void;
  set_emergency_booking: (is_emergency: boolean, urgent_fee_amount?: number) => void;
  set_booking_step: (step: string) => void;
  reset_booking_state: () => void;
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ======================================================================
      // INITIAL STATE
      // ======================================================================

      authentication_state: {
        current_user: null,
        auth_token: null,
        authentication_status: {
          is_authenticated: false,
          is_loading: true,
        },
        error_message: null,
      },

      notification_state: {
        unread_counts: {
          quotes: 0,
          orders: 0,
          messages: 0,
          jobs: 0,
          inventory_alerts: 0,
        },
        notifications: [],
        last_updated: null,
      },

      feature_flags: {
        b2b_accounts: false,
        inventory_management: false,
        analytics_dashboard: false,
        sla_scheduling: false,
      },

      system_config: {
        stripe_enabled: false,
        deposit_percentage: 50,
        tax_rate: 15,
        emergency_booking_fee_percentage: 20,
        company_info: {
          name: 'SultanStamp',
          email: 'info@sultanstamp.com',
          phone: '+353 87 470 0356',
        },
      },

      quote_builder_state: {
        current_step: 1,
        selected_service_id: null,
        project_answers: {},
        uploaded_files: [],
        selected_tier_id: null,
        estimate_range: null,
        is_draft_saved: false,
        draft_quote_id: null,
      },

      booking_state: {
        selected_date: null,
        selected_time_slot: null,
        is_emergency_booking: false,
        urgent_fee_amount: 0,
        booking_step: 'date_selection',
      },

      // ======================================================================
      // AUTHENTICATION ACTIONS
      // ======================================================================

      login_user: async (email: string, password: string) => {
        set((state) => ({
          authentication_state: {
            ...state.authentication_state,
            authentication_status: {
              ...state.authentication_state.authentication_status,
              is_loading: true,
            },
            error_message: null,
          },
        }));

        try {
          const response = await axios.post(
            `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/auth/login`,
            { email, password },
            {
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );

          const { user, token } = response.data;

          set((state) => ({
            authentication_state: {
              current_user: user,
              auth_token: token,
              authentication_status: {
                is_authenticated: true,
                is_loading: false,
              },
              error_message: null,
            },
          }));
        } catch (error: any) {
          const error_message =
            error.response?.data?.message ||
            error.message ||
            'Login failed. Please try again.';

          set((state) => ({
            authentication_state: {
              current_user: null,
              auth_token: null,
              authentication_status: {
                is_authenticated: false,
                is_loading: false,
              },
              error_message: error_message,
            },
          }));

          throw new Error(error_message);
        }
      },

      logout_user: async () => {
        const { auth_token } = get().authentication_state;

        try {
          if (auth_token) {
            await axios.post(
              `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/auth/logout`,
              {},
              {
                headers: {
                  Authorization: `Bearer ${auth_token}`,
                },
              }
            );
          }
        } catch (error) {
          // Ignore logout errors, clear state anyway
          console.error('Logout error:', error);
        }

        set({
          authentication_state: {
            current_user: null,
            auth_token: null,
            authentication_status: {
              is_authenticated: false,
              is_loading: false,
            },
            error_message: null,
          },
          notification_state: {
            unread_counts: {
              quotes: 0,
              orders: 0,
              messages: 0,
              jobs: 0,
              inventory_alerts: 0,
            },
            notifications: [],
            last_updated: null,
          },
        });
      },

      register_user: async (
        email: string,
        password: string,
        name: string,
        phone?: string,
        company_name?: string,
        address?: string
      ) => {
        set((state) => ({
          authentication_state: {
            ...state.authentication_state,
            authentication_status: {
              ...state.authentication_state.authentication_status,
              is_loading: true,
            },
            error_message: null,
          },
        }));

        try {
          const response = await axios.post(
            `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/auth/register`,
            {
              email,
              password,
              name,
              phone: phone || null,
              company_name: company_name || null,
              address: address || null,
            },
            {
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );

          const { user, token } = response.data;

          set((state) => ({
            authentication_state: {
              current_user: user,
              auth_token: token,
              authentication_status: {
                is_authenticated: true,
                is_loading: false,
              },
              error_message: null,
            },
          }));
        } catch (error: any) {
          const error_message =
            error.response?.data?.message ||
            error.message ||
            'Registration failed. Please try again.';

          set((state) => ({
            authentication_state: {
              current_user: null,
              auth_token: null,
              authentication_status: {
                is_authenticated: false,
                is_loading: false,
              },
              error_message: error_message,
            },
          }));

          throw new Error(error_message);
        }
      },

      initialize_auth: async () => {
        const { authentication_state } = get();
        const token = authentication_state.auth_token;

        if (!token) {
          set((state) => ({
            authentication_state: {
              ...state.authentication_state,
              authentication_status: {
                is_authenticated: false,
                is_loading: false,
              },
            },
          }));
          return;
        }

        try {
          const response = await axios.get(
            `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/users/me`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          const { user, customer_profile, staff_profile } = response.data;

          set((state) => ({
            authentication_state: {
              current_user: {
                ...user,
                ...(customer_profile && { customer_profile }),
                ...(staff_profile && { staff_profile }),
              },
              auth_token: token,
              authentication_status: {
                is_authenticated: true,
                is_loading: false,
              },
              error_message: null,
            },
          }));
        } catch (error) {
          // Token is invalid, clear auth state
          set((state) => ({
            authentication_state: {
              current_user: null,
              auth_token: null,
              authentication_status: {
                is_authenticated: false,
                is_loading: false,
              },
              error_message: null,
            },
          }));
        }
      },

      clear_auth_error: () => {
        set((state) => ({
          authentication_state: {
            ...state.authentication_state,
            error_message: null,
          },
        }));
      },

      update_user_profile: (
        user_data: Partial<User>,
        customer_profile?: Partial<CustomerProfile>,
        staff_profile?: Partial<StaffProfile>
      ) => {
        set((state) => {
          if (!state.authentication_state.current_user) return state;

          return {
            authentication_state: {
              ...state.authentication_state,
              current_user: {
                ...state.authentication_state.current_user,
                ...user_data,
                ...(customer_profile && {
                  customer_profile: {
                    ...state.authentication_state.current_user.customer_profile,
                    ...customer_profile,
                  } as CustomerProfile,
                }),
                ...(staff_profile && {
                  staff_profile: {
                    ...state.authentication_state.current_user.staff_profile,
                    ...staff_profile,
                  } as StaffProfile,
                }),
              },
            },
          };
        });
      },

      // ======================================================================
      // NOTIFICATION ACTIONS
      // ======================================================================

      set_notifications: (notifications: Notification[]) => {
        set((state) => ({
          notification_state: {
            ...state.notification_state,
            notifications,
            last_updated: new Date().toISOString(),
          },
        }));
      },

      add_notification: (notification: Notification) => {
        set((state) => ({
          notification_state: {
            ...state.notification_state,
            notifications: [notification, ...state.notification_state.notifications],
            last_updated: new Date().toISOString(),
          },
        }));
      },

      mark_notification_read: (notification_id: string) => {
        set((state) => ({
          notification_state: {
            ...state.notification_state,
            notifications: state.notification_state.notifications.map((notif) =>
              notif.id === notification_id
                ? { ...notif, is_read: true }
                : notif
            ),
          },
        }));
      },

      mark_all_notifications_read: () => {
        set((state) => ({
          notification_state: {
            ...state.notification_state,
            notifications: state.notification_state.notifications.map((notif) => ({
              ...notif,
              is_read: true,
            })),
            unread_counts: {
              quotes: 0,
              orders: 0,
              messages: 0,
              jobs: 0,
              inventory_alerts: 0,
            },
          },
        }));
      },

      update_unread_counts: (counts: Partial<NotificationState['unread_counts']>) => {
        set((state) => ({
          notification_state: {
            ...state.notification_state,
            unread_counts: {
              ...state.notification_state.unread_counts,
              ...counts,
            },
          },
        }));
      },

      clear_notifications: () => {
        set((state) => ({
          notification_state: {
            unread_counts: {
              quotes: 0,
              orders: 0,
              messages: 0,
              jobs: 0,
              inventory_alerts: 0,
            },
            notifications: [],
            last_updated: null,
          },
        }));
      },

      // ======================================================================
      // FEATURE FLAGS ACTIONS
      // ======================================================================

      load_feature_flags: (flags: FeatureFlags) => {
        set({ feature_flags: flags });
      },

      update_feature_flag: (flag_key: keyof FeatureFlags, value: boolean) => {
        set((state) => ({
          feature_flags: {
            ...state.feature_flags,
            [flag_key]: value,
          },
        }));
      },

      // ======================================================================
      // SYSTEM CONFIG ACTIONS
      // ======================================================================

      load_system_config: (config: Partial<SystemConfig>) => {
        set((state) => ({
          system_config: {
            ...state.system_config,
            ...config,
          },
        }));
      },

      update_system_config: (config: Partial<SystemConfig>) => {
        set((state) => ({
          system_config: {
            ...state.system_config,
            ...config,
          },
        }));
      },

      // ======================================================================
      // QUOTE BUILDER ACTIONS
      // ======================================================================

      set_quote_step: (step: number) => {
        set((state) => ({
          quote_builder_state: {
            ...state.quote_builder_state,
            current_step: step,
          },
        }));
      },

      select_service: (service_id: string) => {
        set((state) => ({
          quote_builder_state: {
            ...state.quote_builder_state,
            selected_service_id: service_id,
          },
        }));
      },

      update_project_answer: (key: string, value: any) => {
        set((state) => ({
          quote_builder_state: {
            ...state.quote_builder_state,
            project_answers: {
              ...state.quote_builder_state.project_answers,
              [key]: value,
            },
          },
        }));
      },

      update_project_answers: (answers: Record<string, any>) => {
        set((state) => ({
          quote_builder_state: {
            ...state.quote_builder_state,
            project_answers: {
              ...state.quote_builder_state.project_answers,
              ...answers,
            },
          },
        }));
      },

      add_uploaded_file: (file: UploadedFile) => {
        set((state) => ({
          quote_builder_state: {
            ...state.quote_builder_state,
            uploaded_files: [...state.quote_builder_state.uploaded_files, file],
          },
        }));
      },

      remove_uploaded_file: (file_id: string) => {
        set((state) => ({
          quote_builder_state: {
            ...state.quote_builder_state,
            uploaded_files: state.quote_builder_state.uploaded_files.filter(
              (file) => file.id !== file_id
            ),
          },
        }));
      },

      update_uploaded_file: (file_id: string, updates: Partial<UploadedFile>) => {
        set((state) => ({
          quote_builder_state: {
            ...state.quote_builder_state,
            uploaded_files: state.quote_builder_state.uploaded_files.map((file) =>
              file.id === file_id ? { ...file, ...updates } : file
            ),
          },
        }));
      },

      select_tier: (tier_id: string) => {
        set((state) => ({
          quote_builder_state: {
            ...state.quote_builder_state,
            selected_tier_id: tier_id,
          },
        }));
      },

      set_estimate_range: (range: EstimateRange | null) => {
        set((state) => ({
          quote_builder_state: {
            ...state.quote_builder_state,
            estimate_range: range,
          },
        }));
      },

      set_draft_saved: (is_saved: boolean) => {
        set((state) => ({
          quote_builder_state: {
            ...state.quote_builder_state,
            is_draft_saved: is_saved,
          },
        }));
      },

      set_draft_quote_id: (quote_id: string | null) => {
        set((state) => ({
          quote_builder_state: {
            ...state.quote_builder_state,
            draft_quote_id: quote_id,
          },
        }));
      },

      reset_quote_builder: () => {
        set((state) => ({
          quote_builder_state: {
            current_step: 1,
            selected_service_id: null,
            project_answers: {},
            uploaded_files: [],
            selected_tier_id: null,
            estimate_range: null,
            is_draft_saved: false,
            draft_quote_id: null,
          },
        }));
      },

      load_draft_quote: (draft_data: Partial<QuoteBuilderState>) => {
        set((state) => ({
          quote_builder_state: {
            ...state.quote_builder_state,
            ...draft_data,
          },
        }));
      },

      // ======================================================================
      // BOOKING ACTIONS
      // ======================================================================

      set_selected_date: (date: string | null) => {
        set((state) => ({
          booking_state: {
            ...state.booking_state,
            selected_date: date,
          },
        }));
      },

      set_selected_time_slot: (time_slot: string | null) => {
        set((state) => ({
          booking_state: {
            ...state.booking_state,
            selected_time_slot: time_slot,
          },
        }));
      },

      set_emergency_booking: (is_emergency: boolean, urgent_fee_amount: number = 0) => {
        set((state) => ({
          booking_state: {
            ...state.booking_state,
            is_emergency_booking: is_emergency,
            urgent_fee_amount: urgent_fee_amount,
          },
        }));
      },

      set_booking_step: (step: string) => {
        set((state) => ({
          booking_state: {
            ...state.booking_state,
            booking_step: step,
          },
        }));
      },

      reset_booking_state: () => {
        set({
          booking_state: {
            selected_date: null,
            selected_time_slot: null,
            is_emergency_booking: false,
            urgent_fee_amount: 0,
            booking_step: 'date_selection',
          },
        });
      },
    }),
    {
      name: 'sultanstamp-app-storage',
      // ======================================================================
      // PERSISTENCE CONFIGURATION
      // ======================================================================
      partialize: (state) => ({
        // Persist authentication state
        authentication_state: {
          current_user: state.authentication_state.current_user,
          auth_token: state.authentication_state.auth_token,
          authentication_status: {
            is_authenticated: state.authentication_state.authentication_status.is_authenticated,
            is_loading: false, // Never persist loading state
          },
          error_message: null, // Never persist errors
        },
        // Persist feature flags
        feature_flags: state.feature_flags,
        // Persist system config
        system_config: state.system_config,
        // Persist quote builder state (for draft recovery)
        quote_builder_state: state.quote_builder_state,
        // DO NOT persist notification_state (transient data)
        // DO NOT persist booking_state (session-only data)
      }),
    }
  )
);

// ============================================================================
// EXPORTED TYPES FOR COMPONENTS
// ============================================================================

export type {
  AppState,
  AuthenticationState,
  NotificationState,
  FeatureFlags,
  SystemConfig,
  QuoteBuilderState,
  BookingState,
  User,
  CustomerProfile,
  StaffProfile,
  Notification,
  UploadedFile,
  EstimateRange,
  CompanyInfo,
};