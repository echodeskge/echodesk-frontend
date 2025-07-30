# 🌐 EchoDesk Frontend - Multi-Tenant Next.js Application

A modern, multi-tenant frontend application built with Next.js 15.4.4, TypeScript, and React 19 for the EchoDesk CRM platform.

**Last Updated**: July 31, 2025 - Enhanced with comprehensive user management UI and improved tenant features.

## 🏗️ Architecture

### **Multi-Tenant Subdomain Structure**
- **Main Domain**: `echodesk.ge` - Landing page and tenant management
- **Tenant Subdomains**: `{tenant}.echodesk.ge` - Individual tenant dashboards
- **Backend API**: `{tenant}.api.echodesk.ge` - Tenant-specific Django API endpoints

### **Local Development**
- **Main**: `http://localhost:3000`
- **Demo Tenant**: `http://demo.localhost:3000`
- **Acme Tenant**: `http://acme.localhost:3000`

## 🚀 Quick Start

### **Prerequisites**
- Node.js 18+ 
- npm or yarn
- Django backend running on `http://localhost:8000`

### **1. Environment Setup**
```bash
# Copy environment variables
cp .env.local.example .env.local

# Edit with your configuration
vim .env.local
```

### **2. Development Setup**
```bash
# Install dependencies and configure local subdomains
npm run dev-setup

# Start development server
npm run dev
```

### **3. Access the Application**
- **Main Landing**: http://localhost:3000
- **Demo Tenant**: http://demo.localhost:3000 
- **Any Tenant**: http://{schema_name}.localhost:3000

## 📋 Environment Variables

### **Required Variables**
```bash
# API Configuration
NEXT_PUBLIC_API_BASE_URL=https://api.echodesk.ge
NEXT_PUBLIC_MAIN_DOMAIN=echodesk.ge
NEXT_PUBLIC_API_DOMAIN=api.echodesk.ge

# Development
NEXT_PUBLIC_DEV_API_URL=http://localhost:8000

# Webhook Communication
REVALIDATION_SECRET=your-revalidation-secret
```

## 🛠️ Development

### **Available Scripts**
```bash
npm run dev              # Start development server
npm run dev-setup        # Configure local development environment  
npm run dev-with-setup   # Setup + start development
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
npm run type-check       # Run TypeScript checking
npm run clean            # Clean build cache
```

### **Local Subdomain Testing**
The `dev-setup` script automatically configures your `/etc/hosts` file on macOS:
```
127.0.0.1 demo.localhost
127.0.0.1 acme.localhost  
127.0.0.1 test.localhost
```

## 🌐 Multi-Tenant Features

### **Automatic Tenant Detection**
- Extracts subdomain from hostname
- Fetches tenant configuration from Django backend
- Renders tenant-specific dashboard or landing page

### **Tenant Context**
```typescript
import { useTenant } from '@/contexts/TenantContext';

function MyComponent() {
  const { tenant, loading, error } = useTenant();
  
  if (tenant) {
    // Render tenant-specific content
    return <TenantDashboard tenant={tenant} />;
  }
  
  // Render landing page
  return <LandingPage />;
}
```

## 🔌 API Integration

### **Backend Endpoints**
- **Tenant Config**: `GET /api/tenant/config/?subdomain={name}`
- **All Tenants**: `GET /api/tenants/list/`
- **Language Update**: `PUT /api/tenant/language/update/`

### **Frontend API Routes**
- **GET /api/tenants** - List all tenants
- **POST /api/revalidate** - Cache revalidation webhook

## 🚢 Deployment

### **Vercel (Recommended)**
1. Connect your GitHub repository
2. Configure environment variables
3. Set custom domain: `echodesk.ge` with wildcard `*.echodesk.ge`
4. Deploy automatically on git push

### **Environment Variables for Production**
```bash
NEXT_PUBLIC_API_BASE_URL=https://api.echodesk.ge
NEXT_PUBLIC_MAIN_DOMAIN=echodesk.ge
NEXT_PUBLIC_API_DOMAIN=api.echodesk.ge
REVALIDATION_SECRET=your-production-secret
```

---

**🚀 Ready to build amazing multi-tenant experiences!**
# echodesk-frontend
# echodesk-frontend
