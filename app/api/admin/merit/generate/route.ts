import { supabase } from '@/lib/supabaseClient';
import { NextRequest, NextResponse } from 'next/server';
import { sendSelectionEmailJS } from '@/lib/emailjs';



// Generate verification code for selected students
function generateVerificationCode(studentRegno: string, rank: number) {
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  const shortRegno = studentRegno.slice(-6);
  const timestamp = Date.now().toString(36).slice(-4);
  return `${shortRegno}-${random}-${timestamp}`;
}

export async function POST(request: NextRequest) {
  try {
    const { scholarshipId } = await request.json();

    console.log('🎯 [MERIT API] Generating merit list for scholarship:', scholarshipId);

    if (!scholarshipId) {
      return NextResponse.json(
        { error: 'Scholarship ID is required' },
        { status: 400 }
      );
    }

    // 1. Get scholarship with scoring criteria
    const { data: scholarship, error: scholarshipError } = await supabase
      .from('scholarships')
      .select('*')
      .eq('id', scholarshipId)
      .single();

    if (scholarshipError || !scholarship) {
      console.error('❌ [MERIT API] Scholarship not found:', scholarshipError);
      return NextResponse.json(
        { error: 'Scholarship not found' },
        { status: 404 }
      );
    }

    // Check if scoring criteria exists
    if (!scholarship.scoring_criteria || scholarship.scoring_criteria.length === 0) {
      return NextResponse.json(
        { error: 'Scoring criteria not set for this scholarship' },
        { status: 400 }
      );
    }

    // Skip number_of_awards check for tiered mode
    if (scholarship.scholarship_mode !== 'tiered') {
      if (!scholarship.number_of_awards || scholarship.number_of_awards <= 0) {
        return NextResponse.json(
          { error: 'Number of awards not set for this scholarship' },
          { status: 400 }
        );
      }
    }

    // 2. Get all APPROVED applications for this scholarship
    const { data: applications, error: applicationsError } = await supabase
      .from('scholarship_applications')
      .select('*')
      .eq('scholarship_id', scholarshipId)
      .eq('status', 'approved');

    if (applicationsError) {
      console.error('❌ [MERIT API] Error fetching applications:', applicationsError);
      return NextResponse.json(
        { error: 'Failed to fetch applications: ' + applicationsError.message },
        { status: 500 }
      );
    }

    if (!applications || applications.length === 0) {
      return NextResponse.json(
        { error: 'No approved applications found for this scholarship' },
        { status: 400 }
      );
    }

    console.log(`📊 [MERIT API] Found ${applications.length} approved applications`);

    // Get tiers for tiered mode
    let scholarshipTiers = [];
    if (scholarship.scholarship_mode === 'tiered') {
      const { data: tierData } = await supabase
        .from('scholarship_tiers')
        .select('*')
        .eq('scholarship_id', scholarshipId)
        .order('min_score', { ascending: false });
      scholarshipTiers = tierData || [];

      if (scholarshipTiers.length === 0) {
        return NextResponse.json(
          { error: 'No tiers defined for this tiered scholarship' },
          { status: 400 }
        );
      }
    }

    const criteria = scholarship.scoring_criteria;
    const scoredApplications = [];

    // FIRST PASS: Calculate raw scores
    for (const app of applications) {
      const applicationData = app.application_data || {};
      let totalPercentageScore = 0;
      const breakdown: Record<string, any> = {};

      for (const criterion of criteria) {
        let fieldValue = 0;
        const rawValue = applicationData[criterion.fieldName];

        if (rawValue) {
          if (typeof rawValue === 'number') {
            fieldValue = rawValue;
          } else if (typeof rawValue === 'string') {
            const cleanedValue = rawValue.replace(/,/g, '');
            fieldValue = parseFloat(cleanedValue) || 0;
          }
        }

        let percentageValue = 0;
        const fieldNameLower = criterion.fieldName?.toLowerCase() || '';
        const fieldLabelLower = criterion.fieldLabel?.toLowerCase() || '';
        const isGPA = fieldNameLower.includes('gpa') ||
          fieldNameLower.includes('cgpa') ||
          fieldLabelLower.includes('gpa') ||
          fieldLabelLower.includes('cgpa') ||
          (fieldValue <= 4.33 && fieldValue > 0);

        if (isGPA) {
          percentageValue = (fieldValue / 4.0) * 100;
        } else {
          percentageValue = fieldValue;
        }

        const weightedScore = (percentageValue * criterion.weight) / 100;
        totalPercentageScore += weightedScore;

        breakdown[criterion.fieldName] = fieldValue;
      }

      scoredApplications.push({
        application_id: app.id,
        student_regno: app.student_regno,
        raw_score: totalPercentageScore,
        breakdown: breakdown,
        application_data: applicationData
      });
    }

    // Find max raw score and normalize to 0-100
    const maxRawScore = Math.max(...scoredApplications.map(app => app.raw_score));

    const normalizedApplications = scoredApplications.map(app => {
      let finalScore = 0;
      if (maxRawScore > 0) {
        finalScore = (app.raw_score / maxRawScore) * 100;
      }
      finalScore = Math.round(finalScore * 100) / 100;
      return {
        ...app,
        total_score: finalScore,
      };
    });

    // Sort by total score
    normalizedApplications.sort((a, b) => b.total_score - a.total_score);

    // Generate merit entries with tier support
    const meritEntries = normalizedApplications.map((app, index) => {
      let status = 'waitlist';
      let awardTier = null;
      let awardDescription = null;

      if (scholarship.scholarship_mode === 'tiered') {
        const matchedTier = scholarshipTiers.find(tier =>
          app.total_score >= tier.min_score && app.total_score <= tier.max_score
        );
        if (matchedTier) {
          status = 'selected';
          awardTier = matchedTier.tier_name;
          awardDescription = `${matchedTier.award_description} (${matchedTier.award_amount})`;
        } else {
          status = 'waitlist';
        }
      } else {
        // Single mode: top N selected
        if (index < scholarship.number_of_awards) {
          status = 'selected';
        }
      }

      let verificationCode = null;
      if (status === 'selected') {
        verificationCode = generateVerificationCode(app.student_regno, index + 1);
      }

      return {
        scholarship_id: scholarshipId,
        student_regno: app.student_regno,
        application_id: app.application_id,
        total_score: app.total_score,
        rank: index + 1,
        status: status,
        award_tier: awardTier,
        award_description: awardDescription,
        verification_code: verificationCode,
        score_breakdown: app.breakdown,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    });

    console.log(`📈 [MERIT API] Max raw score: ${maxRawScore}`);
    console.log(`📈 [MERIT API] Mode: ${scholarship.scholarship_mode}`);
    console.log(`📈 [MERIT API] Selected: ${meritEntries.filter(m => m.status === 'selected').length}`);

    // ========== BUDGET CALCULATION ==========
    let totalBudgetRequired = 0;
    const selectedEntries = meritEntries.filter(m => m.status === 'selected');

    if (scholarship.scholarship_mode === 'single') {
      // Single mode: number_of_awards × award_amount
      const awardAmount = scholarship.award_amount || scholarship.budget_allocated / scholarship.number_of_awards || 0;
      totalBudgetRequired = selectedEntries.length * awardAmount;
    } else if (scholarship.scholarship_mode === 'tiered') {
      // Tiered mode: sum of award_amount_numeric for each selected student's tier
      for (const entry of selectedEntries) {
        const matchedTier = scholarshipTiers.find(tier =>
          entry.total_score >= tier.min_score && entry.total_score <= tier.max_score
        );
        if (matchedTier) {
          totalBudgetRequired += matchedTier.award_amount_numeric || 0;
        }
      }
    }

    console.log(`💰 [MERIT API] Total Budget Required: ${totalBudgetRequired}`);

    // Delete old merit list
    const { error: deleteError } = await supabase
      .from('merit_lists')
      .delete()
      .eq('scholarship_id', scholarshipId);

    if (deleteError) {
      console.error('❌ [MERIT API] Error deleting old merit list:', deleteError);
    }

    // Insert new merit list
    const { error: insertError } = await supabase
      .from('merit_lists')
      .insert(meritEntries);

    if (insertError) {
      console.error('❌ [MERIT API] Error inserting merit list:', insertError);
      return NextResponse.json(
        { error: 'Failed to save merit list: ' + insertError.message },
        { status: 500 }
      );
    }

    // Update scholarship to mark merit list as generated and set budget data
    await supabase
      .from('scholarships')
      .update({
        merit_list_generated: true,
        budget_required: totalBudgetRequired,
        budget_status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', scholarshipId);

    console.log('✅ [MERIT API] Merit list generated successfully');

    // Send notifications
    try {
      const scholarshipTitle = scholarship.title;

      const { data: meritStudents, error: meritError } = await supabase
        .from('merit_lists')
        .select('student_regno, status, rank, total_score, award_tier, award_description')
        .eq('scholarship_id', scholarshipId);

      if (!meritError && meritStudents && meritStudents.length > 0) {
        const notifications = meritStudents.map((student: any) => ({
          user_id: student.student_regno,
          user_type: 'student',
          type: 'merit_generated',
          title: student.status === 'selected' ? 'Congratulations! You are Selected' : '📋 Merit List Published',
          message: student.status === 'selected'
            ? `You have been selected for "${scholarshipTitle}"! ${student.award_tier ? `Awarded: ${student.award_tier} - ${student.award_description}` : `Score: ${student.total_score}/100`}`
            : `Merit list for "${scholarshipTitle}" has been published.`,
          data: {
            scholarshipId: scholarshipId,
            scholarshipTitle: scholarshipTitle,
            status: student.status,
            rank: student.rank,
            award_tier: student.award_tier,
            award_description: student.award_description
          },
          is_read: false,
          created_at: new Date().toISOString()
        }));

        await supabase.from('notifications').insert(notifications);
        console.log(`✅ Sent notifications to ${meritStudents.length} students`);
      }
    } catch (notifError) {
      console.error('❌ Notification error:', notifError);
    }

    // Send emails to selected students
    try {
      const selectedStudents = meritEntries.filter(entry => entry.status === 'selected');

      for (const student of selectedStudents) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('regno', student.student_regno)
          .single();

        const studentEmail = profile?.email;
        const studentName = profile?.full_name || student.student_regno;

        if (studentEmail) {
          await sendSelectionEmailJS({
            to_email: studentEmail,
            student_name: studentName,
            scholarship_title: scholarship.title,
            rank: student.rank,
          });
          console.log(`✅ Email sent to ${studentEmail}`);
        }
      }

      console.log(`📧 Completed sending ${selectedStudents.length} emails`);
    } catch (emailError) {
      console.error('❌ Email error:', emailError);
    }

    // Return summary with budget info
    return NextResponse.json({
      success: true,
      message: 'Merit list generated successfully',
      summary: {
        total_applications: applications.length,
        selected_count: selectedEntries.length,
        mode: scholarship.scholarship_mode,
        top_score: normalizedApplications[0]?.total_score || 0,
        total_budget_required: totalBudgetRequired,
        budget_status: 'pending'
      },
      merit_list: meritEntries.map(entry => ({
        rank: entry.rank,
        student_regno: entry.student_regno,
        total_score: entry.total_score,
        status: entry.status,
        award_tier: entry.award_tier,
        award_description: entry.award_description
      }))
    });

  } catch (error: unknown) {
    console.error('❌ [MERIT API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}