'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface StudentProfileViewProps {
  user?: any;
  profileData?: any;
}

interface ProfileData {
  id: string;
  regno: string;
  full_name: string;
  email: string;
  phone_number: string;
  date_of_birth: string;
  gender: string;
  cnic_bform: string;
  nationality: string;
  permanent_address: string;
  current_address: string;
  province_city: string;
  has_disability: boolean;
  disability_details: string;
  father_name: string;
  father_cnic: string;
  father_occupation: string;
  father_monthly_income: number;
  guardian_name: string;
  guardian_cnic: string;
  guardian_occupation: string;
  guardian_phone: string;
  household_monthly_income: number;
  family_members: number;
  emergency_contact_name: string;
  emergency_contact_relationship: string;
  emergency_contact_phone: string;
  avatar_url: string;
  profile_completed: boolean;
  created_at: string;
}

export function StudentProfileView({ user, profileData }: StudentProfileViewProps) {
  const [profile, setProfile] = useState<ProfileData | null>(profileData || null);
  const [loading, setLoading] = useState(!profileData);
  const [userRegno, setUserRegno] = useState<string | null>(null);

  const fetchProfile = useCallback(async (regno: string) => {
    try {
      setLoading(true);
      
      console.log('🔄 Fetching profile for regno:', regno);

      // Get basic info from students table
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('regno, full_name, email, level')
        .eq('regno', regno)
        .single();

      if (studentError) {
        console.error('❌ Error fetching from students table:', studentError);
      }

      console.log('📊 Student data:', studentData);

      // Get detailed profile data from profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('regno', regno)
        .single();

      if (profileError) {
        console.error('❌ Error fetching from profiles table:', profileError);
        
        // If no profile exists but we have student data, create basic profile
        if (studentData) {
          const basicProfile: ProfileData = {
            id: user?.id || '',
            regno: studentData.regno,
            full_name: studentData.full_name,
            email: studentData.email,
            phone_number: '',
            date_of_birth: '',
            gender: '',
            cnic_bform: '',
            nationality: '',
            permanent_address: '',
            current_address: '',
            province_city: '',
            has_disability: false,
            disability_details: '',
            father_name: '',
            father_cnic: '',
            father_occupation: '',
            father_monthly_income: 0,
            guardian_name: '',
            guardian_cnic: '',
            guardian_occupation: '',
            guardian_phone: '',
            household_monthly_income: 0,
            family_members: 0,
            emergency_contact_name: '',
            emergency_contact_relationship: '',
            emergency_contact_phone: '',
            avatar_url: '',
            profile_completed: false,
            created_at: new Date().toISOString()
          };
          setProfile(basicProfile);
          return;
        }
        
        setProfile(null);
        return;
      }

      console.log('📋 Profile data:', profileData);

      // Merge the data, prioritizing students table for basic info
      const mergedProfile: ProfileData = {
        ...profileData,
        ...(studentData && {
          full_name: studentData.full_name,
          email: studentData.email,
          regno: studentData.regno
        })
      };

      console.log('🎯 Merged profile:', mergedProfile);
      setProfile(mergedProfile);
    } catch (error) {
      console.error('❌ Error fetching profile:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Get regno from localStorage and fetch profile
  useEffect(() => {
    const regno = localStorage.getItem('studentRegno');
    console.log('📝 Retrieved regno from localStorage:', regno);
    setUserRegno(regno);
    
    if (regno && !profileData) {
      fetchProfile(regno);
    }
  }, [profileData, fetchProfile]);

  // Auto-refresh when user changes (logout/login)
  useEffect(() => {
    if (userRegno) {
      console.log('🔄 User regno changed, fetching fresh data...');
      fetchProfile(userRegno);
    }
  }, [userRegno, fetchProfile]);

  // Show loading while getting regno
  if (!userRegno && !profileData) {
    return (
      <div className="flex justify-center items-center min-h-48">
        <div className="text-lg">Loading user data...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-48">
        <div className="text-lg">Loading profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No profile data found for {userRegno}.</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Reload Page
        </button>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR'
    }).format(amount);
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
      {/* Clean header without refresh button */}
      <div className="bg-green-500 text-white p-4 text-center">
        <div className="flex items-center justify-center space-x-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="font-semibold">Profile {profile.profile_completed ? 'Completed' : 'Incomplete'}!</span>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center">
          <div className="mb-4 sm:mb-0 sm:mr-6">
            <div className="w-24 h-24 bg-white rounded-full border-4 border-white shadow-lg flex items-center justify-center overflow-hidden">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover"/>
              ) : (
                <span className="text-3xl text-gray-400">👤</span>
              )}
            </div>
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{profile.full_name}</h1>
            <p className="text-blue-100">Registration No: {profile.regno}</p>
            <p className="text-blue-100">{profile.email}</p>
            <p className="text-blue-100">Member since {formatDate(profile.created_at)}</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b">Personal Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoItem label="Full Name" value={profile.full_name} />
            <InfoItem label="Registration Number" value={profile.regno} />
            <InfoItem label="Email" value={profile.email} />
            <InfoItem label="Phone Number" value={profile.phone_number} />
            <InfoItem label="Date of Birth" value={formatDate(profile.date_of_birth)} />
            <InfoItem label="Gender" value={profile.gender} />
            <InfoItem label="CNIC/B-Form" value={profile.cnic_bform} />
            <InfoItem label="Nationality" value={profile.nationality} />
            {profile.has_disability && (
              <InfoItem label="Disability Details" value={profile.disability_details} />
            )}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b">Address Information</h2>
          <div className="grid grid-cols-1 gap-4">
            <InfoItem label="Permanent Address" value={profile.permanent_address} fullWidth />
            <InfoItem label="Current Address" value={profile.current_address} fullWidth />
            <InfoItem label="Province/City" value={profile.province_city} />
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b">Guardian Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoItem label="Father's Name" value={profile.father_name} />
            <InfoItem label="Father's CNIC" value={profile.father_cnic} />
            <InfoItem label="Father's Occupation" value={profile.father_occupation} />
            <InfoItem label="Father's Monthly Income" value={formatCurrency(profile.father_monthly_income)} />
            {profile.guardian_name && <InfoItem label="Guardian Name" value={profile.guardian_name} />}
            {profile.guardian_cnic && <InfoItem label="Guardian CNIC" value={profile.guardian_cnic} />}
            {profile.guardian_occupation && <InfoItem label="Guardian Occupation" value={profile.guardian_occupation} />}
            {profile.guardian_phone && <InfoItem label="Guardian Phone" value={profile.guardian_phone} />}
            <InfoItem label="Household Monthly Income" value={formatCurrency(profile.household_monthly_income)} />
            <InfoItem label="Family Members" value={profile.family_members.toString()} />
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b">Emergency Contact</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoItem label="Contact Name" value={profile.emergency_contact_name} />
            <InfoItem label="Relationship" value={profile.emergency_contact_relationship} />
            <InfoItem label="Phone Number" value={profile.emergency_contact_phone} />
          </div>
        </section>
      </div>

      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Print Profile
        </button>
      </div>
    </div>
  );
}

function InfoItem({ label, value, fullWidth = false }: { label: string; value: string; fullWidth?: boolean }) {
  return (
    <div className={fullWidth ? 'md:col-span-2' : ''}>
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{value || 'Not provided'}</dd>
    </div>
  );
}