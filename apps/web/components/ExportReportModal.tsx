import React, { useState } from 'react';

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ExportReportModal({ isOpen, onClose }: ExportReportModalProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [format, setFormat] = useState<'csv' | 'pdf'>('csv');
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      // TODO: Replace with your actual API endpoint or data fetching logic
      // Example: const response = await fetch(`/api/export?start=${startDate}&end=${endDate}&format=${format}`);
      
      console.log(`Exporting ${format.toUpperCase()} from ${startDate} to ${endDate}`);
      
      // Mocking a network delay
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      alert('Report exported successfully! (Mock)');
      onClose(); // Close modal on success
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-2 text-xl font-semibold text-gray-800">Export Compliance Report</h2>
        <p className="mb-6 text-sm text-gray-600">
          Generate attendance and assessment records for UI GreenMetric or internal auditing.
        </p>

        {/* Date Range Pickers */}
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Format Selection */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-gray-700">Report Format</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="format"
                value="csv"
                checked={format === 'csv'}
                onChange={() => setFormat('csv')}
                className="text-blue-600 focus:ring-blue-500"
              />
              CSV Spreadsheet
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="format"
                value="pdf"
                checked={format === 'pdf'}
                onChange={() => setFormat('pdf')}
                className="text-blue-600 focus:ring-blue-500"
              />
              PDF Document
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={!startDate || !endDate || isExporting}
            className="flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isExporting ? 'Generating...' : 'Download Report'}
          </button>
        </div>
      </div>
    </div>
  );
}