'use client';
import { supabase } from '@/lib/supabaseClient';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Calculator, 
  CheckCircle, 
  XCircle, 
  Award,
  Clock,
  User,
  AlertCircle,
  TrendingUp,
  FileCheck,
  ArrowRight,
  Target,
  Sparkles,
  TrendingDown
} from 'lucide-react';



interface Scholarship {
  id: string;
  title: string;
  description: string;
  deadline: string;
  scholarship_mode: string;
  scoring_criteria: any[];
  tiers?: any[];
}

export default function EligibilityPage() {
  const [loading, setLoading] = useState(true);
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [selectedScholarship, setSelectedScholarship] = useState<Scholarship | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, number>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [eligibilityResult, setEligibilityResult] = useState<any>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    fetchScholarships();
  }, []);

  const fetchScholarships = async () => {
    try {
      const { data } = await supabase
        .from('scholarships')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      setScholarships(data || []);
    } catch (error) {
      console.error('Error fetching scholarships:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScholarshipSelect = (scholarshipId: string) => {
    const scholarship = scholarships.find(s => s.id === scholarshipId);
    setSelectedScholarship(scholarship || null);
    setFieldValues({});
    setFieldErrors({});
    setEligibilityResult(null);
  };

  const handleFieldChange = (fieldName: string, value: string, maxValue: number) => {
    const numValue = parseFloat(value);
    
    let error = '';
    let validValue = 0;
    
    if (isNaN(numValue)) {
      error = '';
      validValue = 0;
    } else if (numValue < 0) {
      error = 'Value cannot be negative';
      validValue = 0;
    } else if (numValue > maxValue) {
      error = `Value cannot exceed ${maxValue}`;
      validValue = maxValue;
    } else {
      validValue = numValue;
    }
    
    setFieldValues(prev => ({ ...prev, [fieldName]: validValue }));
    setFieldErrors(prev => ({ ...prev, [fieldName]: error }));
    setEligibilityResult(null);
  };

  const getFieldMaxValue = (fieldName: string): number => {
    const maxValues: Record<string, number> = {
      'fsc_marks': 1100,
      'matric_marks': 1100,
      'nts_score': 100,
      'bachelor_cgpa': 4.0,
      'previous_semester_cgpa': 4.0,
      'entry_test_marks': 100,
      'cgpa': 4.0
    };
    return maxValues[fieldName] || 100;
  };

  const calculateNormalizedScore = () => {
    if (!selectedScholarship) return 0;
    
    let totalWeightedScore = 0;
    let totalWeight = 0;
    
    for (const criterion of selectedScholarship.scoring_criteria) {
      const studentValue = fieldValues[criterion.fieldName] || 0;
      const maxValue = getFieldMaxValue(criterion.fieldName);
      
      const percentage = (studentValue / maxValue) * 100;
      const weightedContribution = (percentage * criterion.weight) / 100;
      totalWeightedScore += weightedContribution;
      totalWeight += criterion.weight;
    }
    
    return totalWeight > 0 ? (totalWeightedScore / totalWeight) * 100 : 0;
  };

  const getEligibilityMessage = (score: number) => {
    if (score >= 85) {
      return {
        title: 'Excellent Chance!',
        message: 'You have a very high chance of getting this scholarship.',
        color: 'text-green-700',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        icon: <Sparkles className="w-4 h-4" />
      };
    } else if (score >= 70) {
      return {
        title: 'Good Chance',
        message: 'You have a good chance. Keep working hard!',
        color: 'text-blue-700',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        icon: <TrendingUp className="w-4 h-4" />
      };
    } else if (score >= 60) {
      return {
        title: 'Fair Chance',
        message: 'You have a fair chance. Consider improving your scores.',
        color: 'text-yellow-700',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        icon: <Target className="w-4 h-4" />
      };
    } else if (score >= 40) {
      return {
        title: 'Low Chance',
        message: 'You have a low chance. Work on improving your grades.',
        color: 'text-orange-700',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        icon: <TrendingDown className="w-4 h-4" />
      };
    } else {
      return {
        title: 'Very Low Chance',
        message: 'You may not qualify. Focus on improving your academic performance.',
        color: 'text-red-700',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        icon: <AlertCircle className="w-4 h-4" />
      };
    }
  };

  const checkEligibility = () => {
    if (!selectedScholarship) return;
    
    const hasErrors = Object.values(fieldErrors).some(error => error !== '');
    if (hasErrors) {
      alert('Please fix the errors before checking eligibility');
      return;
    }
    
    const missingFields = selectedScholarship.scoring_criteria.filter(
      criterion => !fieldValues[criterion.fieldName] && fieldValues[criterion.fieldName] !== 0
    );
    
    if (missingFields.length > 0) {
      setEligibilityResult({
        isEligible: false,
        error: `Please enter: ${missingFields.map(c => c.fieldLabel || c.fieldName).join(', ')}`,
        missingFields: missingFields.map(c => c.fieldLabel || c.fieldName),
        percentage: 0
      });
      return;
    }
    
    setChecking(true);
    
    const finalPercentage = calculateNormalizedScore();
    
    let isEligible = false;
    let tier = null;
    let award = null;
    
    if (selectedScholarship.scholarship_mode === 'tiered' && selectedScholarship.tiers) {
      const matchedTier = selectedScholarship.tiers.find((t: any) => 
        finalPercentage >= t.min_score && finalPercentage <= t.max_score
      );
      if (matchedTier) {
        isEligible = true;
        tier = matchedTier.tier_name;
        award = matchedTier.award_amount;
      }
    } else {
      isEligible = finalPercentage >= 60;
    }
    
    setEligibilityResult({
      isEligible,
      percentage: Math.round(finalPercentage * 100) / 100,
      tier,
      award,
      missingFields: []
    });
    
    setChecking(false);
  };

  const eligibilityMessage = eligibilityResult ? getEligibilityMessage(Number(eligibilityResult.percentage)) : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading scholarships...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        
        {/* Header - Left aligned */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
              <Calculator className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Scholarship Eligibility Checker</h1>
              <p className="text-sm text-gray-500">Select a scholarship and enter your marks to see your chances</p>
            </div>
          </div>
        </div>

        {/* Step 1: Select Scholarship */}
        <div className="bg-white rounded-xl shadow-md p-5 mb-5">
          <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
            {/* <div className="w-6 h-6 bg-blue-100 rounded-md flex items-center justify-center">
              <span className="text-blue-600 text-sm font-bold">1</span>
            </div> */}
            Select a Scholarship
          </h2>
          
          <select
            onChange={(e) => handleScholarshipSelect(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
            defaultValue=""
          >
            <option value="" disabled>-- Choose a scholarship --</option>
            {scholarships.map(s => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
          
          {selectedScholarship && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-xs text-gray-700 line-clamp-2">{selectedScholarship.description || 'No description available'}</p>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                <div className="flex items-center gap-1 text-gray-500">
                  <Clock size={12} />
                  <span>Deadline: {new Date(selectedScholarship.deadline).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1 text-gray-500">
                  <FileCheck size={12} />
                  <span>{selectedScholarship.scholarship_mode === 'tiered' ? 'Tiered' : 'Merit'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Enter Your Marks */}
        {selectedScholarship && (
          <div className="bg-white rounded-xl shadow-md p-5 mb-5">
            <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
              {/* <div className="w-6 h-6 bg-green-100 rounded-md flex items-center justify-center">
                <span className="text-green-600 text-sm font-bold">2</span>
              </div> */}
              Enter Your Marks
            </h2>
            
            <div className="space-y-3">
              {selectedScholarship.scoring_criteria?.map((criterion, idx) => {
                const maxValue = getFieldMaxValue(criterion.fieldName);
                const currentValue = fieldValues[criterion.fieldName] || '';
                const hasError = fieldErrors[criterion.fieldName];
                
                return (
                  <div key={idx} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <div className="flex justify-between items-center mb-1">
                      <label className="font-medium text-gray-700 text-sm">
                        {criterion.fieldLabel || criterion.fieldName}
                        <span className="text-blue-600 text-xs ml-1">({criterion.weight}%)</span>
                      </label>
                      <span className="text-xs text-gray-400">Max: {maxValue}</span>
                    </div>
                    <input
                      type="number"
                      value={currentValue}
                      onChange={(e) => handleFieldChange(criterion.fieldName, e.target.value, maxValue)}
                      placeholder={`Enter ${criterion.fieldLabel || criterion.fieldName}`}
                      className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        hasError ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                      min={0}
                      max={maxValue}
                    />
                    {hasError && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle size={10} />
                        {hasError}
                      </p>
                    )}
                  </div>
                );
              })}
              
              <button
                onClick={checkEligibility}
                disabled={checking}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2.5 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2 text-sm font-medium mt-3 disabled:opacity-50 shadow-sm"
              >
                {checking ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    Check Eligibility
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Results - Compact Design */}
        {eligibilityResult && (
          <div className="rounded-xl shadow-md overflow-hidden">
            {/* Score Card */}
            <div className="bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Your Eligibility Score</p>
                  <p className="text-3xl font-bold text-blue-600">{eligibilityResult.percentage}%</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-md">
                  <Target className="w-6 h-6 text-white" />
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                <div 
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Number(eligibilityResult.percentage))}%` }}
                />
              </div>
            </div>

            {/* Chance Message - Compact */}
            {eligibilityMessage && (
              <div className={`p-3 border-t ${eligibilityMessage.bgColor} ${eligibilityMessage.borderColor}`}>
                <div className="flex items-center gap-2">
                  <div className={`${eligibilityMessage.color}`}>
                    {eligibilityMessage.icon}
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${eligibilityMessage.color}`}>
                      {eligibilityMessage.title}
                    </p>
                    <p className={`text-xs ${eligibilityMessage.color} opacity-80`}>
                      {eligibilityMessage.message}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tier & Award Info */}
            {eligibilityResult.tier && (
              <div className="bg-purple-50 p-3 border-t border-purple-100">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-purple-700">Expected Tier:</span>
                  <span className="text-purple-800 font-semibold">{eligibilityResult.tier}</span>
                </div>
                {eligibilityResult.award && (
                  <div className="flex justify-between items-center text-sm mt-1">
                    <span className="text-purple-700">Award:</span>
                    <span className="text-green-700 font-semibold">{eligibilityResult.award}</span>
                  </div>
                )}
              </div>
            )}

            {/* Action Button */}
            <div className="p-4 bg-gray-50 border-t border-gray-200">
              {Number(eligibilityResult.percentage) >= 70 && eligibilityResult.isEligible ? (
                <Link
                  href={`/student/scholarships/${selectedScholarship?.id}`}
                  className="block w-full bg-gradient-to-r from-green-600 to-green-700 text-white text-center px-4 py-2 rounded-lg hover:from-green-700 hover:to-green-800 transition-all text-sm font-medium"
                >
                  Apply Now →
                </Link>
              ) : Number(eligibilityResult.percentage) >= 50 ? (
                <p className="text-center text-sm text-yellow-700">Work on improving your scores</p>
              ) : (
                <p className="text-center text-sm text-red-600">Try other scholarships</p>
              )}
            </div>
          </div>
        )}

        {/* Tips Section - Compact */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-xs text-blue-700 flex items-center gap-1">
            <AlertCircle size={12} />
            <span>Scores are calculated based on your entered marks and scholarship weightage</span>
          </p>
        </div>
      </div>
    </div>
  );
}