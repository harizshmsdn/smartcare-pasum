// apps/web/app/interventions/page.tsx
"use client";

import Link from "next/link";
import { 
  ArrowLeft,
  AlertTriangle,
  Clock,
  CheckCircle2,
  MoreHorizontal,
  MessageSquare,
  GripVertical
} from "lucide-react";

// Mock Data for the Kanban Board
const kanbanData = {
  needsReview: [
    { id: "1720441", name: "Ahmad Hakimi bin Faisal", issue: "Critical: 60% Attendance", daysPending: 2, priority: "high" },
    { id: "1720451", name: "Muhammad Danial bin Zulkifli", issue: "Assessment Drop: -25%", daysPending: 1, priority: "medium" },
  ],
  inProgress: [
    { id: "1720445", name: "Jason Lee Wei Min", issue: "Academic Advising Scheduled", daysPending: 4, priority: "medium" },
  ],
  referred: [
    { id: "1720462", name: "Chong Wei Jie", issue: "UM Counselling Unit Sync", daysPending: 7, priority: "high" },
  ],
  resolved: [
    { id: "1720450", name: "Siti Aisyah binti Rahman", issue: "Back on track (>80%)", daysPending: 0, priority: "low" },
  ]
};

export default function InterventionsPage() {
  return (
    <main className="flex-1 p-8 h-screen flex flex-col bg-transparent overflow-hidden">
      
      {/* Header & Breadcrumb */}
      <div className="shrink-0 mb-8">
        <Link href="/classes" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors mb-4">
          <ArrowLeft size={16} /> Back to Class Roster
        </Link>
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-semibold text-slate-900">Intervention Board</h2>
            <p className="text-slate-500 mt-1">Track and manage active student risk cases</p>
          </div>
          <div className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-2 rounded-xl font-semibold text-sm">
            <AlertTriangle size={18} />
            2 Action Required
          </div>
        </div>
      </div>

      {/* Kanban Grid Container */}
      <div className="flex-1 min-h-0 flex gap-6 overflow-x-auto pb-4">
        
        {/* Column 1: Needs Review */}
        <div className="flex flex-col min-w-[320px] max-w-[320px]">
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
              Needs Review
            </h3>
            <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {kanbanData.needsReview.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {kanbanData.needsReview.map((student, i) => (
              <KanbanCard key={i} data={student} />
            ))}
          </div>
        </div>

        {/* Column 2: In Progress */}
        <div className="flex flex-col min-w-[320px] max-w-[320px]">
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
              In Progress
            </h3>
            <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {kanbanData.inProgress.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {kanbanData.inProgress.map((student, i) => (
              <KanbanCard key={i} data={student} />
            ))}
          </div>
        </div>

        {/* Column 3: Referred to Counselling */}
        <div className="flex flex-col min-w-[320px] max-w-[320px]">
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              External Referral
            </h3>
            <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {kanbanData.referred.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {kanbanData.referred.map((student, i) => (
              <KanbanCard key={i} data={student} />
            ))}
          </div>
        </div>

        {/* Column 4: Resolved */}
        <div className="flex flex-col min-w-[320px] max-w-[320px]">
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              Resolved
            </h3>
            <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {kanbanData.resolved.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {kanbanData.resolved.map((student, i) => (
              <KanbanCard key={i} data={student} isResolved />
            ))}
          </div>
        </div>

      </div>
    </main>
  );
}

// Kanban Card Component
function KanbanCard({ data, isResolved = false }: { data: any, isResolved?: boolean }) {
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
      <p className="text-xs text-slate-500 mb-4">{data.id} • {data.issue}</p>
      
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