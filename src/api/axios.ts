import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// Function to get the API URL based on current subdomain or path
const getApiUrl = (): string => {
  if (typeof window === 'undefined') {
    return 'https://api.echodesk.ge'; // fallback for SSR
  }
  
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;
  
  // Check if we're on a subdomain of echodesk.ge
  if (hostname.endsWith('.echodesk.ge') && hostname !== 'echodesk.ge') {
    const subdomain = hostname.split('.')[0];
    const apiUrl = `https://${subdomain}.api.echodesk.ge`;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔗 Subdomain detected: ${subdomain} -> API URL: ${apiUrl}`);
    }
    
    return apiUrl;
  }
  
  // Check for path-based tenant routing (e.g., localhost:3000/amanati-tenant)
  if (hostname.includes('localhost')) {
    const pathMatch = pathname.match(/^\/([^\/]+)-tenant\/?/);
    if (pathMatch) {
      const tenantName = pathMatch[1];
      const apiUrl = `https://${tenantName}.api.echodesk.ge`;
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`🏠 Path-based tenant detected: ${tenantName} -> API URL: ${apiUrl}`);
      }
      
      return apiUrl;
    }
    
    // For localhost without tenant path, use main API
    const devApiUrl = 'https://api.echodesk.ge';
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`🏠 Development mode (no tenant) -> API URL: ${devApiUrl}`);
    }
    
    return devApiUrl;
  }
  
  // For localhost development with subdomain (e.g., amanati.localhost:3000)
  if (hostname.includes('localhost') && hostname !== 'localhost') {
    const parts = hostname.split('.');
    if (parts.length > 1 && parts[0] !== 'localhost') {
      const subdomain = parts[0];
      const apiUrl = `https://${subdomain}.api.echodesk.ge`;
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔗 Localhost subdomain detected: ${subdomain} -> API URL: ${apiUrl}`);
      }
      
      return apiUrl;
    }
  }
  
  // Default fallback
  const fallbackUrl = 'https://api.echodesk.ge';
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`⚠️  Fallback mode -> API URL: ${fallbackUrl}`);
  }
  
  return fallbackUrl;
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

      // Log API calls in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`🌐 API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
      }

      const token = typeof window !== 'undefined' ? localStorage.getItem('echodesk_auth_token') : null;
      if (token && config.headers) {
        config.headers.Authorization = `Token ${token}`;
      }
      
      // Add origin header for CORS
      if (typeof window !== 'undefined' && config.headers) {
        config.headers.Origin = window.location.origin;
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
          localStorage.removeItem('echodesk_auth_token');
          localStorage.removeItem('echodesk_user_data');
          localStorage.removeItem('echodesk_tenant_data');
          window.location.href = '/';
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
