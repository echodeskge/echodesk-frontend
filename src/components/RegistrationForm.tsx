'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PricingModel } from '../types/package';
import { packagesList, registerTenant } from '../api/generated/api';
import type { PackageList, TenantRegistration } from '../api/generated/interfaces';

interface RegistrationFormData {
  company_name: string;
  domain: string;
  description: string;
  package_id: number;
  pricing_model: PricingModel;
  agent_count: number;
  admin_email: string;
  admin_password: string;
  admin_first_name: string;
  admin_last_name: string;
  preferred_language: string;
}

export default function RegistrationForm() {
  const [formData, setFormData] = useState<RegistrationFormData>({
    company_name: '',
    domain: '',
    description: '',
    package_id: 0,
    pricing_model: 'agent' as PricingModel,
    agent_count: 1,
    admin_email: '',
    admin_password: '',
    admin_first_name: '',
    admin_last_name: '',
    preferred_language: 'en'
  });

  const [packages, setPackages] = useState<PackageList[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PackageList | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [step, setStep] = useState(1); // 1: Package Selection, 2: Company Info, 3: Admin Details
  const [pricingModel, setPricingModel] = useState<PricingModel>('agent');

  // Load packages on component mount
  useEffect(() => {
    loadPackages();
  }, []);

  // Update domain when company name changes
  useEffect(() => {
    if (formData.company_name) {
      const generatedDomain = formData.company_name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      
      setFormData(prev => ({
        ...prev,
        domain: generatedDomain
      }));
    }
  }, [formData.company_name]);

  const loadPackages = async () => {
    try {
      setLoading(true);
      const data = await packagesList();
      setPackages(data.results || []);
    } catch (error) {
      console.error('Failed to load packages:', error);
      setError('Failed to load packages. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getPackagesByModel = (model: PricingModel) => {
    return packages
      .filter(pkg => String(pkg.pricing_model) === model);
  };

  const handlePackageSelect = (packageItem: PackageList) => {
    setSelectedPackage(packageItem);
    const pricingModelValue = String(packageItem.pricing_model) as PricingModel;
    setFormData(prev => ({
      ...prev,
      package_id: packageItem.id,
      pricing_model: pricingModelValue
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const data = await registerTenant(formData as unknown as TenantRegistration);

      setSuccess(`
        🎉 Success! Your tenant has been created successfully!
        Your URL: ${data.frontend_url}
        Admin Login: ${formData.admin_email}
        Dashboard Language: ${formData.preferred_language.toUpperCase()}
      `);
      
      // Redirect after 3 seconds
      setTimeout(() => {
        if (data.frontend_url) {
          window.open(data.frontend_url, '_blank');
        }
      }, 3000);
    } catch (error: any) {
      console.error('Registration error:', error);
      const errorMessage = error.response?.data?.error || 
        error.response?.data?.domain?.[0] || 
        error.response?.data?.admin_password?.[0] || 
        error.message ||
        'Registration failed. Please check your connection and try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #2A2B7C 0%, #1a1b5e 100%)',
      padding: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
        padding: '40px',
        width: '100%',
        maxWidth: step === 1 ? '900px' : '500px',
        transition: 'max-width 0.3s ease'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ 
            color: '#333',
            fontSize: '28px',
            fontWeight: '700',
            fontFamily: 'Uni Neue, -apple-system, BlinkMacSystemFont, sans-serif'
          }}>
            <span style={{ color: 'white' }}>Echo</span>
            <span style={{ color: '#2FB282' }}>Desk</span>
          </h1>
          <p style={{ color: '#666', marginTop: '5px' }}>Create Your Multi-Tenant CRM</p>
          
          {/* Progress indicator */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px', gap: '10px' }}>
            {[1, 2, 3].map(num => (
              <div key={num} style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                background: step >= num ? '#2FB282' : '#e1e5e9',
                color: step >= num ? 'white' : '#666',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                {num}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px', gap: '20px', fontSize: '12px', color: '#666' }}>
            <span>Package</span>
            <span>Company</span>
            <span>Admin</span>
          </div>
        </div>

        {error && (
          <div style={{
            background: '#fff5f5',
            border: '1px solid #fed7d7',
            color: '#c53030',
            padding: '10px',
            borderRadius: '6px',
            marginBottom: '20px'
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            background: '#f0fff4',
            border: '1px solid #9ae6b4',
            color: '#2f855a',
            padding: '10px',
            borderRadius: '6px',
            marginBottom: '20px',
            whiteSpace: 'pre-line'
          }}>
            {success}
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{
              border: '3px solid #f3f3f3',
              borderTop: '3px solid #2FB282',
              borderRadius: '50%',
              width: '30px',
              height: '30px',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 10px'
            }} />
            <p>Creating your tenant...</p>
          </div>
        )}

        {!loading && !success && (
          <form onSubmit={handleSubmit}>
            {/* Step 1: Package Selection */}
            {step === 1 && (
              <div>
                <h2 style={{ marginBottom: '20px', color: '#333' }}>Choose Your Package</h2>
                
                {/* Pricing Model Toggle */}
                <div style={{ marginBottom: '30px', textAlign: 'center' }}>
                  <div style={{
                    display: 'inline-flex',
                    background: '#f8f9fa',
                    borderRadius: '8px',
                    padding: '4px',
                    border: '1px solid #e1e5e9'
                  }}>
                    <button
                      type="button"
                      onClick={() => setPricingModel('agent')}
                      style={{
                        padding: '8px 16px',
                        border: 'none',
                        borderRadius: '6px',
                        background: pricingModel === 'agent' ? '#2FB282' : 'transparent',
                        color: pricingModel === 'agent' ? 'white' : '#666',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      Agent-based Pricing
                    </button>
                    <button
                      type="button"
                      onClick={() => setPricingModel('crm')}
                      style={{
                        padding: '8px 16px',
                        border: 'none',
                        borderRadius: '6px',
                        background: pricingModel === 'crm' ? '#2FB282' : 'transparent',
                        color: pricingModel === 'crm' ? 'white' : '#666',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      CRM-based Pricing
                    </button>
                  </div>
                  
                  <p style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
                    {pricingModel === 'agent' 
                      ? 'Pay per agent - perfect for teams with dedicated support staff'
                      : 'Fixed monthly fee - ideal for larger organizations with many users'
                    }
                  </p>
                </div>

                {/* Package Cards */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '20px',
                  marginBottom: '30px'
                }}>
                  {getPackagesByModel(pricingModel).map(pkg => (
                    <div
                      key={pkg.id}
                      onClick={() => handlePackageSelect(pkg)}
                      style={{
                        border: selectedPackage?.id === pkg.id ? '2px solid #2FB282' : '1px solid #e1e5e9',
                        borderRadius: '8px',
                        padding: '20px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        position: 'relative',
                        background: pkg.is_highlighted ? '#f8fff9' : 'white'
                      }}
                    >
                      {pkg.is_highlighted && (
                        <div style={{
                          position: 'absolute',
                          top: '-1px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          background: '#2FB282',
                          color: 'white',
                          padding: '4px 12px',
                          borderRadius: '0 0 6px 6px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          RECOMMENDED
                        </div>
                      )}
                      
                      <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>{pkg.display_name}</h3>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: '#2FB282', marginBottom: '8px' }}>
                        {pkg.price_gel}₾
                        <span style={{ fontSize: '14px', fontWeight: '400', color: '#666' }}>
                          {String(pkg.pricing_model) === 'agent' ? '/agent/month' : '/month'}
                        </span>
                      </div>
                      <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>{pkg.description}</p>
                      
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {(Array.isArray(pkg.features_list) 
                          ? pkg.features_list 
                          : JSON.parse(pkg.features_list || '[]')
                        ).slice(0, 5).map((feature: string, index: number) => (
                          <li key={index} style={{
                            fontSize: '12px',
                            color: '#555',
                            marginBottom: '4px',
                            paddingLeft: '16px',
                            position: 'relative'
                          }}>
                            <span style={{
                              position: 'absolute',
                              left: '0',
                              color: '#2FB282',
                              fontWeight: '600'
                            }}>✓</span>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                {selectedPackage && (
                  <div style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={nextStep}
                      style={{
                        background: '#2FB282',
                        color: 'white',
                        padding: '12px 24px',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Continue with {selectedPackage.display_name}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Company Information */}
            {step === 2 && (
              <div>
                <h2 style={{ marginBottom: '20px', color: '#333' }}>Company Information</h2>
                
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#333', fontWeight: '500' }}>
                    Company Name *
                  </label>
                  <input
                    type="text"
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleInputChange}
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e1e5e9',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#333', fontWeight: '500' }}>
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Brief description of your organization"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e1e5e9',
                      borderRadius: '8px',
                      fontSize: '14px',
                      resize: 'vertical',
                      height: '80px'
                    }}
                  />
                </div>

                {formData.pricing_model === 'agent' && (
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', color: '#333', fontWeight: '500' }}>
                      Number of Agents *
                    </label>
                    <input
                      type="number"
                      name="agent_count"
                      value={formData.agent_count}
                      onChange={handleInputChange}
                      min="1"
                      required
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '2px solid #e1e5e9',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                    />
                    <small style={{ color: '#666', fontSize: '12px' }}>
                      Monthly cost: {selectedPackage?.price_gel || 0} × {formData.agent_count} = {(parseFloat(selectedPackage?.price_gel || '0')) * formData.agent_count}₾
                    </small>
                  </div>
                )}

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#333', fontWeight: '500' }}>
                    Your Subdomain
                  </label>
                  <div style={{
                    background: '#f8f9fa',
                    padding: '10px',
                    borderRadius: '6px',
                    fontFamily: 'Monaco, Menlo, monospace',
                    fontSize: '14px',
                    color: '#495057'
                  }}>
                    {formData.domain || 'your-company'}.echodesk.ge
                  </div>
                  <small style={{ color: '#666', fontSize: '12px' }}>Auto-generated based on your company name</small>
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between' }}>
                  <button
                    type="button"
                    onClick={prevStep}
                    style={{
                      background: '#6c757d',
                      color: 'white',
                      padding: '12px 24px',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={nextStep}
                    disabled={!formData.company_name}
                    style={{
                      background: formData.company_name ? '#2FB282' : '#ccc',
                      color: 'white',
                      padding: '12px 24px',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: formData.company_name ? 'pointer' : 'not-allowed'
                    }}
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Admin Details */}
            {step === 3 && (
              <div>
                <h2 style={{ marginBottom: '20px', color: '#333' }}>Administrator Account</h2>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', color: '#333', fontWeight: '500' }}>
                      First Name *
                    </label>
                    <input
                      type="text"
                      name="admin_first_name"
                      value={formData.admin_first_name}
                      onChange={handleInputChange}
                      required
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '2px solid #e1e5e9',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', color: '#333', fontWeight: '500' }}>
                      Last Name *
                    </label>
                    <input
                      type="text"
                      name="admin_last_name"
                      value={formData.admin_last_name}
                      onChange={handleInputChange}
                      required
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '2px solid #e1e5e9',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#333', fontWeight: '500' }}>
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="admin_email"
                    value={formData.admin_email}
                    onChange={handleInputChange}
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e1e5e9',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#333', fontWeight: '500' }}>
                    Password *
                  </label>
                  <input
                    type="password"
                    name="admin_password"
                    value={formData.admin_password}
                    onChange={handleInputChange}
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e1e5e9',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                  <small style={{ color: '#666', fontSize: '12px' }}>
                    Must be at least 8 characters with uppercase, lowercase, and numbers
                  </small>
                </div>

                <div style={{ marginBottom: '30px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#333', fontWeight: '500' }}>
                    Dashboard Language *
                  </label>
                  <select
                    name="preferred_language"
                    value={formData.preferred_language}
                    onChange={handleInputChange}
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e1e5e9',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  >
                    <option value="en">🇺🇸 English</option>
                    <option value="ru">🇷🇺 Russian</option>
                    <option value="ka">🇬🇪 Georgian</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between' }}>
                  <button
                    type="button"
                    onClick={prevStep}
                    style={{
                      background: '#6c757d',
                      color: 'white',
                      padding: '12px 24px',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={!formData.admin_email || !formData.admin_password || !formData.admin_first_name || !formData.admin_last_name}
                    style={{
                      background: (formData.admin_email && formData.admin_password && formData.admin_first_name && formData.admin_last_name) ? '#2FB282' : '#ccc',
                      color: 'white',
                      padding: '12px 24px',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: (formData.admin_email && formData.admin_password && formData.admin_first_name && formData.admin_last_name) ? 'pointer' : 'not-allowed',
                      fontSize: '16px',
                      fontWeight: '600'
                    }}
                  >
                    Create My Tenant
                  </button>
                </div>
              </div>
            )}
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <Link href="/" style={{ color: '#2FB282', textDecoration: 'none' }}>
            ← Back to Home
          </Link>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
