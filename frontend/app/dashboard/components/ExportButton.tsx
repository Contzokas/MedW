"use client";

import { useTriageStream } from "@/app/lib/useTriageStream";
import { QueueEntry } from "@/app/lib/types";
import { useState } from "react";
import { Parser } from 'json2csv';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Extend jsPDF interface to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface ExportButtonProps {
  entries: QueueEntry[];
}

export default function ExportButton({ entries }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const formatDataForExport = () => {
    return entries.map(entry => {
      const parsedDate = new Date(entry.timestamp);
      return {
        "Time": Number.isNaN(parsedDate.getTime()) ? "Invalid Time" : parsedDate.toLocaleTimeString("el-GR"),
        "Date": Number.isNaN(parsedDate.getTime()) ? "Invalid Date" : parsedDate.toLocaleDateString("el-GR"),
        "Patient ID": entry.patient_id,
        "MTS Level": entry.mts_level,
        "Specialty": entry.specialty
      };
    });
  };

  const handleExportCSV = () => {
    if (entries.length === 0) return;
    
    try {
      const data = formatDataForExport();
      const parser = new Parser();
      const csv = parser.parse(data);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      saveAs(blob, `triage-queue-${new Date().toISOString().split('T')[0]}.csv`);
      setIsOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportPDF = () => {
    if (entries.length === 0) return;

    try {
      const doc = new jsPDF();
      const data = formatDataForExport();
      
      const tableColumn = Object.keys(data[0]);
      const tableRows = data.map(obj => Object.values(obj));

      doc.text("Triage Queue Report", 14, 15);
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleString("el-GR")}`, 14, 22);

      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 28,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
      });

      doc.save(`triage-queue-${new Date().toISOString().split('T')[0]}.pdf`);
      setIsOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex justify-center w-full px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-md hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Export
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          ></div>
          <div className="absolute right-0 z-20 mt-2 w-48 origin-top-right rounded-md shadow-lg bg-card border border-border ring-1 ring-black ring-opacity-5">
            <div className="py-1" role="menu" aria-orientation="vertical">
              <button
                onClick={handleExportCSV}
                className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted"
                role="menuitem"
                disabled={entries.length === 0}
              >
                Export as CSV
              </button>
              <button
                onClick={handleExportPDF}
                className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted"
                role="menuitem"
                disabled={entries.length === 0}
              >
                Export as PDF
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}