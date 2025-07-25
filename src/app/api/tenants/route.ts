import { NextRequest, NextResponse } from 'next/server';
import { tenantService } from '@/services/tenantService';

export async function GET(request: NextRequest) {
  try {
    const tenants = await tenantService.getAllTenants();
    
    return NextResponse.json({
      tenants,
      count: tenants.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching tenants:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tenants' },
      { status: 500 }
    );
  }
}
