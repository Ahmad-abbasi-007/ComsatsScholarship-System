'use client'

import { useState, useEffect } from 'react'
import { 
  DollarSign, 
  Download, 
  TrendingUp, 
  TrendingDown,
  Award,
  Users,
  RefreshCw,
  FileText,
  Printer,
  BarChart3,
  Eye,
  Shield
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/contexts/AuthContext'
import { hasAccess } from '@/lib/roleCheck'
import toast, { Toaster } from 'react-hot-toast'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function BudgetReportsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [loadingData, setLoadingData] = useState(true)
  const [data, setData] = useState<any>(null)
  const [reportType, setReportType] = useState('overview')

  const pathname = '/admin/budget/reports'

  // ✅ Role-based access check
  useEffect(() => {
    if (!loading) {
      const role = user?.role || 'viewer'
      if (!hasAccess(pathname, role)) {
        router.push('/admin/dashboard')
      }
    }
  }, [user, loading, router])

  useEffect(() => {
    if (hasAccess(pathname, user?.role || 'viewer')) {
      fetchReportData()
    } else {
      setLoadingData(false)
    }
  }, [reportType, user])

  const fetchReportData = async () => {
    try {
      setLoadingData(true)
      const response = await fetch(`/api/admin/budget/reports?type=${reportType}`)
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Error fetching report:', error)
      toast.error('Failed to load report data')
    } finally {
      setLoadingData(false)
    }
  }

  const reportOptions = [
    { value: 'overview', label: 'Overview' },
    { value: 'scholarship', label: 'Scholarship-wise' },
    { value: 'utilization', label: 'Utilization' },
    { value: 'students', label: 'Student-wise' },
  ]

  // ============ PRINT ============
  const handlePrint = () => {
    const printContent = document.querySelector('.print-area')
    if (!printContent) return

    const logoUrl = `${window.location.protocol}//${window.location.host}/images/comsats.jpg`
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    const reportTitle = reportOptions.find(o => o.value === reportType)?.label || 'Budget Report'

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('Please allow pop-ups to print')
      return
    }

    const tableHtml = printContent.querySelector('table')?.outerHTML || ''

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
      </style>
    `

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Budget Report - ${reportTitle}</title>
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

          <div class="document-title">${reportTitle.toUpperCase()} REPORT</div>
          
          <div class="report-info">
            <div class="report-type">${reportTitle}</div>
            <div class="meta-info">Generated: ${currentDate}</div>
          </div>

          ${tableHtml}

          <div class="footer-stats">
            <span><b>Total Records:</b> ${data?.items?.length || 0}</span>
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
    `)

    printWindow.document.close()
    printWindow.print()
  }

  // ============ EXPORT ============
  const exportPDF = () => {
    try {
      const doc = new jsPDF()
      const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
      const reportTitle = reportOptions.find(o => o.value === reportType)?.label || 'Budget Report'

      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text('COMSATS UNIVERSITY ISLAMABAD', 105, 20, { align: 'center' })

      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text('ABBOTTABAD CAMPUS', 105, 28, { align: 'center' })

      doc.setDrawColor(26, 82, 118)
      doc.setLineWidth(0.5)
      doc.line(15, 35, 195, 35)

      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(26, 82, 118)
      doc.text(`${reportTitle} REPORT`, 105, 50, { align: 'center' })

      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
      doc.text(`Generated: ${currentDate}`, 105, 60, { align: 'center' })

      const headers = data?.items?.length > 0 ? Object.keys(data.items[0]) : []
      const body = data?.items?.map((row: any) => Object.values(row)) || []

      if (headers.length > 0 && body.length > 0) {
        autoTable(doc, {
          startY: 75,
          head: [headers],
          body: body,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [26, 82, 118], textColor: [255, 255, 255] },
          alternateRowStyles: { fillColor: [245, 245, 245] },
          margin: { left: 14, right: 14 },
        })

        const finalY = (doc as any).lastAutoTable.finalY + 10
        doc.setFontSize(8)
        doc.setTextColor(128, 128, 128)
        doc.text('* This is a system generated document. No signature is required. *', 105, finalY + 10, { align: 'center' })
      }

      doc.save(`budget-report-${reportType}-${Date.now()}.pdf`)
    } catch (error) {
      toast.error('Failed to export PDF')
    }
  }

  const exportExcel = () => {
    try {
      if (!data?.items || data.items.length === 0) {
        toast.error('No data to export')
        return
      }
      const ws = XLSX.utils.json_to_sheet(data.items)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Budget Report')
      XLSX.writeFile(wb, `budget-report-${reportType}-${Date.now()}.xlsx`)
      toast.success('Excel exported successfully')
    } catch (error) {
      toast.error('Failed to export Excel')
    }
  }

  // ✅ Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // ✅ Check access using roleCheck
  const role = user?.role || 'viewer'
  if (!hasAccess(pathname, role)) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto text-center py-12">
          <Shield className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (loadingData) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-500">Loading report...</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Budget Reports</h1>
          <p className="text-gray-500 text-sm mt-1">Comprehensive budget analytics and reports</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button
            onClick={exportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Download className="w-4 h-4" />
            Excel
          </button>
          <button
            onClick={exportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <Download className="w-4 h-4" />
            PDF
          </button>
          <button
            onClick={fetchReportData}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {reportOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Print Area */}
      <div className="print-area">
        {/* Summary Cards */}
        {data?.stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Budget</p>
                  <p className="text-2xl font-bold text-gray-900">
                    Rs. {data.stats.totalBudget?.toLocaleString() || 0}
                  </p>
                </div>
                <DollarSign className="w-6 h-6 text-blue-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Utilized</p>
                  <p className="text-2xl font-bold text-green-600">
                    Rs. {data.stats.utilized?.toLocaleString() || 0}
                  </p>
                </div>
                <TrendingUp className="w-6 h-6 text-green-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Remaining</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    Rs. {data.stats.remaining?.toLocaleString() || 0}
                  </p>
                </div>
                <TrendingDown className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Utilization Rate</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {data.stats.utilizationRate || 0}%
                  </p>
                </div>
                <BarChart3 className="w-6 h-6 text-purple-500" />
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">
              {reportOptions.find(o => o.value === reportType)?.label || 'Report'} Details
            </h3>
            <span className="text-sm text-gray-500">{data?.items?.length || 0} records</span>
          </div>
          <div className="overflow-x-auto">
            {!data?.items || data.items.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No data available for this report</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-blue-600 text-white">
                  <tr>
                    {Object.keys(data.items[0]).map((key, index) => (
                      <th 
                        key={key} 
                        className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                          index === 0 ? 'rounded-tl-lg' : ''
                        } ${index === Object.keys(data.items[0]).length - 1 ? 'rounded-tr-lg' : ''}`}
                      >
                        {key.replace(/_/g, ' ').toUpperCase()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.items.map((row: any, index: number) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      {Object.values(row).map((value: any, i: number) => (
                        <td key={i} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {typeof value === 'number' ? value.toLocaleString() : value || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Printer className="w-4 h-4" />
          <span>Last updated: {new Date().toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}