'use client'

import { useState, useEffect } from 'react'
import { Download, FileText, Users, UserCheck, Award, Printer } from 'lucide-react'

export default function StudentReportsPage() {
    const [reportType, setReportType] = useState('department')
    const [data, setData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [selectedDepartment, setSelectedDepartment] = useState('all')
    const [selectedStudent, setSelectedStudent] = useState('')
    const [students, setStudents] = useState<any[]>([])

    // Fetch students on load
    useEffect(() => {
        fetchStudents()
    }, [])

    // Auto-fetch when any filter changes
    useEffect(() => {
        fetchReportData()
    }, [reportType, selectedDepartment, selectedStudent])

    const fetchReportData = async () => {
        try {
            setLoading(true)
            setError('')
            const params = new URLSearchParams({
                type: reportType,
                department: selectedDepartment,
                student: selectedStudent
            })
            const response = await fetch(`/api/admin/students/reports?${params}`)
            const result = await response.json()

            if (result.error) {
                setError(result.error)
                setData([])
            } else {
                setData(result.report || [])
            }
        } catch (error) {
            console.error('Error fetching report:', error)
            setError('Failed to load report')
            setData([])
        } finally {
            setLoading(false)
        }
    }

    const fetchStudents = async () => {
        try {
            const response = await fetch('/api/admin/students')
            const result = await response.json()
            setStudents(result.students || [])
        } catch (error) {
            console.error('Error fetching students:', error)
        }
    }

    // Export to CSV/Excel
    const exportToCSV = () => {
        if (data.length === 0) {
            alert('No data to export')
            return
        }

        // Get headers
        const headers = Object.keys(data[0])
        
        // Create CSV rows
        const rows = data.map(row => 
            headers.map(header => {
                let value = row[header] || ''
                // Handle strings with commas
                if (typeof value === 'string' && value.includes(',')) {
                    value = `"${value}"`
                }
                return value
            }).join(',')
        )

        // Combine header and rows
        const csv = [headers.join(','), ...rows].join('\n')
        
        // Create download
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
    }

    // Export to PDF using print
    const exportToPDF = () => {
        const printContent = document.querySelector('.print-area');
        if (!printContent) return;

        const logoUrl = `${window.location.protocol}//${window.location.host}/images/comsats.jpg`;
        const currentDate = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const reportTitle = reportType.replace(/_/g, ' ').toUpperCase();

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Please allow pop-ups to export PDF');
            return;
        }

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
        .report-info {
          text-align: center;
          margin: 20px 0;
          padding: 10px;
          background: #f8f9fa;
        }
        .report-type {
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
          font-size: 12px;
        }
        td {
          padding: 8px;
          text-align: center;
          border-bottom: 1px solid #ddd;
          font-size: 11px;
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
      </style>
    `;

        const tableHtml = printContent.querySelector('table')?.outerHTML || '';

        printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${reportTitle} Report</title>
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

          <div class="document-title">${reportTitle} REPORT</div>
          
          <div class="report-info">
            <div class="report-type">${reportType === 'individual' ? 'INDIVIDUAL STUDENT REPORT' : reportTitle.replace(/_/g, ' ')}</div>
            <div class="meta-info">Generated: ${currentDate}</div>
          </div>

          ${tableHtml}

          <div class="footer-stats">
            <span><b>Total Records:</b> ${data?.length || 0}</span>
            <span><b>Generated On:</b> ${currentDate}</span>
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
        
        // For PDF, we use print to PDF
        setTimeout(() => {
            printWindow.print();
        }, 500);
    };

    // Print function
    const handlePrint = () => {
        const printContent = document.querySelector('.print-area');
        if (!printContent) return;

        const logoUrl = `${window.location.protocol}//${window.location.host}/images/comsats.jpg`;
        const currentDate = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const reportTitle = reportType.replace(/_/g, ' ').toUpperCase();

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Please allow pop-ups to print');
            return;
        }

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
        .report-info {
          text-align: center;
          margin: 20px 0;
          padding: 10px;
          background: #f8f9fa;
        }
        .report-type {
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
          font-size: 12px;
        }
        td {
          padding: 8px;
          text-align: center;
          border-bottom: 1px solid #ddd;
          font-size: 11px;
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
      </style>
    `;

        const tableHtml = printContent.querySelector('table')?.outerHTML || '';

        printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${reportTitle} Report</title>
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

          <div class="document-title">${reportTitle} REPORT</div>
          
          <div class="report-info">
            <div class="report-type">${reportType === 'individual' ? 'INDIVIDUAL STUDENT REPORT' : reportTitle.replace(/_/g, ' ')}</div>
            <div class="meta-info">Generated: ${currentDate}</div>
          </div>

          ${tableHtml}

          <div class="footer-stats">
            <span><b>Total Records:</b> ${data?.length || 0}</span>
            <span><b>Generated On:</b> ${currentDate}</span>
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

    const reportOptions = [
        { value: 'department', label: 'Department-wise' },
        { value: 'undergraduate', label: 'Undergraduate (BS) Students' },
        { value: 'graduate', label: 'Graduate (MS) Students' },
        { value: 'individual', label: 'Individual Student' },
    ]

    const getTotal = (key: string) => {
        return data.reduce((sum, row) => sum + (row[key] || 0), 0)
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Student Reports</h1>
                    <p className="text-gray-500 text-sm mt-1">View student data by department, undergraduate, graduate, or individual</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={exportToPDF}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        PDF
                    </button>
                    <button
                        onClick={exportToCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Excel
                    </button>
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                        <Printer className="w-4 h-4" />
                        Print
                    </button>
                </div>
            </div>

            {/* Filters - Auto fetch on change */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Report Type Dropdown */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
                        <select
                            value={reportType}
                            onChange={(e) => setReportType(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            {reportOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Department Dropdown - Shows for department-wise */}
                    {reportType === 'department' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Select Department</label>
                            <select
                                value={selectedDepartment}
                                onChange={(e) => setSelectedDepartment(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">All Departments</option>

                                <optgroup label="Undergraduate (BS)">
                                    <option value="BCS">BS Computer Science</option>
                                    <option value="BBA">BS Business Administration</option>
                                    <option value="BSE">BS Software Engineering</option>
                                    <option value="BDS">BS Data Science</option>
                                    <option value="BAI">BS Artificial Intelligence</option>
                                    <option value="BCY">BS Cyber Security</option>
                                    <option value="BECE">BS Electrical Engineering</option>
                                    <option value="BMCE">BS Mechanical Engineering</option>
                                    <option value="BCCE">BS Civil Engineering</option>
                                    <option value="BCHEM">BS Chemistry</option>
                                    <option value="BPHY">BS Physics</option>
                                    <option value="BMATH">BS Mathematics</option>
                                    <option value="BECO">BS Economics</option>
                                    <option value="BENG">BS English</option>
                                    <option value="BPSY">BS Psychology</option>
                                    <option value="BSOC">BS Sociology</option>
                                </optgroup>

                                <optgroup label="Graduate (MS)">
                                    <option value="MCS">MS Computer Science</option>
                                    <option value="MBA">MS Business Administration</option>
                                    <option value="MSE">MS Software Engineering</option>
                                    <option value="MDS">MS Data Science</option>
                                    <option value="MAI">MS Artificial Intelligence</option>
                                    <option value="MCY">MS Cyber Security</option>
                                    <option value="MECE">MS Electrical Engineering</option>
                                    <option value="MMCE">MS Mechanical Engineering</option>
                                    <option value="MCCE">MS Civil Engineering</option>
                                    <option value="MCHEM">MS Chemistry</option>
                                    <option value="MPHY">MS Physics</option>
                                    <option value="MMATH">MS Mathematics</option>
                                    <option value="MECO">MS Economics</option>
                                    <option value="MENG">MS English</option>
                                    <option value="MPSY">MS Psychology</option>
                                    <option value="MSOC">MS Sociology</option>
                                </optgroup>
                            </select>
                        </div>
                    )}

                    {/* Individual Student Dropdown */}
                    {reportType === 'individual' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Select Student</label>
                            <select
                                value={selectedStudent}
                                onChange={(e) => setSelectedStudent(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Select Student</option>
                                {students.map((student: any) => (
                                    <option key={student.regno} value={student.regno}>
                                        {student.name} ({student.regno})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                    {error}
                </div>
            )}

            {/* Print Area */}
            <div className="print-area">
                {/* Summary Cards */}
                {data.length > 0 && (
                    <div className="summary-cards grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white rounded-lg shadow p-4">
                            <div className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-blue-500" />
                                <p className="text-sm text-gray-500">Total Students</p>
                            </div>
                            <p className="text-2xl font-bold mt-1">{getTotal('total')}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow p-4">
                            <div className="flex items-center gap-2">
                                <UserCheck className="w-5 h-5 text-green-500" />
                                <p className="text-sm text-gray-500">Active Students</p>
                            </div>
                            <p className="text-2xl font-bold mt-1">{getTotal('active')}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow p-4">
                            <div className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-yellow-500" />
                                <p className="text-sm text-gray-500">Total Applications</p>
                            </div>
                            <p className="text-2xl font-bold mt-1">{getTotal('applied')}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow p-4">
                            <div className="flex items-center gap-2">
                                <Award className="w-5 h-5 text-purple-500" />
                                <p className="text-sm text-gray-500">Selected Students</p>
                            </div>
                            <p className="text-2xl font-bold mt-1">{getTotal('selected')}</p>
                        </div>
                    </div>
                )}

                {/* Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="mt-4 text-gray-500">Loading report...</p>
                        </div>
                    ) : data.length === 0 ? (
                        <div className="text-center py-12">
                            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">No data available</p>
                            <p className="text-sm text-gray-400 mt-1">Try changing filters or report type</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-blue-600 text-white">
                                    <tr>
                                        {Object.keys(data[0]).map((key) => (
                                            <th key={key} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                                                {key.replace(/_/g, ' ').toUpperCase()}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {data.map((row: any, index: number) => (
                                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                                            {Object.values(row).map((value: any, i: number) => (
                                                <td key={i} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {value}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}