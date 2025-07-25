# EchoDesk Frontend - DigitalOcean Deployment

Multi-tenant frontend for EchoDesk CRM system, deployed on DigitalOcean App Platform with wildcard subdomain support.

## 🏗️ Architecture

- **Frontend Platform**: DigitalOcean App Platform
- **Domain Structure**: `*.echodesk.ge` → All tenant subdomains
- **Backend API**: `*.api.echodesk.ge` → Tenant-specific API endpoints
- **Main Domain**: `echodesk.ge` → Public landing page and tenant management

## 🚀 DigitalOcean App Platform Configuration

### Domain Setup
- **Primary Domain**: `echodesk.ge`
- **Wildcard Alias**: `*.echodesk.ge`
- **Auto-SSL**: Enabled for all subdomains

### Environment Variables (Production)
```bash
NODE_ENV=production
NEXT_PUBLIC_MAIN_DOMAIN=echodesk.ge
NEXT_PUBLIC_API_DOMAIN=api.echodesk.ge
NEXT_PUBLIC_API_BASE_URL=https://api.echodesk.ge
NEXT_PUBLIC_DEFAULT_LANGUAGE=en
NEXT_PUBLIC_TENANT_CONFIG_ENDPOINT=/api/tenant/config
NEXT_PUBLIC_TENANTS_LIST_ENDPOINT=/api/tenants/list
NEXT_PUBLIC_PLATFORM=digitalocean
REVALIDATION_SECRET=${REVALIDATION_SECRET}
```

### Auto-Deployment
- **Repository**: `github.com/echodeskge/echodesk-frontend`
- **Branch**: `main`
- **Deploy on Push**: Enabled
- **Build Command**: `npm run build`
- **Run Command**: `npm start`

## 🌐 Multi-Tenant Routing

### How it Works
1. **Subdomain Detection**: Middleware extracts tenant subdomain from request
2. **Tenant Resolution**: API call to Django backend to get tenant configuration
3. **Dynamic Rendering**: Components adapt based on tenant settings and language
4. **API Routing**: All API calls go to tenant-specific endpoints

### Examples
- `amanati.echodesk.ge` → Amanati tenant frontend
- `demo.echodesk.ge` → Demo tenant frontend
- `echodesk.ge` → Main public site

### Backend API Integration
- `amanati.echodesk.ge` → `amanati.api.echodesk.ge/api/*`
- `demo.echodesk.ge` → `demo.api.echodesk.ge/api/*`

## 🛠️ Development

### Local Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Test with local Django backend
export NEXT_PUBLIC_DEV_API_URL=http://localhost:8000
npm run dev
```

### Testing Subdomains Locally
Add to `/etc/hosts`:
```
127.0.0.1 localhost
127.0.0.1 demo.localhost
127.0.0.1 amanati.localhost
```

Then access:
- `http://localhost:3000` → Main site
- `http://demo.localhost:3000` → Demo tenant
- `http://amanati.localhost:3000` → Amanati tenant

## 📊 Monitoring & Health Checks

### Health Check Endpoint
- **URL**: `/api/health`
- **Method**: GET
- **Response**: JSON with service status

### DigitalOcean Monitoring
- Deployment status alerts enabled
- Domain failure alerts enabled
- Automatic restarts on failure

## 🔄 Deployment Process

1. **Push to GitHub**: Code pushed to `main` branch
2. **Auto-Build**: DigitalOcean detects changes and starts build
3. **Environment Setup**: Production environment variables loaded
4. **Build Process**: `npm run build` with Next.js optimizations
5. **Deployment**: `npm start` with standalone output
6. **Health Check**: `/api/health` endpoint verified
7. **DNS Propagation**: Wildcard subdomain routing activated

## 🔗 Integration Points

### Django Backend Integration
- **Tenant Config API**: Fetches tenant settings and theming
- **Authentication**: Session/token-based auth with backend
- **Real-time Updates**: Webhook notifications for tenant changes

### Key API Endpoints
- `GET /api/tenant/config?subdomain=demo` → Get tenant configuration
- `GET /api/tenants/list` → List all active tenants
- `POST /api/revalidate` → Webhook for cache invalidation

## 🔒 Security

- **CORS**: Configured for `*.api.echodesk.ge` backend
- **SSL/TLS**: Automatic Let's Encrypt certificates
- **Headers**: Security headers for XSS/clickjacking protection
- **Environment**: Production secrets via DigitalOcean environment variables

## 📈 Performance Optimizations

- **Standalone Output**: Optimized for container deployment
- **Image Optimization**: Next.js Image component with wildcard domains
- **Code Splitting**: Automatic route-based code splitting
- **Compression**: Gzip compression enabled
- **Caching**: Static assets cached with appropriate headers

## 🚨 Troubleshooting

### Common Issues
1. **Subdomain not resolving**: Check DNS wildcard configuration
2. **API not accessible**: Verify CORS settings in Django backend
3. **Build failures**: Check environment variables and dependencies
4. **Health check failing**: Ensure `/api/health` endpoint is accessible

### Debug Commands
```bash
# Check deployment logs
doctl apps logs YOUR_APP_ID

# Monitor health endpoint
curl https://echodesk.ge/api/health

# Test tenant resolution
curl https://demo.echodesk.ge/api/health
```
