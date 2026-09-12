'use client';
import { supabase } from '@/lib/supabaseClient';
import { useState, useEffect } from 'react';



interface StudentProfileFormProps {
  onComplete: (profileData: any) => void;
  user: any;
  existingData?: any;
}

export function StudentProfileForm({ onComplete, user, existingData }: StudentProfileFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Step 1: Personal Information
    full_name: '',
    regno: '',
    email: '',
    phone_number: '',
    date_of_birth: '',
    gender: '',
    cnic_bform: '',
    nationality: '',
    
    // Step 2: Address Information
    permanent_address: '',
    current_address: '',
    province_city: '',
    has_disability: false,
    disability_details: '',
    
    // Step 3: Guardian Information
    father_name: '',
    father_cnic: '',
    father_occupation: '',
    father_monthly_income: '',
    guardian_name: '',
    guardian_cnic: '',
    guardian_occupation: '',
    guardian_phone: '',
    household_monthly_income: '',
    family_members: '',
    
    // Step 4: Emergency Contact
    emergency_contact_name: '',
    emergency_contact_relationship: '',
    emergency_contact_phone: '',
    
    // Step 5: Documents (files) - ALL COMPULSORY
    student_cnic_front: null as File | null,
    student_cnic_back: null as File | null,
    father_cnic_front: null as File | null,
    father_cnic_back: null as File | null,
    student_card_front: null as File | null,
    student_card_back: null as File | null,
  });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});

  // Pre-fill data from localStorage and existingData
  useEffect(() => {
    const studentName = localStorage.getItem('studentName') || '';
    const studentRegno = localStorage.getItem('studentRegno') || '';
    const studentEmail = localStorage.getItem('studentEmail') || '';

    console.log('📋 Fetching from localStorage:', { 
      name: studentName, 
      regno: studentRegno, 
      email: studentEmail,
    });

    console.log('📋 Existing data:', existingData);

    const initialData = existingData ? {
      full_name: existingData.full_name || studentName,
      regno: existingData.regno || studentRegno,
      email: existingData.email || studentEmail,
      phone_number: existingData.phone_number || '',
      date_of_birth: existingData.date_of_birth || '',
      gender: existingData.gender || '',
      cnic_bform: existingData.cnic_bform || '',
      nationality: existingData.nationality || '',
      permanent_address: existingData.permanent_address || '',
      current_address: existingData.current_address || '',
      province_city: existingData.province_city || '',
      has_disability: existingData.has_disability || false,
      disability_details: existingData.disability_details || '',
      father_name: existingData.father_name || '',
      father_cnic: existingData.father_cnic || '',
      father_occupation: existingData.father_occupation || '',
      father_monthly_income: existingData.father_monthly_income || '',
      guardian_name: existingData.guardian_name || '',
      guardian_cnic: existingData.guardian_cnic || '',
      guardian_occupation: existingData.guardian_occupation || '',
      guardian_phone: existingData.guardian_phone || '',
      household_monthly_income: existingData.household_monthly_income || '',
      family_members: existingData.family_members || '',
      emergency_contact_name: existingData.emergency_contact_name || '',
      emergency_contact_relationship: existingData.emergency_contact_relationship || '',
      emergency_contact_phone: existingData.emergency_contact_phone || '',
    } : {
      email: studentEmail,
      full_name: studentName,
      regno: studentRegno,
    };

    setFormData(prev => ({
      ...prev,
      ...initialData
    }));

    if (user && (!studentName || !studentRegno)) {
      console.log('🔄 Falling back to user metadata');
      setFormData(prev => ({
        ...prev,
        email: user.email || prev.email,
        full_name: user.user_metadata?.full_name || prev.full_name,
        regno: user.user_metadata?.registration_number || prev.regno
      }));
    }
  }, [user, existingData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
    
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({
        ...prev,
        [fieldName]: e.target.files![0]
      }));
    }
  };

  // Validation functions - Step 1-4 remain the same
  const validateStep1 = () => {
    const errors: {[key: string]: string} = {};
    
    if (!formData.phone_number.trim()) errors.phone_number = 'Phone number is required';
    if (!formData.date_of_birth) errors.date_of_birth = 'Date of birth is required';
    if (!formData.gender) errors.gender = 'Gender is required';
    if (!formData.cnic_bform.trim()) errors.cnic_bform = 'CNIC/B-Form is required';
    if (!formData.nationality.trim()) errors.nationality = 'Nationality is required';
    
    if (formData.cnic_bform && !/^\d{5}-\d{7}-\d{1}$/.test(formData.cnic_bform)) {
      errors.cnic_bform = 'CNIC must be in format: XXXXX-XXXXXXX-X';
    }
    
    if (formData.phone_number && !/^03\d{2}-\d{7}$/.test(formData.phone_number)) {
      errors.phone_number = 'Phone must be in format: 03XX-XXXXXXX';
    }
    
    return errors;
  };

  const validateStep2 = () => {
    const errors: {[key: string]: string} = {};
    
    if (!formData.permanent_address.trim()) errors.permanent_address = 'Permanent address is required';
    if (!formData.current_address.trim()) errors.current_address = 'Current address is required';
    if (!formData.province_city.trim()) errors.province_city = 'Province/City is required';
    
    return errors;
  };

  const validateStep3 = () => {
    const errors: {[key: string]: string} = {};
    
    if (!formData.father_name.trim()) errors.father_name = "Father's name is required";
    if (!formData.father_cnic.trim()) errors.father_cnic = "Father's CNIC is required";
    if (!formData.father_occupation.trim()) errors.father_occupation = "Father's occupation is required";
    if (!formData.father_monthly_income) errors.father_monthly_income = "Father's monthly income is required";
    if (!formData.household_monthly_income) errors.household_monthly_income = 'Household monthly income is required';
    if (!formData.family_members) errors.family_members = 'Number of family members is required';
    
    if (formData.father_cnic && !/^\d{5}-\d{7}-\d{1}$/.test(formData.father_cnic)) {
      errors.father_cnic = 'CNIC must be in format: XXXXX-XXXXXXX-X';
    }
    
    return errors;
  };

  const validateStep4 = () => {
    const errors: {[key: string]: string} = {};
    
    if (!formData.emergency_contact_name.trim()) errors.emergency_contact_name = 'Emergency contact name is required';
    if (!formData.emergency_contact_relationship.trim()) errors.emergency_contact_relationship = 'Relationship is required';
    if (!formData.emergency_contact_phone.trim()) errors.emergency_contact_phone = 'Emergency contact phone is required';
    
    if (formData.emergency_contact_phone && !/^03\d{2}-\d{7}$/.test(formData.emergency_contact_phone)) {
      errors.emergency_contact_phone = 'Phone must be in format: 03XX-XXXXXXX';
    }
    
    return errors;
  };

  // UPDATED: ALL DOCUMENTS ARE COMPULSORY
  const validateStep5 = () => {
    const errors: {[key: string]: string} = {};
    
    if (!formData.student_cnic_front) errors.student_cnic_front = 'Student CNIC front is required';
    if (!formData.student_cnic_back) errors.student_cnic_back = 'Student CNIC back is required';
    if (!formData.father_cnic_front) errors.father_cnic_front = "Father's CNIC front is required";
    if (!formData.father_cnic_back) errors.father_cnic_back = "Father's CNIC back is required";
    if (!formData.student_card_front) errors.student_card_front = 'Student card front is required';
    if (!formData.student_card_back) errors.student_card_back = 'Student card back is required';
    
    return errors;
  };

  const nextStep = () => {
    let errors = {};
    
    switch(currentStep) {
      case 1:
        errors = validateStep1();
        break;
      case 2:
        errors = validateStep2();
        break;
      case 3:
        errors = validateStep3();
        break;
      case 4:
        errors = validateStep4();
        break;
      case 5:
        errors = validateStep5();
        break;
    }
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      const firstError = Object.keys(errors)[0];
      const element = document.querySelector(`[name="${firstError}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    
    setFormErrors({});
    setCurrentStep(prev => prev + 1);
    window.scrollTo(0, 0);
  };

  const prevStep = () => {
    setFormErrors({});
    setCurrentStep(prev => prev - 1);
    window.scrollTo(0, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🚀 Starting form submission...');
    
    // Validate final step - ALL DOCUMENTS REQUIRED
    const errors = validateStep5();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    setLoading(true);

    try {
      console.log('💾 Starting to save data to database...');
      
      // Upload files to your API route
      const uploadFile = async (file: File, type: string): Promise<string> => {
        const uploadFormData = new FormData();
        uploadFormData.append('file', file);
        uploadFormData.append('type', type);
        uploadFormData.append('regno', formData.regno);

        console.log(`📤 Uploading ${type} for regno: ${formData.regno}`);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: uploadFormData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to upload ${type}`);
        }

        const result = await response.json();
        console.log(`✅ ${type} uploaded:`, result.url);
        return result.url;
      };

      // Upload avatar if exists (optional)
      let avatarUrl = null;
      if (avatarFile) {
        avatarUrl = await uploadFile(avatarFile, 'avatar');
      }

      // Upload ALL COMPULSORY documents
      const [
        studentCnicFrontUrl,
        studentCnicBackUrl,
        fatherCnicFrontUrl,
        fatherCnicBackUrl,
        studentCardFrontUrl,
        studentCardBackUrl
      ] = await Promise.all([
        uploadFile(formData.student_cnic_front!, 'student_cnic_front'),
        uploadFile(formData.student_cnic_back!, 'student_cnic_back'),
        uploadFile(formData.father_cnic_front!, 'father_cnic_front'),
        uploadFile(formData.father_cnic_back!, 'father_cnic_back'),
        uploadFile(formData.student_card_front!, 'student_card_front'),
        uploadFile(formData.student_card_back!, 'student_card_back')
      ]);

      // Prepare data for database
      const dbData = {
        regno: formData.regno,
        full_name: formData.full_name,
        email: formData.email,
        phone_number: formData.phone_number,
        date_of_birth: formData.date_of_birth,
        gender: formData.gender,
        cnic_bform: formData.cnic_bform,
        nationality: formData.nationality,
        permanent_address: formData.permanent_address,
        current_address: formData.current_address,
        province_city: formData.province_city,
        has_disability: formData.has_disability,
        disability_details: formData.disability_details || '',
        father_name: formData.father_name,
        father_cnic: formData.father_cnic,
        father_occupation: formData.father_occupation,
        father_monthly_income: formData.father_monthly_income ? parseFloat(formData.father_monthly_income) : 0,
        guardian_name: formData.guardian_name || '',
        guardian_cnic: formData.guardian_cnic || '',
        guardian_occupation: formData.guardian_occupation || '',
        guardian_phone: formData.guardian_phone || '',
        household_monthly_income: formData.household_monthly_income ? parseFloat(formData.household_monthly_income) : 0,
        family_members: formData.family_members ? parseInt(formData.family_members) : 0,
        emergency_contact_name: formData.emergency_contact_name,
        emergency_contact_relationship: formData.emergency_contact_relationship,
        emergency_contact_phone: formData.emergency_contact_phone,
        // Document URLs - ALL COMPULSORY
        avatar_url: avatarUrl,
        student_cnic_front_url: studentCnicFrontUrl,
        student_cnic_back_url: studentCnicBackUrl,
        father_cnic_front_url: fatherCnicFrontUrl,
        father_cnic_back_url: fatherCnicBackUrl,
        student_card_front_url: studentCardFrontUrl,
        student_card_back_url: studentCardBackUrl,
        profile_completed: true,
        updated_at: new Date().toISOString()
      };

      console.log('📦 Data to save:', dbData);

      const { data, error } = await supabase
        .from('profiles')
        .upsert(dbData, { onConflict: 'regno' })
        .select()
        .single();

      if (error) {
        console.error('❌ Database error:', error);
        throw new Error(`Database error: ${error.message}`);
      }
      
      console.log('✅ Profile saved successfully:', data);
      alert('🎉 Profile completed successfully!');
      onComplete(data);
      
    } catch (error: any) {
      console.error('❌ Error saving profile:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { number: 1, title: 'Personal Information', completed: currentStep > 1 },
    { number: 2, title: 'Address Information', completed: currentStep > 2 },
    { number: 3, title: 'Guardian Information', completed: currentStep > 3 },
    { number: 4, title: 'Emergency Contact', completed: currentStep > 4 },
    { number: 5, title: 'Document Upload', completed: currentStep > 5 },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-blue-800 mb-2">
          Complete Your Profile
        </h2>
        <p className="text-blue-700">
          Welcome! Please complete your profile information to access all features. 
          Your name, registration number, and email are pre-filled from your account.
        </p>
        {existingData && (
          <p className="text-green-700 mt-2">
            📝 You have existing profile data. Please complete the remaining information.
          </p>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          {steps.map((step, index) => (
            <div key={step.number} className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                step.completed ? 'bg-green-500 text-white' : 
                currentStep === step.number ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-600'
              }`}>
                {step.completed ? '✓' : step.number}
              </div>
              <span className="text-xs mt-2 text-center hidden sm:block">{step.title}</span>
            </div>
          ))}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
          ></div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
                {/* Step 1: Personal Information */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Personal Information</h2>
            
            {/* Avatar Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Profile Photo
              </label>
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden border-2 border-gray-300">
                  {avatarFile ? (
                    <img 
                      src={URL.createObjectURL(avatarFile)} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-500 text-2xl">👤</span>
                  )}
                </div>
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
              </div>
            </div>

            {/* Auto-filled from localStorage */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  required
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">Name from your account</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Registration Number *</label>
                <input
                  type="text"
                  name="regno"
                  value={formData.regno}
                  onChange={handleChange}
                  required
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">Registration number from your account</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">Email from your account</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  required
                  placeholder="03XX-XXXXXXX"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.phone_number ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {formErrors.phone_number && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.phone_number}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth *</label>
                <input
                  type="date"
                  name="date_of_birth"
                  value={formData.date_of_birth}
                  onChange={handleChange}
                  required
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.date_of_birth ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {formErrors.date_of_birth && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.date_of_birth}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  required
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.gender ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                {formErrors.gender && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.gender}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CNIC / B-Form Number *</label>
                <input
                  type="text"
                  name="cnic_bform"
                  value={formData.cnic_bform}
                  onChange={handleChange}
                  required
                  placeholder="XXXXX-XXXXXXX-X"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.cnic_bform ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {formErrors.cnic_bform && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.cnic_bform}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nationality *</label>
                <input
                  type="text"
                  name="nationality"
                  value={formData.nationality}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Pakistani"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.nationality ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {formErrors.nationality && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.nationality}</p>
                )}
              </div>
            </div>
          </div>
        )}
 {/* Step 2: Address Information */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Address Information</h2>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Permanent Address *</label>
                <textarea
                  name="permanent_address"
                  value={formData.permanent_address}
                  onChange={handleChange}
                  required
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.permanent_address ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Complete permanent address"
                />
                {formErrors.permanent_address && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.permanent_address}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Address *</label>
                <textarea
                  name="current_address"
                  value={formData.current_address}
                  onChange={handleChange}
                  required
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.current_address ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Complete current address"
                />
                {formErrors.current_address && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.current_address}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Province / City *</label>
                <input
                  type="text"
                  name="province_city"
                  value={formData.province_city}
                  onChange={handleChange}
                  required
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.province_city ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Punjab, Lahore"
                />
                {formErrors.province_city && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.province_city}</p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="has_disability"
                  checked={formData.has_disability}
                  onChange={handleChange}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label className="text-sm font-medium text-gray-700">Do you have any disability?</label>
              </div>

              {formData.has_disability && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Disability Details</label>
                  <textarea
                    name="disability_details"
                    value={formData.disability_details}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Please describe your disability and any special requirements"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Guardian Information */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Guardian / Family Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Father's Name *</label>
                <input
                  type="text"
                  name="father_name"
                  value={formData.father_name}
                  onChange={handleChange}
                  required
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.father_name ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {formErrors.father_name && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.father_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Father's CNIC *</label>
                <input
                  type="text"
                  name="father_cnic"
                  value={formData.father_cnic}
                  onChange={handleChange}
                  required
                  placeholder="XXXXX-XXXXXXX-X"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.father_cnic ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {formErrors.father_cnic && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.father_cnic}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Father's Occupation *</label>
                <input
                  type="text"
                  name="father_occupation"
                  value={formData.father_occupation}
                  onChange={handleChange}
                  required
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.father_occupation ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {formErrors.father_occupation && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.father_occupation}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Father's Monthly Income *</label>
                <input
                  type="number"
                  name="father_monthly_income"
                  value={formData.father_monthly_income}
                  onChange={handleChange}
                  required
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.father_monthly_income ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Amount in PKR"
                />
                {formErrors.father_monthly_income && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.father_monthly_income}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Guardian Name (if different)</label>
                <input
                  type="text"
                  name="guardian_name"
                  value={formData.guardian_name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Guardian CNIC</label>
                <input
                  type="text"
                  name="guardian_cnic"
                  value={formData.guardian_cnic}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="XXXXX-XXXXXXX-X"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Guardian Occupation</label>
                <input
                  type="text"
                  name="guardian_occupation"
                  value={formData.guardian_occupation}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Guardian Phone Number</label>
                <input
                  type="tel"
                  name="guardian_phone"
                  value={formData.guardian_phone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="03XX-XXXXXXX"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Household Monthly Income *</label>
                <input
                  type="number"
                  name="household_monthly_income"
                  value={formData.household_monthly_income}
                  onChange={handleChange}
                  required
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.household_monthly_income ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Total family income in PKR"
                />
                {formErrors.household_monthly_income && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.household_monthly_income}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Number of Family Members *</label>
                <input
                  type="number"
                  name="family_members"
                  value={formData.family_members}
                  onChange={handleChange}
                  required
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.family_members ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Total members in family"
                />
                {formErrors.family_members && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.family_members}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Emergency Contact */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Emergency Contact</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact Name *</label>
                <input
                  type="text"
                  name="emergency_contact_name"
                  value={formData.emergency_contact_name}
                  onChange={handleChange}
                  required
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.emergency_contact_name ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {formErrors.emergency_contact_name && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.emergency_contact_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Relationship *</label>
                <input
                  type="text"
                  name="emergency_contact_relationship"
                  value={formData.emergency_contact_relationship}
                  onChange={handleChange}
                  required
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.emergency_contact_relationship ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Father, Mother, Brother"
                />
                {formErrors.emergency_contact_relationship && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.emergency_contact_relationship}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact Phone *</label>
                <input
                  type="tel"
                  name="emergency_contact_phone"
                  value={formData.emergency_contact_phone}
                  onChange={handleChange}
                  required
                  placeholder="03XX-XXXXXXX"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.emergency_contact_phone ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {formErrors.emergency_contact_phone && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.emergency_contact_phone}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Document Uploads - ALL COMPULSORY */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Document Uploads</h2>
            <p className="text-red-600 mb-6 font-semibold">
              ⚠️ ALL DOCUMENTS ARE COMPULSORY. Please upload clear scanned copies (PDF, JPG, PNG, max 10MB each)
            </p>
            
            <div className="grid grid-cols-1 gap-6">
              {/* Student CNIC/B-Form */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Student CNIC / B-Form (Front) *
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange(e, 'student_cnic_front')}
                  className="w-full"
                  required
                />
                {formData.student_cnic_front && (
                  <p className="text-sm text-green-600 mt-1">Selected: {formData.student_cnic_front.name}</p>
                )}
                {formErrors.student_cnic_front && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.student_cnic_front}</p>
                )}
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Student CNIC / B-Form (Back) *
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange(e, 'student_cnic_back')}
                  className="w-full"
                  required
                />
                {formData.student_cnic_back && (
                  <p className="text-sm text-green-600 mt-1">Selected: {formData.student_cnic_back.name}</p>
                )}
                {formErrors.student_cnic_back && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.student_cnic_back}</p>
                )}
              </div>

              {/* Father CNIC */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Father/Guardian CNIC (Front) *
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange(e, 'father_cnic_front')}
                  className="w-full"
                  required
                />
                {formData.father_cnic_front && (
                  <p className="text-sm text-green-600 mt-1">Selected: {formData.father_cnic_front.name}</p>
                )}
                {formErrors.father_cnic_front && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.father_cnic_front}</p>
                )}
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Father/Guardian CNIC (Back) *
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange(e, 'father_cnic_back')}
                  className="w-full"
                  required
                />
                {formData.father_cnic_back && (
                  <p className="text-sm text-green-600 mt-1">Selected: {formData.father_cnic_back.name}</p>
                )}
                {formErrors.father_cnic_back && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.father_cnic_back}</p>
                )}
              </div>

              {/* Student Card */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Student Card (Front) *
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange(e, 'student_card_front')}
                  className="w-full"
                  required
                />
                {formData.student_card_front && (
                  <p className="text-sm text-green-600 mt-1">Selected: {formData.student_card_front.name}</p>
                )}
                {formErrors.student_card_front && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.student_card_front}</p>
                )}
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Student Card (Back) *
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange(e, 'student_card_back')}
                  className="w-full"
                  required
                />
                {formData.student_card_back && (
                  <p className="text-sm text-green-600 mt-1">Selected: {formData.student_card_back.name}</p>
                )}
                {formErrors.student_card_back && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.student_card_back}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={prevStep}
            disabled={currentStep === 1}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          {currentStep < steps.length ? (
            <button
              type="button"
              onClick={nextStep}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
            >
              {loading ? 'Saving... ' : 'Complete Profile'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}