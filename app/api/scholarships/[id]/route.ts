import { supabase } from '@/lib/supabaseClient';
import { NextRequest, NextResponse } from 'next/server';



export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const { id } = params;

    console.log('🔍 [API] Fetching scholarship ID:', id);

    if (!id || id === 'undefined') {
      return NextResponse.json(
        { error: 'Invalid scholarship ID' },
        { status: 400 }
      );
    }

    // Fetch scholarship with form fields
    const { data: scholarship, error } = await supabase
      .from('scholarships')
      .select(`
        *,
        scholarship_form_fields (*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('❌ [API] Database error:', error);
      return NextResponse.json(
        { error: 'Database error: ' + error.message },
        { status: 500 }
      );
    }

    if (!scholarship) {
      return NextResponse.json(
        { error: 'Scholarship not found' },
        { status: 404 }
      );
    }
    
    // ✅ FIX: Fetch tiers for ALL scholarships (not just tiered)
    // Always try to fetch tiers
    const { data: tierData } = await supabase
      .from('scholarship_tiers')
      .select('*')
      .eq('scholarship_id', id)
      .order('min_score', { ascending: false });
    
    const tiers = tierData || [];
    
    console.log('📊 [API] Fetched tiers:', tiers.length);
    console.log('📊 [API] Scholarship mode:', scholarship.scholarship_mode);
    
    return NextResponse.json({ 
      success: true,
      scholarship: { 
        ...scholarship, 
        tiers: tiers  // Always include tiers array
      }
    });

  } catch (error: unknown) {
    console.error('❌ [API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const { id } = params;

    if (!id || id === 'undefined') {
      return NextResponse.json(
        { error: 'Invalid scholarship ID' },
        { status: 400 }
      );
    }

    // Delete form fields
    const { error: fieldsError } = await supabase
      .from('scholarship_form_fields')
      .delete()
      .eq('scholarship_id', id);

    if (fieldsError) {
      console.error('❌ [API] Error deleting form fields:', fieldsError);
    }

    // NEW: Delete tiers
    const { error: tiersError } = await supabase
      .from('scholarship_tiers')
      .delete()
      .eq('scholarship_id', id);

    if (tiersError) {
      console.error('❌ [API] Error deleting tiers:', tiersError);
    }

    // Delete the scholarship
    const { error } = await supabase
      .from('scholarships')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ [API] Database error:', error);
      return NextResponse.json(
        { error: 'Database error: ' + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Scholarship and related data deleted successfully'
    });

  } catch (error: unknown) {
    console.error('❌ [API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const { id } = params;
    const { 
      title, 
      description, 
      deadline, 
      status,
      student_types,
      form_template,
      custom_fields = [],
      scoring_criteria,
      number_of_awards,
      scholarship_mode,
      tiers,
      budget_allocated,
      budget_status,
      form_sections = []   // ← ADDED
    } = await request.json();

    console.log('✏️ [API] Updating scholarship:', id);
    console.log('📊 [API] Scoring criteria received:', scoring_criteria);
    console.log('📊 [API] Scholarship mode:', scholarship_mode);
    console.log('📊 [API] Tiers:', tiers?.length);

    if (!id || id === 'undefined') {
      return NextResponse.json(
        { error: 'Invalid scholarship ID' },
        { status: 400 }
      );
    }

    if (!title?.trim() || !description?.trim() || !deadline) {
      return NextResponse.json(
        { error: 'Title, description, and deadline are required' },
        { status: 400 }
      );
    }

    const updateData: any = {
      title,
      description,
      deadline,
      status,
      student_types,
      form_template,
      custom_fields: form_template === 'custom' ? custom_fields : [],
      scoring_criteria: scoring_criteria || [],
      number_of_awards: number_of_awards || 0,
      scholarship_mode: scholarship_mode || 'single',
      updated_at: new Date().toISOString(),
      budget_allocated: budget_allocated || 0,
      budget_status: budget_status || 'pending',
      form_sections: form_sections || []   // ← ADDED
    };

    const { data: scholarship, error } = await supabase
      .from('scholarships')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ [API] Database error:', error);
      return NextResponse.json(
        { error: 'Database error: ' + error.message },
        { status: 500 }
      );
    }

    if (!scholarship) {
      return NextResponse.json(
        { error: 'Scholarship not found' },
        { status: 404 }
      );
    }

    // Handle custom form fields
    if (form_template === 'custom' && custom_fields.length > 0) {
      await supabase
        .from('scholarship_form_fields')
        .delete()
        .eq('scholarship_id', id);

      const formFieldsData = custom_fields.map((field: any, index: number) => ({
        scholarship_id: id,
        field_type: field.type,
        field_label: field.label,
        field_name: field.name,
        placeholder: field.placeholder || '',
        is_required: field.required || false,
        field_order: index,
        validation_rules: field.validation || {},
        options: field.options || null
      }));

      const { error: fieldsError } = await supabase
        .from('scholarship_form_fields')
        .insert(formFieldsData);

      if (fieldsError) {
        console.error('❌ [API] Error saving custom fields:', fieldsError);
      }
    } else if (form_template !== 'custom') {
      await supabase
        .from('scholarship_form_fields')
        .delete()
        .eq('scholarship_id', id);
    }

    // NEW: Handle tiers for tiered mode
    if (scholarship_mode === 'tiered' && tiers && tiers.length > 0) {
      // Delete existing tiers
      await supabase
        .from('scholarship_tiers')
        .delete()
        .eq('scholarship_id', id);

      // Insert new tiers with numeric amount
      const tierData = tiers.map((tier: any, index: number) => ({
        scholarship_id: id,
        tier_name: tier.tier_name,
        min_score: tier.min_score,
        max_score: tier.max_score,
        award_description: tier.award_description,
        award_amount: tier.award_amount,
        award_amount_numeric: tier.award_amount_numeric || 0,
        tier_order: index
      }));

      const { error: tierError } = await supabase
        .from('scholarship_tiers')
        .insert(tierData);

      if (tierError) {
        console.error('❌ [API] Error saving tiers:', tierError);
      }
    } else if (scholarship_mode === 'single') {
      // Delete tiers if switching to single mode
      await supabase
        .from('scholarship_tiers')
        .delete()
        .eq('scholarship_id', id);
    }

    // Return updated scholarship with tiers
    const { data: updatedScholarship } = await supabase
      .from('scholarships')
      .select('*')
      .eq('id', id)
      .single();

    console.log('✅ [API] Scholarship updated successfully');

    return NextResponse.json({
      success: true,
      scholarship: updatedScholarship,
      message: 'Scholarship updated successfully'
    });

  } catch (error: unknown) {
    console.error('❌ [API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}