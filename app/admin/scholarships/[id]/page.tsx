'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, Plus, Trash2, Award, Layers, GripVertical } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { useAuth } from '@/app/contexts/AuthContext'; 
import { createAuditLog } from '@/lib/audit'; 

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

type ScoringCriterion = {
  id: string;
  fieldName: string;
  fieldLabel: string;
  weight: number;
  maxValue?: number;
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

type FormFieldOption = {
  name: string;
  label: string;
  type: string;
};

export default function EditScholarshipPage() {
  const params = useParams();
  const router = useRouter();
    const { user } = useAuth(); 

  const scholarshipId = params.id as string;

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'criteria' | 'tiers'>('details');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    deadline: '',
    status: 'active',
    student_types: ['undergraduate'],
    number_of_awards: 0,
    scholarship_mode: 'single'
  });

  const [budgetData, setBudgetData] = useState({
    award_amount: 0,
  });

  const [sections, setSections] = useState<FormSection[]>([]);
  const [scoringCriteria, setScoringCriteria] = useState<ScoringCriterion[]>([]);
  const [totalWeight, setTotalWeight] = useState(0);
  const [tiers, setTiers] = useState<Tier[]>([]);

  // ========== FETCH SCHOLARSHIP ==========
  useEffect(() => {
    fetchScholarship();
  }, [scholarshipId]);

  // ========== CALCULATE TOTAL WEIGHT ==========
  useEffect(() => {
    const total = scoringCriteria.reduce((sum: number, c: ScoringCriterion) => sum + (c.weight || 0), 0);
    setTotalWeight(total);
  }, [scoringCriteria]);

const fetchScholarship = async () => {
  try {
    console.log('🔄 Fetching scholarship:', scholarshipId);
    
    const response = await fetch(`/api/scholarships/${scholarshipId}?_=${Date.now()}`);
    const data = await response.json();

    console.log('📦 Full API response:', data);

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch scholarship');
    }

    if (data.success && data.scholarship) {
      setFormData({
        title: data.scholarship.title || '',
        description: data.scholarship.description || '',
        deadline: data.scholarship.deadline ? data.scholarship.deadline.split('T')[0] : '',
        status: data.scholarship.status || 'active',
        student_types: data.scholarship.student_types || ['undergraduate'],
        number_of_awards: data.scholarship.number_of_awards || 0,
        scholarship_mode: data.scholarship.scholarship_mode || 'single'
      });

      // Load budget data for single mode
      if (data.scholarship.scholarship_mode === 'single' && data.scholarship.budget_allocated && data.scholarship.number_of_awards > 0) {
        setBudgetData({
          award_amount: data.scholarship.budget_allocated / data.scholarship.number_of_awards
        });
      }

      // Load sections
      let loadedSections: FormSection[] = [];
      if (data.scholarship.form_sections && Array.isArray(data.scholarship.form_sections) && data.scholarship.form_sections.length > 0) {
        loadedSections = data.scholarship.form_sections.map((section: any) => ({
          id: section.id,
          title: section.title,
          fields: section.fields || []
        }));
      } else {
        loadedSections = [{
          id: 'section_1',
          title: 'Form Fields',
          fields: []
        }];
      }
      setSections(loadedSections);

      if (data.scholarship.scoring_criteria) {
        setScoringCriteria(data.scholarship.scoring_criteria);
      }

      // Load tiers from the scholarship data
      if (data.scholarship.tiers && data.scholarship.tiers.length > 0) {
        console.log('✅ Loading tiers:', data.scholarship.tiers);
        setTiers(data.scholarship.tiers);
      } else {
        console.log('ℹ️ No tiers found');
        setTiers([]);
      }
    }
  } catch (err: any) {
    console.error('❌ Error fetching scholarship:', err);
    setError(err.message);
  } finally {
    setFetchLoading(false);
  }
};

  const getAllFormFields = (): FormFieldOption[] => {
    const fields: FormFieldOption[] = [];
    sections.forEach((section: FormSection) => {
      section.fields.forEach((field: CustomField) => {
        if (field.label && field.name) {
          fields.push({
            name: field.name,
            label: field.label,
            type: field.type
          });
        }
      });
    });
    return fields;
  };

  // ========== SECTION FUNCTIONS ==========

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

  // ========== CRITERIA FUNCTIONS ==========

  const addCriterion = (): void => {
    const allFields = getAllFormFields();
    const usedFieldNames = scoringCriteria.map((c: ScoringCriterion) => c.fieldName);
    const availableFields = allFields.filter((f: FormFieldOption) => !usedFieldNames.includes(f.name));

    if (availableFields.length === 0) {
      if (allFields.length === 0) {
        toast.error('No fields found. Add fields to sections first.');
      } else {
        toast.error('All fields are already used in criteria.');
      }
      return;
    }

    const firstField = availableFields[0];
    const newCriterion: ScoringCriterion = {
      id: `criterion_${Date.now()}_${Math.random()}`,
      fieldName: firstField.name,
      fieldLabel: firstField.label,
      weight: 0
    };
    setScoringCriteria(prev => [...prev, newCriterion]);
  };

  const updateCriterion = (index: number, field: keyof ScoringCriterion, value: any): void => {
    const updated = [...scoringCriteria];

    if (field === 'fieldName') {
      const allFields = getAllFormFields();
      const selectedField = allFields.find((f: FormFieldOption) => f.name === value);
      if (selectedField) {
        updated[index] = {
          ...updated[index],
          fieldName: value,
          fieldLabel: selectedField.label
        };
      }
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }

    setScoringCriteria(updated);
  };

  const removeCriterion = (index: number): void => {
    setScoringCriteria(prev => prev.filter((_, i) => i !== index));
  };

  // ========== TIER FUNCTIONS ==========

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

  const updateTier = (index: number, field: keyof Tier, value: any): void => {
    const updated = [...tiers];
    updated[index] = { ...updated[index], [field]: value };
    setTiers(updated);
  };

  const removeTier = (index: number): void => {
    setTiers(prev => prev.filter((_, i) => i !== index));
  };

  // ========== FORM HANDLERS ==========

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>): void => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleStudentTypeChange = (studentType: string, checked: boolean): void => {
    setFormData(prev => {
      const types = checked
        ? [...prev.student_types, studentType]
        : prev.student_types.filter((t: string) => t !== studentType);
      if (types.length === 0) return prev;
      return { ...prev, student_types: types };
    });
  };

  // Calculate total budget
  const calculateTotalBudget = (): number => {
    if (formData.scholarship_mode === 'single') {
      return (formData.number_of_awards || 0) * (budgetData.award_amount || 0);
    } else {
      return tiers.reduce((sum, tier) => sum + (tier.award_amount_numeric || 0), 0);
    }
  };

  // ========== SUBMIT ==========

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (!formData.title.trim() || !formData.description.trim() || !formData.deadline) {
      setError('Please fill in all required fields');
      setLoading(false);
      return;
    }

    // Single mode: Award amount required
    if (formData.scholarship_mode === 'single' && (!budgetData.award_amount || budgetData.award_amount <= 0)) {
      setError('Award amount per student is required');
      setLoading(false);
      return;
    }

    // Tiered mode: Each tier must have numeric amount
    if (formData.scholarship_mode === 'tiered') {
      if (tiers.length === 0) {
        setError('Please add at least one tier');
        setLoading(false);
        return;
      }
      const missingAmount = tiers.some(t => !t.award_amount_numeric || t.award_amount_numeric <= 0);
      if (missingAmount) {
        setError('Please set numeric amount for all tiers');
        setLoading(false);
        return;
      }
    }

    const hasEmptySection = sections.some((section: FormSection) => section.fields.length === 0);
    if (hasEmptySection) {
      setError('All sections must have at least one field');
      setLoading(false);
      return;
    }

    const hasEmptyLabel = sections.some((section: FormSection) => 
      section.fields.some((field: CustomField) => !field.label.trim())
    );
    if (hasEmptyLabel) {
      setError('All fields must have a label');
      setLoading(false);
      return;
    }

    if (scoringCriteria.length === 0) {
      setError('Please add at least one scoring criterion');
      setLoading(false);
      return;
    }

    if (totalWeight !== 100) {
      setError(`Total weight must be 100%. Current: ${totalWeight}%`);
      setLoading(false);
      return;
    }

    if (formData.scholarship_mode === 'tiered' && tiers.length === 0) {
      setError('Please add at least one tier');
      setLoading(false);
      return;
    }

    // Format sections
    const formattedSections = sections.map((section: FormSection) => ({
      id: section.id,
      title: section.title,
      fields: section.fields.map((field: CustomField) => ({
        type: field.type,
        label: field.label,
        name: field.name,
        required: field.required,
        placeholder: field.placeholder || '',
        max_value: field.max_value || null
      }))
    }));

    const totalBudget = calculateTotalBudget();

    const submissionData = {
      id: scholarshipId,
      title: formData.title,
      description: formData.description,
      deadline: formData.deadline,
      status: formData.status,
      student_types: formData.student_types,
      form_sections: formattedSections,
      scoring_criteria: scoringCriteria,
      number_of_awards: formData.scholarship_mode === 'single' ? formData.number_of_awards : 0,
      scholarship_mode: formData.scholarship_mode,
      tiers: tiers,
      budget_allocated: totalBudget,
      budget_status: 'pending'
    };

    console.log('📤 Submitting budget:', totalBudget);

    try {
      const response = await fetch(`/api/scholarships/${scholarshipId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update scholarship');
      }
      // ✅ AUDIT LOG: Scholarship Updated
await createAuditLog({
  adminId: user?.id || '',
  adminName: user?.name || 'Unknown',
  adminEmail: user?.email || '',
  adminRole: user?.role || 'reviewer',
  action: 'UPDATE',
  entityType: 'SCHOLARSHIP',
  entityId: parseInt(scholarshipId),
  entityName: formData.title,
  changes: `Updated scholarship: ${formData.title} (${formData.scholarship_mode} mode, Budget: Rs. ${totalBudget.toLocaleString()})`,
  userAgent: navigator.userAgent
});

toast.success('Scholarship updated successfully!');

      toast.success('Scholarship updated successfully!');
      setTimeout(() => {
        router.push('/admin/scholarships?updated=true');
      }, 1000);

    } catch (err: any) {
      setError(err.message);
      toast.error(`Failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const totalBudget = calculateTotalBudget();

  if (fetchLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">Loading scholarship...</div>
        </div>
      </div>
    );
  }

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
            <h1 className="text-3xl font-bold text-gray-900">Edit Scholarship</h1>
            <p className="text-gray-600 mt-2">Update scholarship program details</p>
          </div>
        </div>

        <div className="flex gap-4 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'details'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Scholarship Details
          </button>
          <button
            onClick={() => setActiveTab('criteria')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'criteria'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Scoring Criteria {scoringCriteria.length > 0 && `(${scoringCriteria.length})`}
          </button>
          <button
            onClick={() => setActiveTab('tiers')}
            className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'tiers'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Layers size={16} />
            Tiers {formData.scholarship_mode === 'tiered' && tiers.length > 0 && `(${tiers.length})`}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {activeTab === 'details' ? (
            <div className="space-y-6">
              {/* Scholarship Mode */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <label className="block text-sm font-medium text-gray-700 mb-3">Scholarship Award Type</label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="scholarship_mode"
                      value="single"
                      checked={formData.scholarship_mode === 'single'}
                      onChange={(e) => setFormData(prev => ({ ...prev, scholarship_mode: e.target.value }))}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-gray-700">Single Scholarship</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="scholarship_mode"
                      value="tiered"
                      checked={formData.scholarship_mode === 'tiered'}
                      onChange={(e) => setFormData(prev => ({ ...prev, scholarship_mode: e.target.value }))}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-gray-700">Tiered Scholarship</span>
                  </label>
                </div>
              </div>

              {formData.scholarship_mode === 'single' && (
                <>
                  <div>
                    <label htmlFor="number_of_awards" className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Scholarships to Award *
                    </label>
                    <input
                      type="number"
                      id="number_of_awards"
                      name="number_of_awards"
                      value={formData.number_of_awards}
                      onChange={handleChange}
                      min="1"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Award Amount per Student *
                    </label>
                    <input
                      type="number"
                      value={budgetData.award_amount}
                      onChange={(e) => setBudgetData({ ...budgetData, award_amount: parseInt(e.target.value) || 0 })}
                      min="1"
                      placeholder="e.g., 50000"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                </>
              )}

              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Scholarship Title *
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g., Need-Based Scholarship 2024"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description & Details *
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={8}
                  placeholder="Include all details like eligibility, benefits, etc."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-vertical"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Student Types *
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.student_types.includes('undergraduate')}
                      onChange={(e) => handleStudentTypeChange('undergraduate', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-gray-700">Undergraduate Students</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.student_types.includes('graduate')}
                      onChange={(e) => handleStudentTypeChange('graduate', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-gray-700">Graduate Students</span>
                  </label>
                </div>
              </div>

              {/* FORM SECTIONS BUILDER */}
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
                <p className="text-sm text-gray-500 mb-4">Each section becomes a tab in the student application form.</p>

                {sections.map((section: FormSection, sectionIndex: number) => (
                  <div key={section.id} className="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50">
                    <div className="flex items-center gap-3 mb-3">
                      <input
                        type="text"
                        value={section.title}
                        onChange={(e) => updateSectionTitle(sectionIndex, e.target.value)}
                        placeholder="Section Title"
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
                      {section.fields.map((field: CustomField, fieldIndex: number) => (
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

              {/* Budget Summary */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h4 className="font-semibold text-gray-700 mb-2">Budget Summary</h4>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Budget Required:</span>
                  <span className="text-xl font-bold text-blue-600">Rs. {totalBudget.toLocaleString()}</span>
                </div>
                {formData.scholarship_mode === 'single' && formData.number_of_awards > 0 && budgetData.award_amount > 0 && (
                  <div className="text-sm text-gray-500 mt-1">
                    {formData.number_of_awards} students × Rs. {budgetData.award_amount.toLocaleString()} = Rs. {totalBudget.toLocaleString()}
                  </div>
                )}
                {formData.scholarship_mode === 'tiered' && tiers.length > 0 && (
                  <div className="text-sm text-gray-500 mt-1">
                    {tiers.filter(t => t.award_amount_numeric && t.award_amount_numeric > 0).length} tiers with amounts
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-2">Budget will be pending approval after merit list generation</p>
              </div>

              {/* Deadline & Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="deadline" className="block text-sm font-medium text-gray-700 mb-2">
                    Application Deadline *
                  </label>
                  <input
                    type="date"
                    id="deadline"
                    name="deadline"
                    value={formData.deadline}
                    onChange={handleChange}
                    min={today}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    id="status"
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
            </div>
          ) : activeTab === 'criteria' ? (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-blue-800 mb-2">How Scoring Works</h3>
                <p className="text-sm text-blue-700">
                  Add criteria based on the form fields above. Each criterion gets a weight percentage.
                  Total must equal 100%.
                </p>
              </div>

              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Scoring Criteria</h3>
                  <button
                    type="button"
                    onClick={addCriterion}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Plus size={18} />
                    Add Criterion
                  </button>
                </div>

                {scoringCriteria.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                    <Award size={40} className="mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-500">No scoring criteria added yet.</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4 mb-4">
                      {scoringCriteria.map((criterion: ScoringCriterion, index: number) => {
                        const allFields = getAllFormFields();
                        return (
                          <div key={criterion.id} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                            <div className="flex-1">
                              <select
                                value={criterion.fieldName}
                                onChange={(e) => updateCriterion(index, 'fieldName', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">Select a field</option>
                                {allFields.map((field: FormFieldOption) => (
                                  <option key={field.name} value={field.name}>
                                    {field.label} ({field.type})
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="w-32">
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={criterion.weight}
                                  onChange={(e) => updateCriterion(index, 'weight', parseInt(e.target.value) || 0)}
                                  className="w-20 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                  placeholder="%"
                                />
                                <span className="text-gray-600">%</span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeCriterion(index)}
                              className="bg-red-600 text-white p-2 rounded hover:bg-red-700 transition-colors"
                              title="Remove"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    <div className={`p-4 rounded-lg ${
                      totalWeight === 100
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-yellow-50 border border-yellow-200'
                    }`}>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Total Weight:</span>
                        <span className={`text-xl font-bold ${
                          totalWeight === 100 ? 'text-green-700' : 'text-yellow-700'
                        }`}>
                          {totalWeight}%
                        </span>
                      </div>
                      {totalWeight !== 100 && (
                        <p className="text-sm text-yellow-700 mt-1">
                          Total must equal 100%. Currently {totalWeight}%.
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {formData.scholarship_mode !== 'tiered' ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                  <p className="text-yellow-800">
                    This scholarship is in Single mode. To use tiers, go to Details tab and change Award Type to "Tiered Scholarship".
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                      <Layers size={20} />
                      Scholarship Tiers
                    </h3>
                    <button
                      type="button"
                      onClick={addTier}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <Plus size={18} />
                      Add Tier
                    </button>
                  </div>

                  {tiers.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                      <p className="text-gray-500">No tiers added yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {tiers.map((tier: Tier, index: number) => (
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
                              <label className="block text-xs font-medium text-gray-700 mb-1">Award Amount</label>
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
                </>
              )}
            </div>
          )}

          <div className="flex gap-4 pt-6 border-t border-gray-200 mt-6">
            <button
              type="button"
              onClick={() => router.back()}
              disabled={loading}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={20} />
              {loading ? 'Updating...' : 'Update Scholarship'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}