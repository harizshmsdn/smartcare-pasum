// apps/web/app/interventions/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  ArrowLeft,
  AlertTriangle,
  Clock,
  CheckCircle2,
  MoreHorizontal,
  MessageSquare,
  GripVertical,
  ChevronDown
} from "lucide-react";

interface KanbanItem {
  id: string;
  name: string;
  issue: string;
  daysPending: number;
  priority: string;
  class: string;
}

// Mock Data for the Kanban Board
const kanbanData = {
  needsReview: [
    { id: "1720441", name: "Ahmad Hakimi bin Faisal", issue: "Critical: 60% Attendance", daysPending: 2, priority: "high", class: "Physics 101 - Group A" },
    { id: "1720451", name: "Muhammad Danial bin Zulkifli", issue: "Assessment Drop: -25%", daysPending: 1, priority: "medium", class: "Mathematics 201 - Group B" },
  ],
  inProgress: [
    { id: "1720445", name: "Jason Lee Wei Min", issue: "Academic Advising Scheduled", daysPending: 4, priority: "medium", class: "Computer Science 101" },
  ],
  referred: [
    { id: "1720462", name: "Chong Wei Jie", issue: "UM Counselling Unit Sync", daysPending: 7, priority: "high", class: "Physics 101 - Group A" },
  ],
  resolved: [
    { id: "1720450", name: "Siti Aisyah binti Rahman", issue: "Back on track (>80%)", daysPending: 0, priority: "low", class: "Mathematics 201 - Group B" },
  ]
};

// Mock Classes for the dropdown
const mockClasses = [
  "All Classes",
  "Physics 101 - Group A",
  "Mathematics 201 - Group B",
  "Computer Science 101"
];

export default function InterventionsPage() {
  const [selectedClass, setSelectedClass] = useState(mockClasses[0]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Helper function to filter the kanban data based on the selected class
  const filterByClass = (items: KanbanItem[]) => {
    if (selectedClass === "All Classes") return items;
    return items.filter(item => item.class === selectedClass);
  };

  const filteredNeedsReview = filterByClass(kanbanData.needsReview);
  const filteredInProgress = filterByClass(kanbanData.inProgress);
  const filteredReferred = filterByClass(kanbanData.referred);
  const filteredResolved = filterByClass(kanbanData.resolved);

  return (
    <main className="flex-1 p-8 h-screen flex flex-col bg-transparent overflow-hidden">
      
      {/* Header & Breadcrumb */}
      <div className="shrink-0 mb-8">
        <Link href="/classes" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors mb-4">
          <ArrowLeft size={16} /> Back to Class Roster
        </Link>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h2 className="text-3xl font-semibold text-slate-900">Intervention Board</h2>
            <p className="text-slate-500 mt-1">Track and manage active student risk cases</p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Functional Dropdown for selecting classes */}
            <div className="relative">
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-3 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl font-medium shadow-sm hover:bg-slate-50 transition-colors"
              >
                <div className="flex flex-col text-left">
                  <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider leading-none mb-1">Filter Board</span>
                  <span className="leading-none text-sm">{selectedClass}</span>
                </div>
                <ChevronDown size={18} className="text-slate-400 ml-2" />
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-full min-w-[220px] bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
                  {mockClasses.map((cls) => (
                    <button
                      key={cls}
                      onClick={() => {
                        setSelectedClass(cls);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-3 text-sm hover:bg-slate-50 transition-colors ${selectedClass === cls ? 'bg-blue-50/50 text-blue-700 font-medium' : 'text-slate-700'}`}
                    >
                      {cls}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-3 rounded-xl font-semibold text-sm">
              <AlertTriangle size={18} />
              {filteredNeedsReview.length} Action Required
            </div>
          </div>
        </div>
      </div>

      {/* Kanban Grid Container */}
      <div className="flex-1 min-h-0 flex gap-6 overflow-x-auto pb-4">
        
        {/* Column 1: Needs Review */}
        <div className="flex-1 flex flex-col min-w-[280px]">
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
              Needs Review
            </h3>
            <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {filteredNeedsReview.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {filteredNeedsReview.map((student, i) => (
              <KanbanCard key={i} data={student} />
            ))}
          </div>
        </div>

        {/* Column 2: In Progress */}
        <div className="flex-1 flex flex-col min-w-[280px]">
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
              In Progress
            </h3>
            <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {filteredInProgress.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {filteredInProgress.map((student, i) => (
              <KanbanCard key={i} data={student} />
            ))}
          </div>
        </div>

        {/* Column 3: Referred to Counselling */}
        <div className="flex-1 flex flex-col min-w-[280px]">
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              External Referral
            </h3>
            <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {filteredReferred.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {filteredReferred.map((student, i) => (
              <KanbanCard key={i} data={student} />
            ))}
          </div>
        </div>

        {/* Column 4: Resolved */}
        <div className="flex-1 flex flex-col min-w-[280px]">
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              Resolved
            </h3>
            <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {filteredResolved.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {filteredResolved.map((student, i) => (
              <KanbanCard key={i} data={student} isResolved />
            ))}
          </div>
        </div>

      </div>
    </main>
  );
}

// Kanban Card Component
function KanbanCard({ data, isResolved = false }: { data: KanbanItem, isResolved?: boolean }) {
  return (
    <div className={`bg-white p-5 rounded-2xl border shadow-sm group hover:shadow-md transition-all cursor-grab active:cursor-grabbing ${isResolved ? 'border-emerald-100 bg-emerald-50/30' : 'border-slate-200'}`}>
      <div className="flex justify-between items-start mb-3">
        <div className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
          data.priority === 'high' ? 'bg-red-50 text-red-700' : 
          data.priority === 'medium' ? 'bg-orange-50 text-orange-700' : 
          'bg-slate-100 text-slate-600'
        }`}>
          {data.priority} Priority
        </div>
        <button className="text-slate-400 hover:text-slate-900 transition-colors">
          <MoreHorizontal size={18} />
        </button>
      </div>
      
      <h4 className="font-bold text-slate-900 mb-1">{data.name}</h4>
      <p className="text-xs text-slate-500 mb-2">{data.id} • {data.issue}</p>
      
      {/* Show which class this belongs to if "All Classes" is selected */}
      <div className="mb-4">
        <span className="inline-block bg-slate-100 text-slate-500 text-[10px] font-semibold px-2 py-1 rounded">
          {data.class}
        </span>
      </div>
      
      <div className="flex justify-between items-center pt-4 border-t border-slate-100">
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
          {isResolved ? (
            <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 size={14}/> Closed</span>
          ) : (
            <span className="flex items-center gap-1"><Clock size={14}/> {data.daysPending} days open</span>
          )}
        </div>
        <div className="flex gap-2">
          <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
            <MessageSquare size={16} />
          </button>
          <div className="p-1.5 text-slate-300 cursor-grab active:cursor-grabbing">
            <GripVertical size={16} />
          </div>
        </div>
      </div>
    </div>
  );
}