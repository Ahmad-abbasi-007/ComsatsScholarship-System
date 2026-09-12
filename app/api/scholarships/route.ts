import { supabase } from '@/lib/supabaseClient';
import { NextRequest, NextResponse } from 'next/server';



export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const forStudent = searchParams.get('forStudent') === 'true';
    const id = searchParams.get('id');

    // If we have an ID, get single scholarship
    if (id) {
      const { data, error } = await supabase
        .from('scholarships')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching scholarship:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ scholarship: data });
    }

    // Otherwise get all scholarships
    let query = supabase.from('scholarships').select('*');

    if (forStudent) {
      query = query.eq('status', 'active');
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching scholarships:', error);
      return NextResponse.json({ error: 'Failed to fetch scholarships' }, { status: 500 });
    }

    return NextResponse.json({ scholarships: data });
  } catch (error) {
    console.error('Error in scholarships API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { 
      title, 
      description, 
      deadline, 
      status = 'active',
      student_types = ['undergraduate'], 
      number_of_awards = 0,
      scholarship_mode = 'single',
      tiers = [],
      form_sections = [],
      budget_allocated = 0,
      award_amount = 0,
      budget_status = 'pending'
    } = await request.json();

    if (!title || !description || !deadline) {
      return NextResponse.json(
        { error: 'Title, description, and deadline are required' },
        { status: 400 }
      );
    }

    const deadlineDate = new Date(deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (deadlineDate < today) {
      return NextResponse.json(
        { error: 'Deadline must be in the future' },
        { status: 400 }
      );
    }

    if (!Array.isArray(student_types) || student_types.length === 0) {
      return NextResponse.json(
        { error: 'At least one student type must be selected' },
        { status: 400 }
      );
    }

    if (scholarship_mode === 'single' && (!number_of_awards || number_of_awards <= 0)) {
      return NextResponse.json(
        { error: 'Number of awards is required for single scholarship mode' },
        { status: 400 }
      );
    }

    // Single mode: Award amount required
    if (scholarship_mode === 'single' && (!award_amount || award_amount <= 0)) {
      return NextResponse.json(
        { error: 'Award amount per student is required for single scholarship mode' },
        { status: 400 }
      );
    }

    if (scholarship_mode === 'tiered' && tiers.length === 0) {
      return NextResponse.json(
        { error: 'At least one tier is required for tiered scholarship mode' },
        { status: 400 }
      );
    }

    // Tiered mode: Check if all tiers have numeric amount
    if (scholarship_mode === 'tiered') {
      const missingAmount = tiers.some((t: any) => !t.award_amount_numeric || t.award_amount_numeric <= 0);
      if (missingAmount) {
        return NextResponse.json(
          { error: 'All tiers must have a numeric award amount' },
          { status: 400 }
        );
      }
    }

    const scholarshipData = {
      title: title.trim(),
      description: description.trim(),
      deadline,
      status,
      student_types, 
      form_template: 'custom',
      form_sections: form_sections,
      number_of_awards: scholarship_mode === 'single' ? number_of_awards : 0,
      scholarship_mode: scholarship_mode,
      created_by: null,
      budget_allocated: budget_allocated,
      budget_required: 0,
      budget_status: budget_status
    };

    const { data, error } = await supabase
      .from('scholarships')
      .insert([scholarshipData])
      .select()
      .single();

    if (error) {
      console.error('Database error creating scholarship:', error);
      return NextResponse.json({ 
        error: `Failed to create scholarship: ${error.message}` 
      }, { status: 500 });
    }

    // Save tiers for tiered mode
    if (scholarship_mode === 'tiered' && tiers && tiers.length > 0) {
      const tierData = tiers.map((tier: any, index: number) => ({
        scholarship_id: data.id,
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
        console.error('Error saving scholarship tiers:', tierError);
      }
    }

    // ========== SEND NOTIFICATIONS TO STUDENTS ==========
    try {
      console.log('📢 Starting notification process for new scholarship...');
      
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('regno');

      if (studentsError) {
        console.error('❌ Error fetching students:', studentsError);
      } else {
        console.log(`📢 Found ${students?.length || 0} students`);
        
        if (students && students.length > 0) {
          const notifications = students.map((student: any) => ({
            user_id: student.regno,
            user_type: 'student',
            type: 'new_scholarship',
            title: 'New Scholarship Available',
            message: `"${data.title}" is now open for applications. Apply before ${new Date(deadline).toLocaleDateString()}!`,
            data: {
              scholarshipId: data.id,
              scholarshipTitle: data.title,
              deadline: deadline,
              scholarshipMode: scholarship_mode
            },
            is_read: false,
            created_at: new Date().toISOString()
          }));

          console.log(`📢 Creating ${notifications.length} notifications`);
          
          const { error: notifError } = await supabase
            .from('notifications')
            .insert(notifications);

          if (notifError) {
            console.error('❌ Error inserting notifications:', notifError);
          } else {
            console.log(`✅ Successfully sent ${notifications.length} notifications to students`);
          }
        } else {
          console.log('📢 No students found in database, skipping notifications');
        }
      }
    } catch (notifError) {
      console.error('❌ Notification error:', notifError);
    }

    return NextResponse.json({ 
      scholarship: data, 
      message: 'Scholarship created successfully',
      mode: scholarship_mode
    }, { status: 201 });

  } catch (error) {
    console.error('Unexpected error in scholarships POST API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { 
      id,
      title, 
      description, 
      deadline, 
      status,
      student_types,
      scoring_criteria,
      number_of_awards,
      scholarship_mode,
      tiers,
      form_sections,
      budget_allocated,
      budget_status
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Scholarship ID is required' }, { status: 400 });
    }

    // Build update data
    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (deadline !== undefined) updateData.deadline = deadline;
    if (status !== undefined) updateData.status = status;
    if (student_types !== undefined) updateData.student_types = student_types;
    if (scoring_criteria !== undefined) updateData.scoring_criteria = scoring_criteria;
    if (number_of_awards !== undefined) updateData.number_of_awards = number_of_awards;
    if (scholarship_mode !== undefined) updateData.scholarship_mode = scholarship_mode;
    if (budget_allocated !== undefined) updateData.budget_allocated = budget_allocated;
    if (budget_status !== undefined) updateData.budget_status = budget_status;
    
    // Always save form_sections
    updateData.form_sections = form_sections || [];

    const { data, error } = await supabase
      .from('scholarships')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Database error updating scholarship:', error);
      return NextResponse.json({ 
        error: `Failed to update scholarship: ${error.message}` 
      }, { status: 500 });
    }

    // Update tiers for tiered mode
    if (scholarship_mode === 'tiered' && tiers && tiers.length > 0) {
      await supabase
        .from('scholarship_tiers')
        .delete()
        .eq('scholarship_id', id);

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

      await supabase
        .from('scholarship_tiers')
        .insert(tierData);
    } else if (scholarship_mode === 'single') {
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

    return NextResponse.json({ 
      scholarship: updatedScholarship, 
      message: 'Scholarship updated successfully' 
    });

  } catch (error) {
    console.error('Unexpected error in scholarships PUT API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}