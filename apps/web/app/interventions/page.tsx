// apps/web/app/interventions/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ArrowLeft,
  AlertTriangle,
  Clock,
  CheckCircle2,
  MoreHorizontal,
  MessageSquare,
  GripVertical,
  ChevronDown,
  Check
} from "lucide-react";
import { createClient } from "../../utils/supabase/client";

interface KanbanItem {
  id: string; // Institutional ID (Matric)
  role?: string;
  interventionId: string; // DB primary key
  name: string;
  issue: string;
  daysPending: number;
  priority: string;
  class: string;
  status: string;
}

export default function InterventionsPage() {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [interventions, setInterventions] = useState<any[]>([]);
  const [classesList, setClassesList] = useState<string[]>(["All Classes"]);
  const [selectedClass, setSelectedClass] = useState("All Classes");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadInterventions = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch interventions
    const { data } = await supabase
      .from('interventions')
      .select(`
        id,
        issue_description,
        status,
        priority,
        created_at,
        profiles (
          institutional_id,
          full_name
        ),
        classes (
          group_code,
          subjects (
            code,
            name
          )
        )
      `)
      .eq('lecturer_id', user.id);

    if (data) {
      setInterventions(data);
      
      // Extract unique class titles for filter dropdown
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const uniqueClasses = Array.from(new Set(data.map((item: any) => {
        const classNode = item.classes;
        return classNode ? `${classNode.subjects?.code} - ${classNode.subjects?.name} (${classNode.group_code})` : "";
      }).filter(Boolean))) as string[];
      
      setClassesList(["All Classes", ...uniqueClasses]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadInterventions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from('interventions')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error("Failed to update status:", error);
      return;
    }

    setInterventions(prev => 
      prev.map(item => item.id === id ? { ...item, status: newStatus } : item)
    );
  };

  // Map database items to KanbanItem objects
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mappedItems: KanbanItem[] = interventions.map((item: any) => {
    const profile = item.profiles;
    const classNode = item.classes;
    const classTitle = classNode ? `${classNode.subjects?.code} - ${classNode.subjects?.name} (${classNode.group_code})` : "General";
    
    // Days pending calculation
    const days = Math.max(0, Math.floor((Date.now() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24)));

    return {
      id: profile?.institutional_id || "Unknown",
      interventionId: item.id,
      name: profile?.full_name || "Unknown Student",
      issue: item.issue_description,
      daysPending: days,
      priority: item.priority || "medium",
      class: classTitle,
      status: item.status || "needs_review"
    };
  });

  // Filter items by selected class
  const filteredItems = selectedClass === "All Classes" 
    ? mappedItems 
    : mappedItems.filter(item => item.class === selectedClass);

  const needsReviewItems = filteredItems.filter(item => item.status === "needs_review");
  const inProgressItems = filteredItems.filter(item => item.status === "in_progress");
  const referredItems = filteredItems.filter(item => item.status === "referred");
  const resolvedItems = filteredItems.filter(item => item.status === "resolved");

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center bg-slate-50 min-h-screen">Loading interventions...</div>;
  }

  return (
    <main className="flex-1 p-8 h-screen flex flex-col bg-[#FAF9F6] overflow-hidden">
      
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
                  {classesList.map((cls) => (
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
              {needsReviewItems.length} Action Required
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
              {needsReviewItems.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {needsReviewItems.map((student) => (
              <KanbanCard key={student.interventionId} data={student} onUpdateStatus={handleUpdateStatus} />
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
              {inProgressItems.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {inProgressItems.map((student) => (
              <KanbanCard key={student.interventionId} data={student} onUpdateStatus={handleUpdateStatus} />
            ))}
          </div>
        </div>

        {/* Column 3: External Referral */}
        <div className="flex-1 flex flex-col min-w-[280px]">
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              External Referral
            </h3>
            <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {referredItems.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {referredItems.map((student) => (
              <KanbanCard key={student.interventionId} data={student} onUpdateStatus={handleUpdateStatus} />
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
              {resolvedItems.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {resolvedItems.map((student) => (
              <KanbanCard key={student.interventionId} data={student} onUpdateStatus={handleUpdateStatus} isResolved />
            ))}
          </div>
        </div>

      </div>
    </main>
  );
}

// Kanban Card Component
function KanbanCard({ 
  data, 
  onUpdateStatus, 
  isResolved = false 
}: { 
  data: KanbanItem; 
  onUpdateStatus: (id: string, newStatus: string) => Promise<void>; 
  isResolved?: boolean;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const statuses = [
    { label: "Needs Review", value: "needs_review" },
    { label: "In Progress", value: "in_progress" },
    { label: "Referral", value: "referred" },
    { label: "Resolved", value: "resolved" }
  ];

  return (
    <div className={`bg-white p-5 rounded-2xl border shadow-sm group hover:shadow-md transition-all relative ${isResolved ? 'border-emerald-100 bg-emerald-50/30' : 'border-slate-200'}`}>
      <div className="flex justify-between items-start mb-3">
        <div className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
          data.priority === 'high' ? 'bg-red-50 text-red-700' : 
          data.priority === 'medium' ? 'bg-orange-50 text-orange-700' : 
          'bg-slate-100 text-slate-600'
        }`}>
          {data.priority} Priority
        </div>
        <div className="relative">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-slate-400 hover:text-slate-900 transition-colors p-1 bg-transparent border-none cursor-pointer"
          >
            <MoreHorizontal size={18} />
          </button>
          
          {isMenuOpen && (
            <div className="absolute right-0 mt-1 w-40 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden py-1">
              <p className="text-[10px] font-bold text-slate-400 px-3 py-1 bg-slate-50 tracking-wider">CHANGE STATUS</p>
              {statuses.map(st => (
                <button
                  key={st.value}
                  onClick={async () => {
                    await onUpdateStatus(data.interventionId, st.value);
                    setIsMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition-colors flex items-center justify-between ${data.status === st.value ? 'text-blue-600 font-bold' : 'text-slate-700'}`}
                >
                  {st.label}
                  {data.status === st.value && <Check size={12} />}
                </button>
              ))}
            </div>
          )}
        </div>
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
          <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border-none bg-transparent cursor-pointer">
            <MessageSquare size={16} />
          </button>
          <div className="p-1.5 text-slate-300">
            <GripVertical size={16} />
          </div>
        </div>
      </div>
    </div>
  );
}