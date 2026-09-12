'use client';
import { supabase } from '@/lib/supabaseClient';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Award, 
  Calendar, 
  Settings, 
  ChevronRight,
  Users,
  CheckCircle,
  Clock,
  Filter
} from 'lucide-react';



interface ScholarshipWithStats {
  id: string;
  title: string;
  deadline: string;
  status: string;
  scoring_criteria: any;
  merit_list_generated: boolean;
  number_of_awards: number;
  student_types: string[];
  _count?: {
    applications: number;
    approved_applications: number;
  };
  merit_list?: {
    selected: number;
    total: number;
  };
}

export default function MeritListsPage() {
  const [scholarships, setScholarships] = useState<ScholarshipWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchScholarships();
  }, []);

  const fetchScholarships = async () => {
    try {
      // Fetch all scholarships
      const { data: scholarshipsData, error: scholarshipsError } = await supabase
        .from('scholarships')
        .select('*')
        .order('created_at', { ascending: false });

      if (scholarshipsError) throw scholarshipsError;

      // For each scholarship, get counts
      const scholarshipsWithStats = await Promise.all(
        (scholarshipsData || []).map(async (scholarship) => {
          // Get application counts
          const { count: totalApps } = await supabase
            .from('scholarship_applications')
            .select('*', { count: 'exact', head: true })
            .eq('scholarship_id', scholarship.id);

          const { count: approvedApps } = await supabase
            .from('scholarship_applications')
            .select('*', { count: 'exact', head: true })
            .eq('scholarship_id', scholarship.id)
            .eq('status', 'approved');

          // Get merit list stats if generated
          let meritStats = null;
          if (scholarship.merit_list_generated) {
            const { data: meritData } = await supabase
              .from('merit_lists')
              .select('status')
              .eq('scholarship_id', scholarship.id);

            if (meritData) {
              meritStats = {
                total: meritData.length,
                selected: meritData.filter(m => m.status === 'selected' || m.status === 'awarded').length
              };
            }
          }

          return {
            ...scholarship,
            _count: {
              applications: totalApps || 0,
              approved_applications: approvedApps || 0
            },
            merit_list: meritStats
          };
        })
      );

      setScholarships(scholarshipsWithStats);
    } catch (error) {
      console.error('Error fetching scholarships:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredScholarships = scholarships.filter(s => {
    if (filter === 'all') return true;
    if (filter === 'criteria-set') return s.scoring_criteria && s.scoring_criteria.length > 0;
    if (filter === 'merit-generated') return s.merit_list_generated;
    if (filter === 'no-criteria') return !s.scoring_criteria || s.scoring_criteria.length === 0;
    return true;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isDeadlinePassed = (deadline: string) => {
    return new Date(deadline) < new Date();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">Loading merit lists...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Merit Lists</h1>
            <p className="text-gray-600 mt-2">Manage and generate merit lists for scholarships</p>
          </div>
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-gray-500" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Scholarships</option>
              <option value="criteria-set">Criteria Set</option>
              <option value="merit-generated">Merit Generated</option>
              <option value="no-criteria">No Criteria</option>
            </select>
          </div>
        </div>

        {/* Scholarships Grid */}
        {filteredScholarships.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Award size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No scholarships found</h3>
            <p className="text-gray-600">
              Create a scholarship first to start generating merit lists.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {filteredScholarships.map((scholarship) => (
              <div
                key={scholarship.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Card Header */}
                <div className="p-6 border-b border-gray-100">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-lg text-gray-900 line-clamp-2 flex-1">
                      {scholarship.title}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ml-2 ${
                      scholarship.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {scholarship.status}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar size={16} />
                    <span>Deadline: {formatDate(scholarship.deadline)}</span>
                    {isDeadlinePassed(scholarship.deadline) && (
                      <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">
                        Passed
                      </span>
                    )}
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4 p-6 bg-gray-50">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {scholarship._count?.applications || 0}
                    </div>
                    <div className="text-xs text-gray-600">Total Apps</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {scholarship._count?.approved_applications || 0}
                    </div>
                    <div className="text-xs text-gray-600">Approved</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {scholarship.number_of_awards || 0}
                    </div>
                    <div className="text-xs text-gray-600">Awards</div>
                  </div>
                </div>

                {/* Criteria Status */}
                <div className="px-6 py-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Settings size={16} className="text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Scoring Criteria:</span>
                    {scholarship.scoring_criteria && scholarship.scoring_criteria.length > 0 ? (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        {scholarship.scoring_criteria.length} criteria set
                      </span>
                    ) : (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                        Not set
                      </span>
                    )}
                  </div>

                  {/* Merit Status */}
                  {scholarship.merit_list_generated && scholarship.merit_list && (
                    <div className="flex items-center justify-between text-sm mb-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle size={16} className="text-green-500" />
                        <span>Merit List Generated</span>
                      </div>
                      <div className="text-gray-600">
                        {scholarship.merit_list.selected} / {scholarship.merit_list.total} selected
                      </div>
                    </div>
                  )}

                  {/* Progress Bar (if merit generated) */}
                  {scholarship.merit_list_generated && scholarship.merit_list && (
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                      <div 
                        className="bg-green-600 h-2 rounded-full"
                        style={{ 
                          width: `${(scholarship.merit_list.selected / scholarship.merit_list.total) * 100}%` 
                        }}
                      />
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    {!scholarship.scoring_criteria || scholarship.scoring_criteria.length === 0 ? (
                      <Link
                        href={`/admin/scholarships/${scholarship.id}?tab=criteria`}
                        className="flex-1 bg-blue-600 text-white text-center px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        Set Criteria
                      </Link>
                    ) : !scholarship.merit_list_generated ? (
                      <Link
                        href={`/admin/merit/${scholarship.id}`}
                        className="flex-1 bg-gray-800 text-white text-center px-4 py-2 rounded-lg hover:bg-gray-900 transition-colors text-sm font-medium"
                      >
                        Generate Merit
                      </Link>
                    ) : (
                      <Link
                        href={`/admin/merit/${scholarship.id}`}
                        className="flex-1 bg-purple-600 text-white text-center px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium flex items-center justify-center gap-1"
                      >
                        View List <ChevronRight size={16} />
                      </Link>
                    )}
                    
                    <Link
                      href={`/admin/scholarships/${scholarship.id}`}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                    >
                      Edit
                    </Link>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-500">
                  <Users size={14} />
                  <span>For: {scholarship.student_types?.join(', ') || 'All students'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}