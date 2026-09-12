import { supabase } from '@/lib/supabaseClient';
import { NextRequest, NextResponse } from 'next/server';



export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const regno = searchParams.get('regno');

    if (!regno) {
      return NextResponse.json({ error: 'Registration number is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('regno', regno)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      avatar_url: data.avatar_url
    });

  } catch (error) {
    console.error('Error in get-profile API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}