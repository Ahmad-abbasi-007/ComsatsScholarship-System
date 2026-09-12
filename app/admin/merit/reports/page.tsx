'use client';
import { supabase } from '@/lib/supabaseClient';
import { useState, useEffect } from 'react';
import {
  Download,
  FileText,
  BarChart3,
  TrendingUp,
  Users,
  CheckCircle,
  Clock,
  Printer
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';



interface MeritEntry {
  id: string;
  rank: number;
  student_regno: string;
  total_score: number;
  status: string;
  award_tier?: string;
  award_description?: string;
  student_name?: string;
}

interface Scholarship {
  id: string;
  title: string;
  number_of_awards: number;
  scholarship_mode?: string;
}

export default function MeritReportsPage() {
  const [loading, setLoading] = useState(true);
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [selectedScholarship, setSelectedScholarship] = useState<string>('all');
  const [meritList, setMeritList] = useState<MeritEntry[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [selectedScholarshipMode, setSelectedScholarshipMode] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedScholarship) {
      fetchMeritList(selectedScholarship);
      const scholarship = scholarships.find(s => s.id === selectedScholarship);
      setSelectedScholarshipMode(scholarship?.scholarship_mode || null);
    }
  }, [selectedScholarship, scholarships]);

  const fetchData = async () => {
    try {
      const { data: scholarshipsData } = await supabase
        .from('scholarships')
        .select('id, title, number_of_awards, scholarship_mode')
        .order('created_at', { ascending: false });

      setScholarships(scholarshipsData || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMeritList = async (scholarshipId: string) => {
    try {
      let query = supabase
        .from('merit_lists')
        .select('*, award_tier, award_description')
        .order('rank', { ascending: true });

      if (scholarshipId !== 'all') {
        query = query.eq('scholarship_id', scholarshipId);
      }

      const { data: meritData } = await query;

      if (meritData) {
        const meritWithNames = await Promise.all(
          meritData.map(async (entry) => {
            const { data: appData } = await supabase
              .from('scholarship_applications')
              .select('application_data')
              .eq('scholarship_id', entry.scholarship_id)
              .eq('student_regno', entry.student_regno)
              .maybeSingle();

            return {
              ...entry,
              student_name: appData?.application_data?.student_name || entry.student_regno
            };
          })
        );

        setMeritList(meritWithNames);

        const total = meritWithNames.length;
        const selected = meritWithNames.filter(m => m.status === 'selected' || m.status === 'awarded').length;
        const waitlist = meritWithNames.filter(m => m.status === 'waitlist').length;
        const pending = meritWithNames.filter(m => m.status === 'pending').length;
        const avgScore = meritWithNames.reduce((sum, m) => sum + m.total_score, 0) / total || 0;

        setStats({
          total_applications: total,
          total_selected: selected,
          total_waitlist: waitlist,
          total_pending: pending,
          average_score: Number(avgScore.toFixed(2)),
          selection_rate: Number(((selected / total) * 100).toFixed(2)) || 0
        });
      }
    } catch (error) {
      console.error('Error fetching merit list:', error);
    }
  };

  const isTiered = () => {
    if (selectedScholarship === 'all') return false;
    return selectedScholarshipMode === 'tiered';
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

    const scholarshipTitle = selectedScholarship === 'all'
      ? 'All Scholarships'
      : scholarships.find(s => s.id === selectedScholarship)?.title || '';

    const isTieredScholarship = isTiered();

    const styles = `
      <style>
        @media print {
          body { margin: 0; padding: 0; }
          @page { size: A4; margin: 1.5cm; }
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
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
        .logo { max-width: 70px; max-height: 70px; }
        .university-name { font-size: 22px; font-weight: bold; color: #1a5276; }
        .campus-name { font-size: 14px; color: #2c3e50; text-align: center; }
        .document-title { font-size: 20px; font-weight: bold; text-align: center; margin: 25px 0 10px 0; text-transform: uppercase; color: #1a5276; }
        .scholarship-info { text-align: center; margin: 20px 0; padding: 10px; background: #f8f9fa; }
        .scholarship-title { font-size: 18px; font-weight: bold; }
        .meta-info { font-size: 12px; color: #7f8c8d; margin-top: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background: #1a5276; color: white; padding: 10px; text-align: center; font-size: 13px; }
        td { padding: 8px; text-align: center; border-bottom: 1px solid #ddd; font-size: 12px; }
        .footer-stats { display: flex; justify-content: space-between; margin: 20px 0; padding-top: 10px; border-top: 1px solid #ddd; }
        .signatures { display: flex; justify-content: space-between; margin-top: 40px; }
        .signature-box { text-align: center; width: 250px; }
        .signature-line { border-top: 1px solid black; margin-top: 40px; padding-top: 5px; }
        .disclaimer { text-align: center; font-size: 10px; color: gray; margin-top: 20px; }
        .selected { color: #27ae60; font-weight: bold; }
        .waitlist { color: #e67e22; font-weight: bold; }
        .awarded { color: #8e44ad; font-weight: bold; }
      </style>
    `;

    let tableHeaders = `
      <th>Rank</th>
      <th>Student Name</th>
      <th>Registration No</th>
      <th>Score</th>
    `;

    if (isTieredScholarship) {
      tableHeaders += `<th>Awarded Tier</th><th>Benefit</th>`;
    }
    tableHeaders += `<th>Status</th>`;

    let tableRows = '';
    if (isTieredScholarship) {
      tableRows = meritList.map(item => {
        let statusClass = '';
        if (item.status === 'selected') statusClass = 'selected';
        else if (item.status === 'waitlist') statusClass = 'waitlist';
        else if (item.status === 'awarded') statusClass = 'awarded';

        return `
          <tr>
            <td><b>${item.rank}</b></td>
            <td>${item.student_name || item.student_regno}</td>
            <td>${item.student_regno}</td>
            <td><b>${item.total_score.toFixed(1)}%</b></td>
            <td>${item.award_tier || '-'}</td>
            <td>${item.award_description || '-'}</td>
            <td class="${statusClass}">${item.status.toUpperCase()}</td>
          </tr>
        `;
      }).join('');
    } else {
      tableRows = meritList.map(item => {
        let statusClass = '';
        if (item.status === 'selected') statusClass = 'selected';
        else if (item.status === 'waitlist') statusClass = 'waitlist';
        else if (item.status === 'awarded') statusClass = 'awarded';

        return `
          <tr>
            <td><b>${item.rank}</b></td>
            <td>${item.student_name || item.student_regno}</td>
            <td>${item.student_regno}</td>
            <td><b>${item.total_score.toFixed(1)}%</b></td>
            <td class="${statusClass}">${item.status.toUpperCase()}</td>
          </tr>
        `;
      }).join('');
    }

    const selectedCount = meritList.filter(m => m.status === 'selected' || m.status === 'awarded').length;
    const totalApplicants = meritList.length;
    const waitlistCount = meritList.filter(m => m.status === 'waitlist').length;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Merit List Report - ${scholarshipTitle}</title>
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

          <div class="document-title">MERIT LIST REPORT</div>
          
          <div class="scholarship-info">
            <div class="scholarship-title">${scholarshipTitle}</div>
            <div class="meta-info">Generated: ${currentDate}</div>
          </div>

          <table>
            <thead><tr>${tableHeaders}</tr></thead>
            <tbody>${tableRows}</tbody>
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

  const downloadPDF = () => {
    try {
      const doc = new jsPDF();
      const logoUrl = `${window.location.protocol}//${window.location.host}/images/comsats.jpg`;
      const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const scholarshipTitle = selectedScholarship === 'all'
        ? 'All Scholarships'
        : scholarships.find(s => s.id === selectedScholarship)?.title || '';

      const isTieredScholarship = isTiered();

      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = logoUrl;

      img.onload = () => {
        doc.addImage(img, 'JPEG', 14, 10, 25, 25);

        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('COMSATS UNIVERSITY ISLAMABAD', 45, 22);

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text('ABBOTTABAD CAMPUS', 45, 30);

        doc.setDrawColor(26, 82, 118);
        doc.setLineWidth(0.5);
        doc.line(14, 38, 200, 38);

        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(26, 82, 118);
        doc.text('MERIT LIST REPORT', 105, 55, { align: 'center' });

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(scholarshipTitle, 105, 70, { align: 'center' });

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(`Generated: ${currentDate}`, 105, 80, { align: 'center' });

        let startY = 95;

        if (stats) {
          autoTable(doc, {
            startY: startY,
            head: [['Metric', 'Value']],
            body: [
              ['Total Applications', stats.total_applications.toString()],
              ['Total Selected', stats.total_selected.toString()],
              ['Waitlist', stats.total_waitlist.toString()],
              ['Pending', stats.total_pending.toString()],
              ['Average Score', stats.average_score.toString()],
              ['Selection Rate', `${stats.selection_rate}%`],
            ],
            headStyles: { fillColor: [26, 82, 118], textColor: [255, 255, 255], fontSize: 10 },
            bodyStyles: { fontSize: 9 },
            margin: { left: 14, right: 14 },
          });
          startY = (doc as any).lastAutoTable.finalY + 10;
        }

        let headers: string[] = ['Rank', 'Student Name', 'Reg No', 'Score', 'Status'];
        if (isTieredScholarship) {
          headers = ['Rank', 'Student Name', 'Reg No', 'Score', 'Awarded Tier', 'Benefit', 'Status'];
        }

        let bodyRows = meritList.map(m => {
          if (isTieredScholarship) {
            return [
              m.rank.toString(),
              m.student_name || m.student_regno,
              m.student_regno,
              `${m.total_score.toFixed(1)}%`,
              m.award_tier || '-',
              m.award_description || '-',
              m.status.toUpperCase()
            ];
          }
          return [
            m.rank.toString(),
            m.student_name || m.student_regno,
            m.student_regno,
            `${m.total_score.toFixed(1)}%`,
            m.status.toUpperCase()
          ];
        });

        autoTable(doc, {
          startY: startY,
          head: [headers],
          body: bodyRows,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [26, 82, 118], textColor: [255, 255, 255] },
          alternateRowStyles: { fillColor: [245, 245, 245] },
          margin: { left: 14, right: 14 },
        });

        const finalY = (doc as any).lastAutoTable.finalY + 10;
        const selectedCount = meritList.filter(m => m.status === 'selected' || m.status === 'awarded').length;
        const totalApplicants = meritList.length;
        const waitlistCount = meritList.filter(m => m.status === 'waitlist').length;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(`Total Applicants: ${totalApplicants}`, 14, finalY);
        doc.text(`Total Selected: ${selectedCount}`, 80, finalY);
        doc.text(`Waitlist: ${waitlistCount}`, 160, finalY);

        const signY = finalY + 20;
        doc.line(14, signY, 70, signY);
        doc.line(130, signY, 186, signY);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Registrar', 42, signY + 8, { align: 'center' });
        doc.text('Director', 158, signY + 8, { align: 'center' });

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('COMSATS University Islamabad', 42, signY + 14, { align: 'center' });
        doc.text('Abbottabad Campus', 158, signY + 14, { align: 'center' });

        doc.setFontSize(7);
        doc.setTextColor(128, 128, 128);
        doc.text('* This is a system generated document. No signature is required. *', 105, signY + 30, { align: 'center' });

        doc.save(`merit-report-${Date.now()}.pdf`);
      };

      img.onerror = () => {
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('COMSATS UNIVERSITY ISLAMABAD', 105, 22, { align: 'center' });

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text('ABBOTTABAD CAMPUS', 105, 30, { align: 'center' });

        doc.setDrawColor(26, 82, 118);
        doc.setLineWidth(0.5);
        doc.line(14, 38, 200, 38);

        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(26, 82, 118);
        doc.text('MERIT LIST REPORT', 105, 55, { align: 'center' });

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(scholarshipTitle, 105, 70, { align: 'center' });

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(`Generated: ${currentDate}`, 105, 80, { align: 'center' });

        let startY = 95;

        if (stats) {
          autoTable(doc, {
            startY: startY,
            head: [['Metric', 'Value']],
            body: [
              ['Total Applications', stats.total_applications.toString()],
              ['Total Selected', stats.total_selected.toString()],
              ['Waitlist', stats.total_waitlist.toString()],
              ['Pending', stats.total_pending.toString()],
              ['Average Score', stats.average_score.toString()],
              ['Selection Rate', `${stats.selection_rate}%`],
            ],
            headStyles: { fillColor: [26, 82, 118] },
            margin: { left: 14, right: 14 },
          });
          startY = (doc as any).lastAutoTable.finalY + 10;
        }

        let headers: string[] = ['Rank', 'Student Name', 'Reg No', 'Score', 'Status'];
        if (isTieredScholarship) {
          headers = ['Rank', 'Student Name', 'Reg No', 'Score', 'Awarded Tier', 'Benefit', 'Status'];
        }

        let bodyRows = meritList.map(m => {
          if (isTieredScholarship) {
            return [
              m.rank.toString(),
              m.student_name || m.student_regno,
              m.student_regno,
              `${m.total_score.toFixed(1)}%`,
              m.award_tier || '-',
              m.award_description || '-',
              m.status.toUpperCase()
            ];
          }
          return [
            m.rank.toString(),
            m.student_name || m.student_regno,
            m.student_regno,
            `${m.total_score.toFixed(1)}%`,
            m.status.toUpperCase()
          ];
        });

        autoTable(doc, {
          startY: startY,
          head: [headers],
          body: bodyRows,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [26, 82, 118] },
          margin: { left: 14, right: 14 },
        });

        const finalY = (doc as any).lastAutoTable.finalY + 10;
        const selectedCount = meritList.filter(m => m.status === 'selected' || m.status === 'awarded').length;
        const totalApplicants = meritList.length;
        const waitlistCount = meritList.filter(m => m.status === 'waitlist').length;

        doc.setFontSize(9);
        doc.text(`Total Applicants: ${totalApplicants}`, 14, finalY);
        doc.text(`Total Selected: ${selectedCount}`, 80, finalY);
        doc.text(`Waitlist: ${waitlistCount}`, 160, finalY);

        const signY = finalY + 20;
        doc.line(14, signY, 70, signY);
        doc.line(130, signY, 186, signY);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Registrar', 42, signY + 8, { align: 'center' });
        doc.text('Director', 158, signY + 8, { align: 'center' });

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('COMSATS University Islamabad', 42, signY + 14, { align: 'center' });
        doc.text('Abbottabad Campus', 158, signY + 14, { align: 'center' });

        doc.setFontSize(7);
        doc.setTextColor(128, 128, 128);
        doc.text('* This is a system generated document. No signature is required. *', 105, signY + 30, { align: 'center' });

        doc.save(`merit-report-${Date.now()}.pdf`);
      };
    } catch (error) {
      console.error('PDF Error:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  const downloadCSV = () => {
    try {
      const isTieredScholarship = isTiered();

      let headers: string[] = ['Rank', 'Student Name', 'Reg No', 'Score', 'Status'];
      if (isTieredScholarship) {
        headers = ['Rank', 'Student Name', 'Reg No', 'Score', 'Awarded Tier', 'Benefit', 'Status'];
      }

      let rows = meritList.map(m => {
        if (isTieredScholarship) {
          return [
            m.rank,
            m.student_name || m.student_regno,
            m.student_regno,
            m.total_score,
            m.award_tier || '-',
            m.award_description || '-',
            m.status
          ];
        }
        return [
          m.rank,
          m.student_name || m.student_regno,
          m.student_regno,
          m.total_score,
          m.status
        ];
      });

      const csvContent = [headers, ...rows]
        .map(row => row.join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `merit-list-${Date.now()}.csv`;
      a.click();
    } catch (error) {
      console.error('CSV Error:', error);
      alert('Error generating CSV file. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">Loading reports...</div>
        </div>
      </div>
    );
  }

  const isTieredScholarship = isTiered();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Merit List Reports</h1>
            <p className="text-gray-600 mt-2">Comprehensive analytics and export options</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={printMeritList}
              className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              <Printer size={18} />
              Print
            </button>
            <button
              onClick={downloadPDF}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              <FileText size={18} />
              PDF
            </button>
            <button
              onClick={downloadCSV}
              className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900"
            >
              <Download size={18} />
              CSV
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Scholarship</label>
              <select
                value={selectedScholarship}
                onChange={(e) => setSelectedScholarship(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="all">All Scholarships</option>
                {scholarships.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.title} {s.scholarship_mode === 'tiered' ? '(Tiered)' : '(Single)'}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {stats && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Applications</p>
                    <p className="text-2xl font-bold">{stats.total_applications}</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-500" />
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Selected</p>
                    <p className="text-2xl font-bold text-green-600">{stats.total_selected}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Waitlist</p>
                    <p className="text-2xl font-bold text-yellow-600">{stats.total_waitlist}</p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-500" />
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Selection Rate</p>
                    <p className="text-2xl font-bold">{stats.selection_rate}%</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-purple-500" />
                </div>
              </div>
            </div>

            {/* Merit List Table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <h3 className="font-semibold text-gray-900">Merit List</h3>
                <span className="text-sm text-gray-600">Total: {meritList.length} students</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-blue-600 text-white">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider rounded-tl-lg">Rank</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Student Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Reg No</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Score</th>
                      {isTieredScholarship && (
                        <>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Awarded Tier</th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Benefit</th>
                        </>
                      )}
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider rounded-tr-lg">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {meritList.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium">{entry.rank}</td>
                        <td className="px-6 py-4">{entry.student_name || entry.student_regno}</td>
                        <td className="px-6 py-4">{entry.student_regno}</td>
                        <td className="px-6 py-4 font-semibold">{entry.total_score.toFixed(1)}%</td>
                        {isTieredScholarship && (
                          <>
                            <td className="px-6 py-4">
                              <span className="font-semibold text-blue-600">{entry.award_tier || '-'}</span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">{entry.award_description || '-'}</td>
                          </>
                        )}
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs rounded-full ${entry.status === 'awarded' ? 'bg-purple-100 text-purple-800' :
                              entry.status === 'selected' ? 'bg-green-100 text-green-800' :
                                entry.status === 'waitlist' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                            }`}>
                            {entry.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}