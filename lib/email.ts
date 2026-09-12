import { supabase } from '@/lib/supabaseClient';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendSelectionEmail({
  to,
  studentName,
  scholarshipTitle,
  rank
}: {
  to: string;
  studentName: string;
  scholarshipTitle: string;
  rank: number;
}) {
  try {
    const { data, error } = await resend.emails.send({
from: 'Scholarship Portal <onboarding@resend.dev>',
      to,
      subject: `🎉 Congratulations! Selected for ${scholarshipTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #4CAF50; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Congratulations!</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
            <p style="font-size: 16px;">Dear <strong>${studentName}</strong>,</p>
            
            <p style="font-size: 16px;">We are pleased to inform you that you have been selected for the <strong>${scholarshipTitle}</strong> with rank <strong>#${rank}</strong>!</p>
            
            <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <h2 style="color: #1976d2; margin-top: 0;">📋 Required Documents</h2>
              <p>Please bring the following <strong>ORIGINAL documents</strong> to the scholarship office for verification:</p>
              
              <ul style="list-style-type: none; padding: 0;">
                <li style="margin: 15px 0; padding: 10px; background: white; border-radius: 5px;">
                  <strong>1. CNIC / B-Form</strong> - Original and 2 photocopies
                </li>
                <li style="margin: 15px 0; padding: 10px; background: white; border-radius: 5px;">
                  <strong>2. Recent Photographs</strong> - 4 passport size photographs (blue background)
                </li>
                <li style="margin: 15px 0; padding: 10px; background: white; border-radius: 5px;">
                  <strong>3. Academic Records</strong> - All previous degrees/transcripts (original + copies)
                </li>
                <li style="margin: 15px 0; padding: 10px; background: white; border-radius: 5px;">
                  <strong>4. Admission Fee Receipt</strong> - Current semester fee challan
                </li>
                <li style="margin: 15px 0; padding: 10px; background: white; border-radius: 5px;">
                  <strong>5. Domicile Certificate</strong> - Original or attested copy
                </li>
                <li style="margin: 15px 0; padding: 10px; background: white; border-radius: 5px;">
                  <strong>6. Income Certificate</strong> - Father's/Guardian's income proof
                </li>
              </ul>
            </div>
            
            <div style="background: #fff3e0; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <h2 style="color: #f57c00; margin-top: 0;">📍 Submission Instructions</h2>
              <p><strong>📍 Location:</strong> Scholarship Office, Room 101, Admin Block</p>
              <p><strong>⏰ Deadline:</strong> Within 7 working days from today</p>
              <p><strong>🕒 Office Hours:</strong> Monday-Friday, 9:00 AM - 4:00 PM</p>
              <p><strong>📞 Contact:</strong> 051-1234567 (Scholarship Office)</p>
            </div>
            
            <div style="background: #fff; padding: 20px; border-radius: 8px; border: 2px solid #4CAF50; margin: 25px 0;">
              <h2 style="color: #2e7d32; margin-top: 0;">⚠️ Important Notes</h2>
              <ul>
                <li>Bring <strong>ALL</strong> documents in one visit</li>
                <li>Original documents will be returned after verification</li>
                <li>Scholarship will be forfeited if documents are not submitted by deadline</li>
                <li>Bring a file folder to keep your documents organized</li>
              </ul>
            </div>
            
            <p style="font-size: 16px;">Once your documents are verified, the scholarship amount will be credited to your university account within 2 weeks.</p>
            
            <p style="font-size: 16px;">Best regards,<br>
            <strong>Scholarship Committee</strong><br>
            COMSATS University</p>
            
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0 20px;">
            
            <p style="font-size: 12px; color: #999; text-align: center;">
              This is an automated message. For any queries, please visit the Scholarship Office.
            </p>
          </div>
        </body>
        </html>
      `
    });

    // Log to database
    const { createClient } = await import('@supabase/supabase-js');
    
    
    await supabase.from('email_logs').insert([{
      recipient: to,
      subject: `Selected for ${scholarshipTitle}`,
      status: error ? 'failed' : 'sent',
      error: error?.message
    }]);

    if (error) throw error;
    return { success: true };
    
  } catch (error) {
    console.error('Email error:', error);
    return { success: false, error };
  }
}