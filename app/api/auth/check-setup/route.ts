import { createClient } from '@/lib/supabase/server';
import { checkCompanySetup } from '@/lib/supabase/company-setup';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    
    if (error || !data?.claims) {
      return NextResponse.json(
        { isSetupComplete: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const userId = data.claims.sub;
    const setupStatus = await checkCompanySetup(userId);

    return NextResponse.json({
      isSetupComplete: setupStatus.isSetupComplete,
      hasProfile: setupStatus.hasProfile,
      hasCompany: setupStatus.hasCompany,
    });
  } catch (error) {
    console.error('Error checking setup:', error);
    return NextResponse.json(
      { isSetupComplete: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

