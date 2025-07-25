import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { secret, tenant_id, schema_name, domain_url } = body;

    // Verify the revalidation secret
    const expectedSecret = process.env.REVALIDATION_SECRET;
    if (!expectedSecret || secret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Invalid secret' },
        { status: 401 }
      );
    }

    // Revalidate tenant-related data
    revalidateTag('tenants');
    revalidateTag(`tenant-${tenant_id}`);
    revalidateTag(`tenant-${schema_name}`);
    
    // Revalidate paths
    revalidatePath('/');
    revalidatePath('/api/tenants');
    
    console.log(`Cache revalidated for tenant: ${schema_name} (${domain_url})`);

    return NextResponse.json({
      success: true,
      message: 'Cache revalidated successfully',
      tenant: {
        id: tenant_id,
        schema_name,
        domain_url
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Revalidation error:', error);
    return NextResponse.json(
      { error: 'Revalidation failed' },
      { status: 500 }
    );
  }
}
