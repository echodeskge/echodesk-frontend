import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// Domain configuration from environment
const API_DOMAIN = process.env.NEXT_PUBLIC_API_DOMAIN || 'api.echodesk.ge';
const MAIN_DOMAIN = process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'echodesk.ge';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || `https://${API_DOMAIN}`;

// Function to get the API URL based on current subdomain
const getApiUrl = (): string => {
  if (typeof window === 'undefined') {
    return API_BASE_URL; // fallback for SSR
  }

  const hostname = window.location.hostname;

  // On localhost, use dev_tenant from localStorage or default to "groot"
  if (hostname.includes('localhost')) {
    const devTenant = localStorage.getItem('dev_tenant') || 'groot';
    return `https://${devTenant}.${API_DOMAIN}`;
  }

  // Check if we're on a subdomain of the main domain (production)
  if (hostname.endsWith(`.${MAIN_DOMAIN}`) && hostname !== MAIN_DOMAIN) {
    const subdomain = hostname.split('.')[0];
    return `https://${subdomain}.${API_DOMAIN}`;
  }

  // Default fallback to main API
  return API_BASE_URL;
};

// Create axios instance with base configuration
const createAxiosInstance = (baseURL?: string): AxiosInstance => {
  const instance = axios.create({
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });

  // Request interceptor to add auth token and dynamic base URL
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      // Set dynamic base URL if not provided
      if (!config.baseURL && !baseURL) {
        config.baseURL = getApiUrl();
      } else if (baseURL) {
        config.baseURL = baseURL;
      }

      const token = typeof window !== 'undefined' ? localStorage.getItem('echodesk_auth_token') : null;
      if (token && config.headers) {
        config.headers.Authorization = `Token ${token}`;
      }

      // Add origin header for CORS
      if (typeof window !== 'undefined' && config.headers) {
        config.headers.Origin = window.location.origin;
      }

      // Remove default Content-Type for FormData requests
      // axios will automatically set the correct Content-Type with boundary
      if (config.data instanceof FormData && config.headers) {
        delete config.headers['Content-Type'];
      }

      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor for error handling
  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      return response;
    },
    (error) => {
      if (error.response?.status === 401) {
        // Handle unauthorized access
        if (typeof window !== 'undefined') {
          // Check if we should redirect on 401
          // Skip redirect if:
          // 1. Already on homepage
          // 2. Already redirecting (prevent loops)
          // 3. This is a specific endpoint that might legitimately return 401 for permissions
          const pathname = window.location.pathname;
          const isAlreadyRedirecting = sessionStorage.getItem('auth_redirect_in_progress');

          // Only clear auth and redirect if this looks like a real auth failure
          // (e.g., token expired), not a permission issue on a specific endpoint
          const isAuthEndpoint = error.config?.url?.includes('/auth/') ||
                                 error.config?.url?.includes('/users/me') ||
                                 error.config?.url?.includes('/profile');

          if (pathname !== '/' && !isAlreadyRedirecting) {
            // Mark that we're redirecting to prevent loops
            sessionStorage.setItem('auth_redirect_in_progress', 'true');

            // Clear auth data
            localStorage.removeItem('echodesk_auth_token');
            localStorage.removeItem('echodesk_user_data');
            localStorage.removeItem('echodesk_tenant_data');

            // Clear the redirect flag after a short delay (in case redirect fails)
            setTimeout(() => {
              sessionStorage.removeItem('auth_redirect_in_progress');
            }, 5000);

            window.location.href = '/';
          }
        }
      }
      return Promise.reject(error);
    }
  );

  return instance;
};

// Default instance that dynamically detects subdomain
const axiosInstance = createAxiosInstance();

export default axiosInstance;
export { createAxiosInstance, getApiUrl };
