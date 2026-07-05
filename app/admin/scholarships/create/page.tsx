'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Plus, Trash2, Layers, GripVertical } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { useAuth } from '@/app/contexts/AuthContext'; // ✅ ADD THIS
import { createAuditLog } from '@/lib/audit'; // ✅ ADD THIS

type CustomField = {
  type: string;
  label: string;
  name: string;
  required: boolean;
  placeholder: string;
  max_value: number | null;
};

type FormSection = {
  id: string;
  title: string;
  fields: CustomField[];
};

type Tier = {
  id: string;
  tier_name: string;
  min_score: number;
  max_score: number;
  award_description: string;
  award_amount: string;
  award_amount_numeric?: number;
};

export default function CreateScholarshipPage() {
  const { user } = useAuth(); // ✅ ADD THIS
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    deadline: '',
    status: 'active',
    student_types: ['undergraduate'],
    number_of_awards: 0
  });

  const [budgetData, setBudgetData] = useState({
    award_amount: '',
  });

  const [sections, setSections] = useState<FormSection[]>([
    {
      id: 'section_1',
      title: 'Personal Information',
      fields: [
        { type: 'text', label: 'Full Name', name: 'full_name', required: true, placeholder: 'Enter full name', max_value: null },
        { type: 'text', label: 'CNIC/B-Form', name: 'cnic', required: true, placeholder: '12345-6789012-3', max_value: null },
        { type: 'email', label: 'Email', name: 'email', required: true, placeholder: 'student@example.com', max_value: null },
        { type: 'text', label: 'Phone Number', name: 'phone', required: true, placeholder: '03XX-XXXXXXX', max_value: null },
      ]
    },
    {
      id: 'section_2',
      title: 'Academic Information',
      fields: [
        { type: 'text', label: 'Registration Number', name: 'registration_no', required: true, placeholder: 'FA21-BCS-001', max_value: null },
        { type: 'number', label: 'CGPA', name: 'cgpa', required: true, placeholder: '3.5', max_value: 4.0 },
        { type: 'number', label: 'FSC Marks', name: 'fsc_marks', required: true, placeholder: 'Enter FSC marks', max_value: 1100 },
        { type: 'number', label: 'Matric Marks', name: 'matric_marks', required: true, placeholder: 'Enter Matric marks', max_value: 1100 },
        { type: 'number', label: 'NTS Score', name: 'nts_score', required: true, placeholder: 'Enter NTS score', max_value: 100 },
      ]
    },
    {
      id: 'section_3',
      title: 'Documents',
      fields: [
        { type: 'file', label: 'Transcript', name: 'transcript', required: true, placeholder: 'Upload PDF', max_value: null },
        { type: 'file', label: 'CNIC Copy', name: 'cnic_copy', required: true, placeholder: 'Upload image', max_value: null },
        { type: 'file', label: 'Passport Photo', name: 'photo', required: true, placeholder: 'Upload image', max_value: null },
      ]
    }
  ]);

  const [scholarshipMode, setScholarshipMode] = useState<'single' | 'tiered'>('single');
  const [tiers, setTiers] = useState<Tier[]>([]);

  const addSection = (): void => {
    setSections(prev => [...prev, {
      id: `section_${Date.now()}`,
      title: `Section ${prev.length + 1}`,
      fields: []
    }]);
    toast.success('New section added!');
  };

  const updateSectionTitle = (index: number, title: string): void => {
    const updated = [...sections];
    updated[index].title = title;
    setSections(updated);
  };

  const removeSection = (index: number): void => {
    if (sections.length <= 1) {
      toast.error('At least one section is required');
      return;
    }
    setSections(prev => prev.filter((_, i) => i !== index));
  };

  const moveSectionUp = (index: number): void => {
    if (index === 0) return;
    const updated = [...sections];
    [updated[index], updated[index - 1]] = [updated[index - 1], updated[index]];
    setSections(updated);
  };

  const moveSectionDown = (index: number): void => {
    if (index === sections.length - 1) return;
    const updated = [...sections];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    setSections(updated);
  };

  const addFieldToSection = (sectionIndex: number): void => {
    const updated = [...sections];
    updated[sectionIndex].fields.push({
      type: 'text',
      label: '',
      name: '',
      required: false,
      placeholder: '',
      max_value: null
    });
    setSections(updated);
  };

  const updateFieldInSection = (
    sectionIndex: number,
    fieldIndex: number,
    field: keyof CustomField,
    value: string | number | boolean | null
  ): void => {
    const updated = [...sections];
    const fieldData = updated[sectionIndex].fields[fieldIndex];

    if (field === 'label') {
      fieldData.label = value as string;
      fieldData.name = (value as string).toLowerCase().replace(/\s+/g, '_');
    } else if (field === 'type') {
      fieldData.type = value as string;
    } else if (field === 'name') {
      fieldData.name = value as string;
    } else if (field === 'placeholder') {
      fieldData.placeholder = value as string;
    } else if (field === 'required') {
      fieldData.required = value as boolean;
    } else if (field === 'max_value') {
      fieldData.max_value = value as number | null;
    }

    setSections(updated);
  };

  const removeFieldFromSection = (sectionIndex: number, fieldIndex: number): void => {
    const updated = [...sections];
    updated[sectionIndex].fields = updated[sectionIndex].fields.filter((_, i) => i !== fieldIndex);
    setSections(updated);
  };

  const addTier = (): void => {
    setTiers(prev => [...prev, {
      id: Date.now().toString(),
      tier_name: '',
      min_score: 0,
      max_score: 100,
      award_description: '',
      award_amount: '',
      award_amount_numeric: 0
    }]);
  };

  const updateTier = (index: number, field: keyof Tier, value: string | number): void => {
    const updated = [...tiers];
    updated[index] = { ...updated[index], [field]: value };
    setTiers(updated);
  };

  const removeTier = (index: number): void => {
    setTiers(prev => prev.filter((_, i) => i !== index));
  };

  const calculateTotalBudget = (): number => {
    if (scholarshipMode === 'single') {
      const numAwards = parseInt(formData.number_of_awards.toString()) || 0;
      const awardAmount = parseInt(budgetData.award_amount) || 0;
      return numAwards * awardAmount;
    } else {
      return tiers.reduce((sum, tier) => sum + (tier.award_amount_numeric || 0), 0);
    }
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.title.trim() || !formData.description.trim() || !formData.deadline) {
      toast.error('Please fill all required fields');
      setLoading(false);
      return;
    }

    if (scholarshipMode === 'single' && (!formData.number_of_awards || formData.number_of_awards <= 0)) {
      toast.error('Number of awards required for single mode');
      setLoading(false);
      return;
    }

    if (scholarshipMode === 'single' && (!budgetData.award_amount || parseInt(budgetData.award_amount) <= 0)) {
      toast.error('Award amount per student is required');
      setLoading(false);
      return;
    }

    if (scholarshipMode === 'tiered') {
      if (tiers.length === 0) {
        toast.error('Please add at least one tier');
        setLoading(false);
        return;
      }
      const missingAmount = tiers.some(t => !t.award_amount_numeric || t.award_amount_numeric <= 0);
      if (missingAmount) {
        toast.error('Please set numeric amount for all tiers');
        setLoading(false);
        return;
      }
    }

    const deadlineDate = new Date(formData.deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (deadlineDate < today) {
      toast.error('Deadline cannot be in the past');
      setLoading(false);
      return;
    }

    const hasEmptySection = sections.some(s => s.fields.length === 0);
    if (hasEmptySection) {
      toast.error('All sections must have at least one field');
      setLoading(false);
      return;
    }

    const hasEmptyLabel = sections.some(s => s.fields.some(f => !f.label.trim()));
    if (hasEmptyLabel) {
      toast.error('All fields must have a label');
      setLoading(false);
      return;
    }

    const totalBudget = calculateTotalBudget();

    const submissionData = {
      title: formData.title,
      description: formData.description,
      deadline: formData.deadline,
      status: formData.status,
      student_types: formData.student_types,
      form_sections: sections,
      number_of_awards: scholarshipMode === 'single' ? formData.number_of_awards : 0,
      scholarship_mode: scholarshipMode,
      tiers: scholarshipMode === 'tiered' ? tiers : [],
      budget_allocated: totalBudget,
      award_amount: scholarshipMode === 'single' ? parseInt(budgetData.award_amount) : 0,
      budget_status: 'pending'
    };

    try {
      const response = await fetch('/api/scholarships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create scholarship');
      }

      // ✅ AUDIT LOG: Scholarship Created
      await createAuditLog({
        adminId: user?.id || '',
        adminName: user?.name || 'Unknown',
        adminEmail: user?.email || '',
        adminRole: user?.role || 'reviewer',
        action: 'CREATE',
        entityType: 'SCHOLARSHIP',
        entityId: data.id,
        entityName: formData.title,
        changes: `Created scholarship: ${formData.title} (${scholarshipMode} mode, Budget: Rs. ${totalBudget.toLocaleString()})`,
        userAgent: navigator.userAgent
      });

      toast.success(`${formData.title} created successfully!`);
      setTimeout(() => router.push('/admin/scholarships'), 1500);
    } catch (err: any) {
      setError(err.message);
      toast.error(`Failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>): void => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleStudentTypeChange = (studentType: string, checked: boolean): void => {
    setFormData(prev => {
      const types = checked
        ? [...prev.student_types, studentType]
        : prev.student_types.filter(t => t !== studentType);
      if (types.length === 0) return prev;
      return { ...prev, student_types: types };
    });
  };

  const today = new Date().toISOString().split('T')[0];

  const totalBudget = calculateTotalBudget();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <Toaster position="top-center" />

        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft size={20} />
            Back
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Create Scholarship</h1>
            <p className="text-gray-600 mt-2">Add a new scholarship program for students</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Scholarship Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., CAMS Merit Scholarship"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description & Details *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={6}
                placeholder="Include all details like eligibility criteria, benefits, etc."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                required
              />
            </div>

            {/* Student Types */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Student Types *</label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.student_types.includes('undergraduate')}
                    onChange={(e) => handleStudentTypeChange('undergraduate', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span>Undergraduate Students</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.student_types.includes('graduate')}
                    onChange={(e) => handleStudentTypeChange('graduate', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span>Graduate Students</span>
                </label>
              </div>
            </div>

            {/* Scholarship Mode */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <label className="block text-sm font-medium text-gray-700 mb-3">Scholarship Award Type</label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="scholarshipMode"
                    value="single"
                    checked={scholarshipMode === 'single'}
                    onChange={(e) => setScholarshipMode(e.target.value as 'single')}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-gray-700">Single Scholarship</span>
                  <span className="text-xs text-gray-500 ml-2">All selected students get same award</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="scholarshipMode"
                    value="tiered"
                    checked={scholarshipMode === 'tiered'}
                    onChange={(e) => setScholarshipMode(e.target.value as 'tiered')}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-gray-700">Tiered Scholarship</span>
                  <span className="text-xs text-gray-500 ml-2">Students get different awards based on score</span>
                </label>
              </div>
            </div>

            {/* Single Mode Fields */}
            {scholarshipMode === 'single' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Number of Awards *</label>
                  <input
                    type="number"
                    name="number_of_awards"
                    value={formData.number_of_awards}
                    onChange={handleChange}
                    min="1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                    placeholder="How many students will get this scholarship?"
                    required
                  />
                  <p className="text-sm text-gray-500 mt-1">Top N students will be selected</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Award Amount per Student *</label>
                  <input
                    type="number"
                    name="award_amount"
                    value={budgetData.award_amount}
                    onChange={(e) => setBudgetData({ ...budgetData, award_amount: e.target.value })}
                    min="1"
                    placeholder="e.g., 50000"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
              </>
            )}

            {/* Tiered Mode Fields */}
            {scholarshipMode === 'tiered' && (
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                    <Layers size={20} />
                    Scholarship Tiers
                  </h3>
                  <button
                    type="button"
                    onClick={addTier}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Plus size={18} />
                    Add Tier
                  </button>
                </div>

                {tiers.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                    <p className="text-gray-500">No tiers added yet. Click "Add Tier" to create scholarship categories.</p>
                    <p className="text-sm text-gray-400 mt-1">Example: Gold (90-100%), Silver (75-89%), Bronze (60-74%)</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tiers.map((tier, index) => (
                      <div key={tier.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Tier Name</label>
                            <input
                              type="text"
                              value={tier.tier_name}
                              onChange={(e) => updateTier(index, 'tier_name', e.target.value)}
                              placeholder="e.g., Gold"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Min Score (%)</label>
                            <input
                              type="number"
                              value={tier.min_score}
                              onChange={(e) => updateTier(index, 'min_score', parseFloat(e.target.value))}
                              placeholder="0"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Max Score (%)</label>
                            <input
                              type="number"
                              value={tier.max_score}
                              onChange={(e) => updateTier(index, 'max_score', parseFloat(e.target.value))}
                              placeholder="100"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Award Description</label>
                            <input
                              type="text"
                              value={tier.award_description}
                              onChange={(e) => updateTier(index, 'award_description', e.target.value)}
                              placeholder="e.g., Tuition Fee Waiver"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Display Amount</label>
                            <input
                              type="text"
                              value={tier.award_amount}
                              onChange={(e) => updateTier(index, 'award_amount', e.target.value)}
                              placeholder="e.g., 75% or Rs.40,000"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Amount (Numeric)</label>
                            <input
                              type="number"
                              value={tier.award_amount_numeric || ''}
                              onChange={(e) => {
                                const updated = [...tiers];
                                updated[index] = { ...updated[index], award_amount_numeric: parseFloat(e.target.value) || 0 };
                                setTiers(updated);
                              }}
                              placeholder="e.g., 50000"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeTier(index)}
                          className="mt-3 text-red-600 hover:text-red-800 text-sm flex items-center gap-1"
                        >
                          <Trash2 size={14} /> Remove Tier
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-sm text-gray-500 mt-3">
                  Students will be automatically assigned to the tier matching their calculated percentage score.
                  Make sure score ranges don't overlap.
                </p>
              </div>
            )}

            {/* Budget Summary */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h4 className="font-semibold text-gray-700 mb-2">Budget Summary</h4>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Budget Required:</span>
                <span className="text-xl font-bold text-blue-600">Rs. {totalBudget.toLocaleString()}</span>
              </div>
              {scholarshipMode === 'single' && formData.number_of_awards > 0 && budgetData.award_amount && (
                <div className="text-sm text-gray-500 mt-1">
                  {formData.number_of_awards} students × Rs. {parseInt(budgetData.award_amount).toLocaleString()} = Rs. {totalBudget.toLocaleString()}
                </div>
              )}
              {scholarshipMode === 'tiered' && tiers.length > 0 && (
                <div className="text-sm text-gray-500 mt-1">
                  {tiers.filter(t => t.award_amount_numeric && t.award_amount_numeric > 0).length} tiers with amounts
                </div>
              )}
              {totalBudget > 0 && (
                <p className="text-xs text-gray-400 mt-2">Budget will be pending approval after merit list generation</p>
              )}
            </div>

            {/* Form Sections (Tabs) */}
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                  <GripVertical size={20} />
                  Form Sections (Tabs)
                </h3>
                <button
                  type="button"
                  onClick={addSection}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Plus size={18} />
                  Add Section
                </button>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Each section becomes a tab in the student application form.
              </p>

              {sections.map((section, sectionIndex) => (
                <div key={section.id} className="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50">
                  <div className="flex items-center gap-3 mb-3">
                    <input
                      type="text"
                      value={section.title}
                      onChange={(e) => updateSectionTitle(sectionIndex, e.target.value)}
                      placeholder="Section Title (e.g., Personal Information)"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => moveSectionUp(sectionIndex)}
                        className="text-gray-500 hover:text-gray-700 p-1"
                        title="Move Up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSectionDown(sectionIndex)}
                        className="text-gray-500 hover:text-gray-700 p-1"
                        title="Move Down"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => removeSection(sectionIndex)}
                        className="text-red-600 hover:text-red-800 p-1"
                        title="Remove Section"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 ml-4">
                    {section.fields.map((field, fieldIndex) => (
                      <div key={fieldIndex} className="flex flex-wrap gap-2 p-2 bg-white rounded border border-gray-200 items-center">
                        <select
                          value={field.type}
                          onChange={(e) => updateFieldInSection(sectionIndex, fieldIndex, 'type', e.target.value)}
                          className="px-2 py-1 border rounded text-sm"
                        >
                          <option value="text">Text</option>
                          <option value="number">Number</option>
                          <option value="email">Email</option>
                          <option value="textarea">Text Area</option>
                          <option value="file">File</option>
                        </select>
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) => updateFieldInSection(sectionIndex, fieldIndex, 'label', e.target.value)}
                          placeholder="Field Label"
                          className="flex-1 px-2 py-1 border rounded text-sm min-w-[120px]"
                        />
                        <input
                          type="text"
                          value={field.placeholder || ''}
                          onChange={(e) => updateFieldInSection(sectionIndex, fieldIndex, 'placeholder', e.target.value)}
                          placeholder="Placeholder"
                          className="flex-1 px-2 py-1 border rounded text-sm min-w-[100px]"
                        />
                        {field.type === 'number' && (
                          <input
                            type="number"
                            value={field.max_value ?? ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateFieldInSection(sectionIndex, fieldIndex, 'max_value', val ? parseFloat(val) : null);
                            }}
                            placeholder="Max"
                            className="w-16 px-2 py-1 border rounded text-sm"
                          />
                        )}
                        <label className="flex items-center gap-1 text-sm whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) => updateFieldInSection(sectionIndex, fieldIndex, 'required', e.target.checked)}
                            className="w-4 h-4"
                          />
                          Required
                        </label>
                        <button
                          type="button"
                          onClick={() => removeFieldFromSection(sectionIndex, fieldIndex)}
                          className="text-red-500 hover:text-red-700 px-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addFieldToSection(sectionIndex)}
                      className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1 mt-1"
                    >
                      <Plus size={14} />
                      Add Field to {section.title}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Deadline & Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Application Deadline *</label>
                <input
                  type="date"
                  name="deadline"
                  value={formData.deadline}
                  onChange={handleChange}
                  min={today}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex gap-4 pt-6 border-t">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 border border-gray-300 text-gray-700 px-6 py-3 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2"
              >
                <Save size={20} />
                {loading ? 'Creating...' : 'Create Scholarship'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}