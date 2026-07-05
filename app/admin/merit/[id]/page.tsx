'use client';
import React from 'react';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Download,
  Award,
  ChevronDown,
  ChevronUp,
  Mail,
  Eye,
  Filter,
  Search,
  RefreshCw,
  Printer
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { createClient } from '@supabase/supabase-js';
// import toast, { Toaster } from 'react-hot-toast';
// import { createClient } from '@supabase/supabase-js';
import { useAuth } from '@/app/contexts/AuthContext';
import { createAuditLog } from '@/lib/audit';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface MeritEntry {
  id: string;
  rank: number;
  student_regno: string;
  total_score: number;
  status: 'selected' | 'waitlist' | 'awarded' | 'pending';
  score_breakdown: Record<string, number>;
  application_data?: any;
  award_tier?: string;
  award_description?: string;
}

interface Scholarship {
  id: string;
  title: string;
  number_of_awards: number;
  scoring_criteria: any[];
  scholarship_mode?: string;
}

export default function MeritListDetailPage() {
  const params = useParams();
  const router = useRouter();
  const scholarshipId = params.id as string;
    const { user } = useAuth();


  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [scholarship, setScholarship] = useState<Scholarship | null>(null);
  const [meritList, setMeritList] = useState<MeritEntry[]>([]);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  // const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);

  const isTiered = scholarship?.scholarship_mode === 'tiered';

  useEffect(() => {
    fetchData();
  }, [scholarshipId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: scholarshipData, error: scholarshipError } = await supabase
        .from('scholarships')
        .select('id, title, number_of_awards, scoring_criteria, scholarship_mode')
        .eq('id', scholarshipId)
        .single();

      if (scholarshipError) throw scholarshipError;
      setScholarship(scholarshipData);

      const { data: meritData, error: meritError } = await supabase
        .from('merit_lists')
        .select('*, award_tier, award_description')
        .eq('scholarship_id', scholarshipId)
        .order('rank', { ascending: true });

      if (meritError) throw meritError;

      const meritWithNames = await Promise.all(
        (meritData || []).map(async (entry) => {
          const { data: appData } = await supabase
            .from('scholarship_applications')
            .select('application_data')
            .eq('scholarship_id', scholarshipId)
            .eq('student_regno', entry.student_regno)
            .maybeSingle();

          return {
            ...entry,
            application_data: appData?.application_data || {}
          };
        })
      );

      setMeritList(meritWithNames);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateMeritList = async () => {
    setGenerating(true);
    try {
      const response = await fetch('/api/admin/merit/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scholarshipId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate merit list');
      }

      toast.success('Merit list generated', {
        duration: 3000,
        position: 'top-center',
        style: {
          background: '#dcfce7',
          color: '#166534',
          borderRadius: '8px',
          padding: '10px 16px',
        },
      });

      fetchData();

      
      // ✅ AUDIT LOG: Merit List Generated
      await createAuditLog({
        adminId: user?.id || '',
        adminName: user?.name || 'Unknown',
        adminEmail: user?.email || '',
        adminRole: user?.role || 'reviewer',
        action: 'GENERATE',
        entityType: 'MERIT_LIST',
        entityId: parseInt(scholarshipId),
        entityName: `Merit List - ${scholarship?.title || 'Unknown'}`,
        changes: `Generated merit list for ${scholarship?.title || 'Unknown'}`,
        userAgent: navigator.userAgent
      });

    } catch (err: any) {
      toast.error(`Failed: ${err.message}`, {
        duration: 3000,
        position: 'top-center',
        style: {
          background: '#fee2e2',
          color: '#991b1b',
          borderRadius: '8px',
          padding: '10px 16px',
        },
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerateClick = () => {
    toast.dismiss();
    toast(
      (t) => (
        <div className="text-center">
          <p className="font-bold text-yellow-600 mb-2">Regenerate Merit List?</p>
          <p className="text-sm text-gray-600 mb-3">This will replace the existing merit list.</p>
          <p className="text-xs text-red-500 font-semibold mb-4">⚠️ Previous selections will be lost!</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                toast.dismiss(t.id);
                confirmRegenerate();
              }}
              className="px-4 py-1.5 bg-yellow-600 text-white rounded-lg text-sm hover:bg-yellow-700 min-w-[100px]"
            >
              Regenerate
            </button>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-4 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 min-w-[80px]"
            >
              Cancel
            </button>
          </div>
        </div>
      ),
      {
        duration: 8000,
        position: 'top-center',
        style: {
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          maxWidth: '340px',
        },
      }
    );
  };

  const confirmRegenerate = async () => {
    setGenerating(true);
    try {
      const response = await fetch('/api/admin/merit/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scholarshipId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to regenerate merit list');
      }

      toast.dismiss();
      toast.success('Merit list regenerated', {
        duration: 3000,
        position: 'top-center',
        style: {
          background: '#dcfce7',
          color: '#166534',
          borderRadius: '8px',
          padding: '10px 16px',
        },
      });

      fetchData();

            // ✅ AUDIT LOG: Merit List Regenerated
      await createAuditLog({
        adminId: user?.id || '',
        adminName: user?.name || 'Unknown',
        adminEmail: user?.email || '',
        adminRole: user?.role || 'reviewer',
        action: 'REGENERATE',
        entityType: 'MERIT_LIST',
        entityId: parseInt(scholarshipId),
        entityName: `Merit List - ${scholarship?.title || 'Unknown'}`,
        changes: `Regenerated merit list for ${scholarship?.title || 'Unknown'}`,
        userAgent: navigator.userAgent
      });

    } catch (err: any) {
      toast.dismiss();
      toast.error(`Failed: ${err.message}`, {
        duration: 3000,
        position: 'top-center',
        style: {
          background: '#fee2e2',
          color: '#991b1b',
          borderRadius: '8px',
          padding: '10px 16px',
        },
      });
    } finally {
      setGenerating(false);
    }
  };

  const updateStatus = async (entryId: string, newStatus: string) => {
    try {
      const currentEntry = meritList.find(m => m.id === entryId);

      const { error } = await supabase
        .from('merit_lists')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', entryId);

      if (error) throw error;

      setMeritList(prev =>
        prev.map(item =>
          item.id === entryId ? { ...item, status: newStatus as any } : item
        )
      );

      if (currentEntry && currentEntry.student_regno) {
        let notificationTitle = '';
        let notificationMessage = '';

        if (newStatus === 'selected') {
          notificationTitle = 'Congratulations! Status Updated';
          notificationMessage = `You have been SELECTED for "${scholarship?.title}". ${currentEntry.award_tier ? `Awarded: ${currentEntry.award_tier} - ${currentEntry.award_description}` : ''}`;
        } else if (newStatus === 'waitlist') {
          notificationTitle = 'Status Updated';
          notificationMessage = `You have been moved to WAITLIST for "${scholarship?.title}".`;
        } else if (newStatus === 'awarded') {
          notificationTitle = 'Scholarship Awarded';
          notificationMessage = `Congratulations! "${scholarship?.title}" has been AWARDED to you.`;
        } else if (newStatus === 'pending') {
          notificationTitle = 'Status Updated';
          notificationMessage = `Your application for "${scholarship?.title}" is now PENDING review.`;
        }

        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: currentEntry.student_regno,
            user_type: 'student',
            type: 'status_updated',
            title: notificationTitle,
            message: notificationMessage,
            data: {
              scholarshipId: scholarshipId,
              scholarshipTitle: scholarship?.title,
              status: newStatus,
              rank: currentEntry.rank,
              award_tier: currentEntry.award_tier,
              award_description: currentEntry.award_description
            },
            is_read: false,
            created_at: new Date().toISOString()
          });

        if (notifError) {
          console.error('Failed to send notification:', notifError);
        }
      }

    } catch (err: any) {
      alert('Error updating status: ' + err.message);
    }
  };

  const exportAsCSV = () => {
    let headers = ['Rank', 'Student Name', 'Reg No', 'Total Score', 'Status'];
    if (isTiered) {
      headers = ['Rank', 'Student Name', 'Reg No', 'Total Score', 'Awarded Tier', 'Benefit', 'Status'];
    }

    const rows = filteredMeritList.map(item => {
      const baseRow = [
        item.rank,
        item.application_data?.student_name || 'Unknown',
        item.student_regno,
        item.total_score,
        item.status
      ];
      if (isTiered) {
        return [
          item.rank,
          item.application_data?.student_name || 'Unknown',
          item.student_regno,
          item.total_score,
          item.award_tier || '-',
          item.award_description || '-',
          item.status
        ];
      }
      return baseRow;
    });

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `merit-list-${scholarship?.title.replace(/\s+/g, '-')}.csv`;
    a.click();
  };

  const printMeritList = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow pop-ups to print');
      return;
    }

    const logoUrl = `${window.location.protocol}//${window.location.host}/images/comsats.jpg`;

    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const styles = `
      <style>
        @media print {
          body { margin: 0; padding: 0; }
          @page { size: A4; margin: 1.5cm; }
        }
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Times New Roman', Times, serif;
          background: white;
          padding: 20px;
        }
        .header {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #1a5276;
          padding-bottom: 20px;
        }
        .logo-title-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
          margin-bottom: 5px;
        }
        .logo {
          max-width: 70px;
          max-height: 70px;
        }
        .university-name {
          font-size: 22px;
          font-weight: bold;
          color: #1a5276;
        }
        .campus-name {
          font-size: 14px;
          color: #2c3e50;
          text-align: center;
        }
        .document-title {
          font-size: 20px;
          font-weight: bold;
          text-align: center;
          margin: 25px 0 10px 0;
          text-transform: uppercase;
          color: #1a5276;
        }
        .scholarship-info {
          text-align: center;
          margin: 20px 0;
          padding: 10px;
          background: #f8f9fa;
        }
        .scholarship-title {
          font-size: 18px;
          font-weight: bold;
        }
        .meta-info {
          font-size: 12px;
          color: #7f8c8d;
          margin-top: 5px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        th {
          background: #1a5276;
          color: white;
          padding: 10px;
          text-align: center;
          font-size: 13px;
        }
        td {
          padding: 8px;
          text-align: center;
          border-bottom: 1px solid #ddd;
          font-size: 12px;
        }
        .footer-stats {
          display: flex;
          justify-content: space-between;
          margin: 20px 0;
          padding-top: 10px;
          border-top: 1px solid #ddd;
        }
        .signatures {
          display: flex;
          justify-content: space-between;
          margin-top: 40px;
        }
        .signature-box {
          text-align: center;
          width: 250px;
        }
        .signature-line {
          border-top: 1px solid black;
          margin-top: 40px;
          padding-top: 5px;
        }
        .disclaimer {
          text-align: center;
          font-size: 10px;
          color: gray;
          margin-top: 20px;
        }
        .selected {
          color: #27ae60;
          font-weight: bold;
        }
        .waitlist {
          color: #e67e22;
          font-weight: bold;
        }
        .awarded {
          color: #8e44ad;
          font-weight: bold;
        }
      </style>
    `;

    let tableHeaders = `
      <th>Rank</th>
      <th>Student Name</th>
      <th>Registration No</th>
      <th>Score</th>
    `;

    if (isTiered) {
      tableHeaders += `
        <th>Awarded Tier</th>
        <th>Benefit</th>
      `;
    }
    tableHeaders += `<th>Status</th>`;

    let tableRows = '';
    if (isTiered) {
      tableRows = filteredMeritList.map(item => {
        let statusClass = '';
        if (item.status === 'selected') statusClass = 'selected';
        else if (item.status === 'waitlist') statusClass = 'waitlist';
        else if (item.status === 'awarded') statusClass = 'awarded';

        return `
          <tr>
            <td><b>${item.rank}</b></td>
            <td>${item.application_data?.student_name || 'Unknown Student'}</td>
            <td>${item.student_regno}</td>
            <td><b>${item.total_score.toFixed(1)}%</b></td>
            <td>${item.award_tier || '-'}</td>
            <td>${item.award_description || '-'}</td>
            <td class="${statusClass}">${item.status.toUpperCase()}</td>
          </tr>
        `;
      }).join('');
    } else {
      tableRows = filteredMeritList.map(item => {
        let statusClass = '';
        if (item.status === 'selected') statusClass = 'selected';
        else if (item.status === 'waitlist') statusClass = 'waitlist';
        else if (item.status === 'awarded') statusClass = 'awarded';

        return `
          <tr>
            <td><b>${item.rank}</b></td>
            <td>${item.application_data?.student_name || 'Unknown Student'}</td>
            <td>${item.student_regno}</td>
            <td><b>${item.total_score.toFixed(1)}%</b></td>
            <td class="${statusClass}">${item.status.toUpperCase()}</td>
          </tr>
        `;
      }).join('');
    }

    const selectedCount = filteredMeritList.filter(m => m.status === 'selected' || m.status === 'awarded').length;
    const totalApplicants = filteredMeritList.length;
    const waitlistCount = filteredMeritList.filter(m => m.status === 'waitlist').length;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Merit List - ${scholarship?.title}</title>
          ${styles}
        </head>
        <body>
          <div class="header">
            <div class="logo-title-row">
              <img src="${logoUrl}" alt="COMSATS Logo" class="logo" onerror="this.style.display='none'">
              <div class="university-name">COMSATS UNIVERSITY ISLAMABAD</div>
            </div>
            <div class="campus-name">ABBOTTABAD CAMPUS</div>
          </div>

          <div class="document-title">MERIT LIST</div>
          
          <div class="scholarship-info">
            <div class="scholarship-title">${scholarship?.title}</div>
            <div class="meta-info">Generated: ${currentDate}</div>
          </div>

          <table>
            <thead>
              <tr>${tableHeaders}</tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>

          <div class="footer-stats">
            <span><b>Total Applicants:</b> ${totalApplicants}</span>
            <span><b>Total Selected:</b> ${selectedCount}</span>
            <span><b>Waitlist:</b> ${waitlistCount}</span>
          </div>

          <div class="signatures">
            <div class="signature-box">
              <div class="signature-line"></div>
              <div>Registrar</div>
              <div style="font-size: 11px;">COMSATS University Islamabad</div>
            </div>
            <div class="signature-box">
              <div class="signature-line"></div>
              <div>Director</div>
              <div style="font-size: 11px;">Abbottabad Campus</div>
            </div>
          </div>

          <div class="disclaimer">
            * This is a system generated document. No signature is required. *
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.print();
  };

  const filteredMeritList = meritList.filter(item => {
    const searchTerm = search.toLowerCase();
    const matchesSearch =
      item.student_regno.toLowerCase().includes(searchTerm) ||
      (item.application_data?.student_name || '').toLowerCase().includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'selected': return 'bg-green-100 text-green-800';
      case 'awarded': return 'bg-purple-100 text-purple-800';
      case 'waitlist': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">Loading merit list...</div>
        </div>
      </div>
    );
  }

  const selectedCount = meritList.filter(m => m.status === 'selected' || m.status === 'awarded').length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <Toaster position="top-center" />

        {/* Regenerate Confirmation Modal
        {showRegenerateConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full">
              <div className="text-center">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <RefreshCw className="w-8 h-8 text-yellow-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Regenerate Merit List?</h3>
                <p className="text-gray-600 mb-3">This will replace the existing merit list.</p>
                <p className="text-sm text-red-600 font-semibold mb-4">⚠️ Previous selections will be lost!</p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setShowRegenerateConfirm(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmRegenerate}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                  >
                    Yes, Regenerate
                  </button>
                </div>
              </div>
            </div>
          </div>
        )} */}

        <div className="mb-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={20} />
            Back
          </button>
        </div>

        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Merit List</h1>
            <p className="text-gray-600 mt-2">{scholarship?.title}</p>
            {isTiered && (
              <span className="inline-block mt-1 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                Tiered Scholarship
              </span>
            )}
          </div>

          <div className="flex gap-3">
            {meritList.length > 0 && (
              <button
                onClick={handleRegenerateClick}  // This now shows toast confirmation, not modal
                disabled={generating}
                className="bg-yellow-600 text-white px-6 py-3 rounded-lg hover:bg-yellow-700 transition-colors flex items-center gap-2"
                title="Regenerate merit list after changing criteria"
              >
                <RefreshCw size={20} className={generating ? 'animate-spin' : ''} />
                {generating ? 'Regenerating...' : 'Regenerate Merit List'}
              </button>
            )}

            {meritList.length === 0 ? (
              <button
                onClick={generateMeritList}
                disabled={generating}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <RefreshCw size={20} className={generating ? 'animate-spin' : ''} />
                {generating ? 'Generating...' : 'Generate Merit List'}
              </button>
            ) : (
              <>
                <button
                  onClick={printMeritList}
                  className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  <Printer size={20} />
                  Print
                </button>
                <button
                  onClick={exportAsCSV}
                  className="bg-gray-800 text-white px-6 py-3 rounded-lg hover:bg-gray-900 transition-colors flex items-center gap-2"
                >
                  <Download size={20} />
                  Export CSV
                </button>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {meritList.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="text-sm text-gray-600">Total Applicants</div>
              <div className="text-2xl font-bold text-gray-900">{meritList.length}</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="text-sm text-gray-600">Selected</div>
              <div className="text-2xl font-bold text-green-600">{selectedCount}</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="text-sm text-gray-600">Waitlist</div>
              <div className="text-2xl font-bold text-yellow-600">
                {meritList.filter(m => m.status === 'waitlist').length}
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="text-sm text-gray-600">Top Score</div>
              <div className="text-2xl font-bold text-blue-600">
                {meritList[0]?.total_score.toFixed(1) || 'N/A'}%
              </div>
            </div>
          </div>
        )}

        {meritList.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Award size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Merit List Generated</h3>
            <p className="text-gray-600 mb-6">
              Generate a merit list to see ranked applicants based on scoring criteria.
            </p>
            <button
              onClick={generateMeritList}
              disabled={generating}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
            >
              <RefreshCw size={20} className={generating ? 'animate-spin' : ''} />
              {generating ? 'Generating...' : 'Generate Merit List Now'}
            </button>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Search by name or registration number..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter size={20} className="text-gray-500" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="selected">Selected</option>
                    <option value="waitlist">Waitlist</option>
                    <option value="awarded">Awarded</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Merit List Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
              <table className="w-full min-w-[1000px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-16 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                    <th className="w-48 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Name</th>
                    <th className="w-32 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reg No</th>
                    <th className="w-20 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                    {isTiered && (
                      <>
                        <th className="w-32 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Awarded Tier</th>
                        <th className="w-48 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Benefit</th>
                      </>
                    )}
                    <th className="w-24 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="w-20 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredMeritList.map((entry) => (
                    <React.Fragment key={entry.id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${entry.rank <= 3
                            ? 'bg-yellow-100 text-yellow-800'
                            : entry.status === 'selected' || entry.status === 'awarded'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                            }`}>
                            {entry.rank}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 truncate max-w-[200px]" title={entry.application_data?.student_name || 'Unknown Student'}>
                            {entry.application_data?.student_name || 'Unknown Student'}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-600">{entry.student_regno}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-gray-900">{entry.total_score.toFixed(1)}%</div>
                        </td>
                        {isTiered && (
                          <>
                            <td className="px-4 py-3">
                              <div className="font-semibold text-blue-600">{entry.award_tier || '-'}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm text-gray-600 truncate max-w-[200px]" title={entry.award_description || '-'}>
                                {entry.award_description || '-'}
                              </div>
                            </td>
                          </>
                        )}
                        <td className="px-4 py-3">
                          <select
                            value={entry.status}
                            onChange={(e) => updateStatus(entry.id, e.target.value)}
                            className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(entry.status)} border-none focus:ring-2 focus:ring-blue-500`}
                          >
                            <option value="selected">Selected</option>
                            <option value="waitlist">Waitlist</option>
                            <option value="awarded">Awarded</option>
                            <option value="pending">Pending</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button
                              onClick={() => setExpandedRow(expandedRow === entry.id ? null : entry.id)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="View Score Breakdown"
                            >
                              {expandedRow === entry.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </button>
                            <button
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                              title="View Application"
                              onClick={() => {
                                alert(`Student: ${entry.application_data?.student_name || 'Unknown'}\nReg No: ${entry.student_regno}\nScore: ${entry.total_score}%\nTier: ${entry.award_tier || 'N/A'}\nBenefit: ${entry.award_description || 'N/A'}`);
                              }}
                            >
                              <Eye size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Row - Score Breakdown */}
                      {expandedRow === entry.id && (
                        <tr>
                          <td colSpan={isTiered ? 8 : 6} className="px-4 py-3 bg-blue-50">
                            <div className="p-3 bg-white rounded-lg shadow-inner">
                              <h4 className="font-semibold mb-2 text-sm">Score Breakdown</h4>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {Object.entries(entry.score_breakdown || {}).map(([key, value]: [string, any]) => (
                                  <div key={key} className="text-center p-2 bg-gray-50 rounded-lg">
                                    <div className="text-xs text-gray-600">{key.replace(/_/g, ' ')}</div>
                                    <div className="text-lg font-bold text-blue-600">
                                      {typeof value === 'object' && value !== null ? value.raw : value}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}