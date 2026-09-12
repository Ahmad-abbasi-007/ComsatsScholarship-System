'use client';
import { supabase } from '@/lib/supabaseClient';
import { useState, useEffect } from 'react';
import { StudentProfileForm } from '@/components/student/StudentProfileForm';
import { StudentProfileView } from '@/components/student/StudentProfileView';



export default function ProfilePage() {
  const [profileComplete, setProfileComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);

useEffect(() => {
  const checkProfileStatus = async () => {
    try {
      console.log('📋 Checking profile status...');
      
      // Get registration number from localStorage FIRST
      const studentRegno = localStorage.getItem('studentRegno');
      console.log('🎫 Registration number from localStorage:', studentRegno);
      
      if (!studentRegno) {
        console.log('❌ No registration number found in localStorage');
        setProfileComplete(false);
        setProfileData(null);
        setLoading(false);
        return;
      }

      // Try to get session, but don't rely on it
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setUser(session.user);
      }
      
      // Get profile data by regno - this works even without session because RLS is disabled
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('regno', studentRegno)
        .single();
      
      console.log('📊 Profile data:', profile);
      console.log('❌ Profile error:', error);
      
      if (error) {
        // If no profile found, show form
        if (error.code === 'PGRST116') {
          console.log('❌ No profile found for this registration number');
          setProfileComplete(false);
          setProfileData(null);
        } else {
          console.log('❌ Error fetching profile:', error);
          setProfileComplete(false);
          setProfileData(null);
        }
      } else if (profile) {
        // Check if profile is completed
        if (profile.profile_completed) {
          console.log('✅ Profile found and COMPLETED');
          setProfileComplete(true);
          setProfileData(profile);
        } else {
          console.log('📝 Profile found but NOT completed');
          setProfileComplete(false);
          setProfileData(profile);
        }
      } else {
        console.log('❌ No profile data returned');
        setProfileComplete(false);
        setProfileData(null);
      }
      
    } catch (error) {
      console.log('Profile check error:', error);
      setProfileComplete(false);
      setProfileData(null);
    } finally {
      setLoading(false);
    }
  };

  checkProfileStatus();
}, []);

  const handleProfileComplete = (completedProfileData: any) => {
    console.log('🎉 Profile completion callback:', completedProfileData);
    setProfileComplete(true);
    setProfileData(completedProfileData);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="text-lg">Loading your profile...</div>
      </div>
    );
  }

return (
  <div className="w-full min-h-screen bg-white text-black dark:bg-white dark:text-black">
    <div className="container mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8">
      <div className="max-w-4xl mx-auto bg-white p-4 sm:p-6 md:p-8 rounded-xl shadow-sm">
        
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            {profileComplete ? 'My Profile' : 'Complete Your Profile'}
          </h1>
          <p className="text-gray-700 text-sm sm:text-base">
            {profileComplete 
              ? 'View and manage your profile information' 
              : 'Please complete your profile information to continue'
            }
          </p>
        </div>

        {!profileComplete ? (
          <StudentProfileForm 
            onComplete={handleProfileComplete} 
            user={user}
            existingData={profileData}
          />
        ) : (
          <StudentProfileView user={user} profileData={profileData} />
        )}
      </div>
    </div>
  </div>
);

}