'use client';
import { supabase } from '@/lib/supabaseClient';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Award, 
  Download, 
  Eye, 
  Calendar,
  Users,
  BarChart3,
  CheckCircle,
  Clock,
  XCircle,
  Loader2
} from 'lucide-react';



interface MeritList {
  id: string;
  scholarship_id: string;
  scholarship_title: string;
  rank: number;
  total_score: number;
  status: 'selected' | 'waitlist' | 'awarded' | 'pending';
  total_applicants: number;
  generated_at: string;
  cutoff_score?: number;
}

export default function StudentMeritListsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [meritLists, setMeritLists] = useState<MeritList[]>([]);
  const [studentRegNo, setStudentRegNo] = useState('');
  const [studentName, setStudentName] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  // Check authentication and load data
  useEffect(() => {
    const regNo = localStorage.getItem('studentRegno');
    const name = localStorage.getItem('studentName') || 'Student';
    
    if (!regNo) {
      router.push('/student/login');
      return;
    }
    
    setStudentRegNo(regNo);
    setStudentName(name);
    fetchMeritLists(regNo);

    // Listen for storage changes (logout in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'studentRegno' && !e.newValue) {
        router.push('/student/login');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const fetchMeritLists = async (regNo: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/student/merit?studentRegNo=${regNo}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch merit lists');
      }
      
      if (data.success) {
        setMeritLists(data.meritLists || []);
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching merit lists:', err);
    } finally {
      setLoading(false);
    }
  };

  const viewMeritList = (scholarshipId: string) => {
    router.push(`/student/merit-list/${scholarshipId}`);
  };

const downloadMeritList = async (scholarshipId: string, title: string) => {
  try {
    const response = await fetch(`/api/student/merit/download?scholarshipId=${scholarshipId}`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to download');
    }

    // Update headers to include Student Name
    const headers = ['Rank', 'Student Name', 'Reg No', 'Score', 'Status'];
    const rows = data.meritList.map((item: any) => [
      item.rank,
      item.student_name || item.student_regno, // Add student name here
      item.student_regno,
      item.total_score,
      item.status
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `merit-list-${title.replace(/\s+/g, '-')}.csv`;
    a.click();

  } catch (err: any) {
    alert('Error downloading: ' + err.message);
  }
};

  const handleLogout = () => {
    // Clear all student data from localStorage
    localStorage.removeItem('studentRegno');
    localStorage.removeItem('studentName');
    localStorage.removeItem('studentToken');
    localStorage.removeItem('studentAvatar');
    localStorage.removeItem('studentLevel');
    localStorage.removeItem('studentEmail');
    localStorage.removeItem('isAuthenticated');
    router.push('/student/login');
  };

const getStatusBadge = (status: string) => {
  const baseClass = "px-3 py-1 text-xs rounded-full font-medium flex items-center gap-1 w-fit";
  
  switch(status) {
    case 'awarded':
      return <span className={`${baseClass} bg-purple-100 text-purple-800`}><Award size={12} /> Awarded</span>;
    case 'selected':
      return <span className={`${baseClass} bg-green-100 text-green-800`}><CheckCircle size={12} /> Selected</span>;
    case 'waitlist':
      return <span className={`${baseClass} bg-yellow-100 text-yellow-800`}><Clock size={12} /> Waitlist</span>;
    default:
      return <span className={`${baseClass} bg-gray-100 text-gray-800`}>Pending</span>;
  }
}

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredLists = selectedFilter === 'all' 
    ? meritLists 
    : meritLists.filter(list => list.status === selectedFilter);

  const stats = {
    total: meritLists.length,
    selected: meritLists.filter(l => l.status === 'selected' || l.status === 'awarded').length,
    waitlist: meritLists.filter(l => l.status === 'waitlist').length,
    pending: meritLists.filter(l => l.status === 'pending').length
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <span className="ml-3 text-gray-600">Loading your merit lists...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header with Student Info */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <Award className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">My Merit Lists</h1>
                <p className="text-gray-600">
                  Welcome, {studentName} {studentRegNo ? `(${studentRegNo})` : ''}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => studentRegNo && fetchMeritLists(studentRegNo)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        {meritLists.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="text-sm text-gray-600">Total Scholarships</div>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="text-sm text-gray-600">Selected</div>
              <div className="text-2xl font-bold text-green-600">{stats.selected}</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="text-sm text-gray-600">Waitlist</div>
              <div className="text-2xl font-bold text-yellow-600">{stats.waitlist}</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="text-sm text-gray-600">Pending</div>
              <div className="text-2xl font-bold text-gray-600">{stats.pending}</div>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        {meritLists.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedFilter('all')}
                className={`px-4 py-2 rounded-lg ${
                  selectedFilter === 'all' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All ({stats.total})
              </button>
              <button
                onClick={() => setSelectedFilter('selected')}
                className={`px-4 py-2 rounded-lg ${
                  selectedFilter === 'selected' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Selected ({stats.selected})
              </button>
              <button
                onClick={() => setSelectedFilter('waitlist')}
                className={`px-4 py-2 rounded-lg ${
                  selectedFilter === 'waitlist' 
                    ? 'bg-yellow-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Waitlist ({stats.waitlist})
              </button>
              <button
                onClick={() => setSelectedFilter('pending')}
                className={`px-4 py-2 rounded-lg ${
                  selectedFilter === 'pending' 
                    ? 'bg-gray-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Pending ({stats.pending})
              </button>
            </div>
          </div>
        )}

        {/* Congratulations Banner */}
        {stats.selected > 0 && (
          <div className="mb-6 bg-green-200 border border-green-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <h3 className="text-lg font-semibold text-green-800">Congratulations!</h3>
            </div>
            <p className="text-green-700">
              You have been selected for {stats.selected} scholarship{stats.selected > 1 ? 's' : ''}. 
              Please check your email for further instructions on the award process.
            </p>
          </div>
        )}

        {/* Merit Lists Grid */}
        {filteredLists.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <Award size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Merit Lists Found</h3>
            <p className="text-gray-600 mb-6">
              {meritLists.length === 0 
                ? "You haven't been included in any merit lists yet. Apply for scholarships and check back later."
                : `No ${selectedFilter} merit lists found.`}
            </p>
            {meritLists.length === 0 && (
              <button
                onClick={() => router.push('/student/scholarships')}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
              >
                Browse Scholarships
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLists.map((list) => (
              <div key={list.id} className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 text-lg line-clamp-2">
                        {list.scholarship_title}
                      </h3>
                      <p className="text-gray-500 text-sm mt-1">
                        Generated: {formatDate(list.generated_at)}
                      </p>
                    </div>
                    {getStatusBadge(list.status)}
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Award size={16} className="text-blue-500" />
                        <span>Your Rank</span>
                      </div>
                      <span className="font-bold text-xl text-blue-600">#{list.rank}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-gray-600">
                        <BarChart3 size={16} className="text-green-500" />
                        <span>Your Score</span>
                      </div>
                      <span className="font-semibold">{list.total_score.toFixed(1)}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Users size={16} className="text-purple-500" />
                        <span>Total Seats</span>
                      </div>
                      <span className="font-semibold">{list.total_applicants}</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => viewMeritList(list.scholarship_id)}
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Eye size={18} />
                      View Details
                    </button>
                    <button
                      onClick={() => downloadMeritList(list.scholarship_id, list.scholarship_title)}
                      className="flex items-center justify-center gap-2 border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                      title="Download CSV"
                    >
                      <Download size={18} />
                    </button>
                  </div>
                </div>

                <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock size={14} />
                    <span>Last updated: {formatDate(list.generated_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}