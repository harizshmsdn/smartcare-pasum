// apps/web/app/interventions/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { 
  ArrowLeft,
  AlertTriangle,
  Clock,
  CheckCircle2,
  MoreHorizontal,
  GripVertical,
  ChevronDown,
  Check,
  X
} from "lucide-react";
import { createClient } from "../../utils/supabase/client";
import { api } from "../../lib/api";
import BorderGlow from "../../components/BorderGlow";

interface KanbanItem {
  id: string; // Institutional ID (Matric)
  studentUuid?: string;
  role?: string;
  interventionId: string; // DB primary key
  name: string;
  issue: string;
  daysPending: number;
  priority: string;
  class: string;
  status: string;
}

interface ClassOption {
  id: string;
  code: string;
  name: string;
  group_code: string;
}

function InterventionsBoardContent() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  
  const paramStudentId = searchParams.get("studentId");
  const paramClassId = searchParams.get("classId");
  const highlightStudentId = searchParams.get("highlightStudentId");

  // Interventions lists state
  const [interventions, setInterventions] = useState<any[]>([]);
  const [classesList, setClassesList] = useState<string[]>(["All Classes"]);
  const [selectedClass, setSelectedClass] = useState("All Classes");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Drag and Drop active column tracker
  const [activeDragColumn, setActiveDragColumn] = useState<string | null>(null);

  // Modal form states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lecturerClasses, setLecturerClasses] = useState<ClassOption[]>([]);
  
  const [addModalStudentId, setAddModalStudentId] = useState("");
  const [addModalStudentName, setAddModalStudentName] = useState("");
  const [addModalClassId, setAddModalClassId] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [statusVal, setStatusVal] = useState("needs_review");
  const [priorityVal, setPriorityVal] = useState("medium");
  const [scheduleAdvising, setScheduleAdvising] = useState(false);

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
        student:profiles!student_id (
          institutional_id,
          full_name
        ),
        classes (
          id,
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

  // Fetch all classes taught by this lecturer
  const fetchLecturerClasses = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('classes')
      .select(`
        id,
        group_code,
        subjects (
          code,
          name
        )
      `)
      .eq('lecturer_id', user.id);

    if (data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formatted: ClassOption[] = data.map((c: any) => ({
        id: c.id,
        code: c.subjects?.code || "GEN",
        name: c.subjects?.name || "General",
        group_code: c.group_code
      }));
      setLecturerClasses(formatted);
    }
  };

  useEffect(() => {
    loadInterventions();
    fetchLecturerClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Trigger modal if query parameters are present
  useEffect(() => {
    if (paramStudentId) {
      const getStudentName = async () => {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, institutional_id')
          .eq('id', paramStudentId)
          .single();

        if (data) {
          setAddModalStudentId(paramStudentId);
          setAddModalStudentName(`${data.full_name} (${data.institutional_id})`);
          if (paramClassId) {
            setAddModalClassId(paramClassId);
          }
          setIsAddModalOpen(true);
        }
      };
      getStudentName();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramStudentId, paramClassId]);

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

  const handleCreateIntervention = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addModalStudentId || !addModalClassId || !issueDescription.trim()) {
      alert("Please fill in all mandatory fields: Student, Class, and Reason.");
      return;
    }

    setIsSaving(true);
    try {
      // Prefer POST call to API client to execute backend email notifications
      await api.post("/api/interventions", {
        student_id: addModalStudentId,
        class_id: addModalClassId,
        issue_description: issueDescription,
        status: statusVal,
        priority: priorityVal,
        schedule_advising: scheduleAdvising
      });

      await loadInterventions();
      closeModal();
    } catch (err) {
      console.warn("FastAPI creation offline, falling back to direct Supabase insert:", err);
      await runFallbackInsert();
    } finally {
      setIsSaving(false);
    }
  };

  const runFallbackInsert = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('interventions')
      .insert({
        student_id: addModalStudentId,
        class_id: addModalClassId,
        lecturer_id: user.id,
        issue_description: issueDescription,
        status: statusVal,
        priority: priorityVal
      });

    if (error) {
      alert(`Error creating intervention: ${error.message}`);
      return;
    }

    if (scheduleAdvising) {
      // Fetch class details for fallback alert label
      const activeClass = lecturerClasses.find(c => c.id === addModalClassId);
      const subjectLabel = activeClass ? `${activeClass.code} (${activeClass.group_code})` : "Class";

      await supabase.from('alerts').insert({
        lecturer_id: user.id,
        student_id: addModalStudentId,
        class_id: addModalClassId,
        type: 'academic',
        priority: priorityVal,
        message: `Academic advising scheduled for your class: ${subjectLabel}. Please check in with your lecturer.`,
        is_read: false
      });
    }

    alert("Intervention created (local fallback mode - email not sent).");
    await loadInterventions();
    closeModal();
  };

  const closeModal = () => {
    setIsAddModalOpen(false);
    setIssueDescription("");
    setScheduleAdvising(false);
    setStatusVal("needs_review");
    setPriorityVal("medium");
  };

  // Drag and Drop helpers
  const handleDragOver = (e: React.DragEvent, colName: string) => {
    e.preventDefault();
    if (activeDragColumn !== colName) {
      setActiveDragColumn(colName);
    }
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const interventionId = e.dataTransfer.getData("text/plain");
    if (interventionId) {
      await handleUpdateStatus(interventionId, newStatus);
    }
    setActiveDragColumn(null);
  };

  // Map database items to KanbanItem objects
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mappedItems: KanbanItem[] = interventions.map((item: any) => {
    const profile = item.student;
    const classNode = item.classes;
    const classTitle = classNode ? `${classNode.subjects?.code} - ${classNode.subjects?.name} (${classNode.group_code})` : "General";
    
    // Days pending calculation
    const days = Math.max(0, Math.floor((Date.now() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24)));

    return {
      id: profile?.institutional_id || "Unknown",
      studentUuid: profile?.id || "",
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
          
          <div className="flex items-center gap-3">
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
        <div 
          onDragOver={(e) => handleDragOver(e, "needs_review")}
          onDragLeave={() => setActiveDragColumn(null)}
          onDrop={(e) => handleDrop(e, "needs_review")}
          className={`flex-1 flex flex-col min-w-[280px] p-3 rounded-2xl transition-all duration-200 border-2 ${activeDragColumn === 'needs_review' ? 'bg-blue-50/30 border-dashed border-blue-300' : 'border-transparent'}`}
        >
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
            {needsReviewItems.map((student) => {
              const shouldGlow = student.studentUuid === highlightStudentId;
              const cardElement = <KanbanCard key={student.interventionId} data={student} onUpdateStatus={handleUpdateStatus} />;
              return shouldGlow ? (
                <BorderGlow 
                  key={student.interventionId} 
                  animated={true} 
                  glowColor="59 130 246"
                  backgroundColor="#ffffff"
                  borderRadius={16}
                  className="p-[1px] bg-slate-200"
                >
                  {cardElement}
                </BorderGlow>
              ) : cardElement;
            })}
          </div>
        </div>

        {/* Column 2: In Progress */}
        <div 
          onDragOver={(e) => handleDragOver(e, "in_progress")}
          onDragLeave={() => setActiveDragColumn(null)}
          onDrop={(e) => handleDrop(e, "in_progress")}
          className={`flex-1 flex flex-col min-w-[280px] p-3 rounded-2xl transition-all duration-200 border-2 ${activeDragColumn === 'in_progress' ? 'bg-blue-50/30 border-dashed border-blue-300' : 'border-transparent'}`}
        >
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
            {inProgressItems.map((student) => {
              const shouldGlow = student.studentUuid === highlightStudentId;
              const cardElement = <KanbanCard key={student.interventionId} data={student} onUpdateStatus={handleUpdateStatus} />;
              return shouldGlow ? (
                <BorderGlow 
                  key={student.interventionId} 
                  animated={true} 
                  glowColor="59 130 246"
                  backgroundColor="#ffffff"
                  borderRadius={16}
                  className="p-[1px] bg-slate-200"
                >
                  {cardElement}
                </BorderGlow>
              ) : cardElement;
            })}
          </div>
        </div>

        {/* Column 3: External Referral */}
        <div 
          onDragOver={(e) => handleDragOver(e, "referred")}
          onDragLeave={() => setActiveDragColumn(null)}
          onDrop={(e) => handleDrop(e, "referred")}
          className={`flex-1 flex flex-col min-w-[280px] p-3 rounded-2xl transition-all duration-200 border-2 ${activeDragColumn === 'referred' ? 'bg-blue-50/30 border-dashed border-blue-300' : 'border-transparent'}`}
        >
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
            {referredItems.map((student) => {
              const shouldGlow = student.studentUuid === highlightStudentId;
              const cardElement = <KanbanCard key={student.interventionId} data={student} onUpdateStatus={handleUpdateStatus} />;
              return shouldGlow ? (
                <BorderGlow 
                  key={student.interventionId} 
                  animated={true} 
                  glowColor="59 130 246"
                  backgroundColor="#ffffff"
                  borderRadius={16}
                  className="p-[1px] bg-slate-200"
                >
                  {cardElement}
                </BorderGlow>
              ) : cardElement;
            })}
          </div>
        </div>

        {/* Column 4: Resolved */}
        <div 
          onDragOver={(e) => handleDragOver(e, "resolved")}
          onDragLeave={() => setActiveDragColumn(null)}
          onDrop={(e) => handleDrop(e, "resolved")}
          className={`flex-1 flex flex-col min-w-[280px] p-3 rounded-2xl transition-all duration-200 border-2 ${activeDragColumn === 'resolved' ? 'bg-blue-50/30 border-dashed border-blue-300' : 'border-transparent'}`}
        >
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
            {resolvedItems.map((student) => {
              const shouldGlow = student.studentUuid === highlightStudentId;
              const cardElement = <KanbanCard key={student.interventionId} data={student} onUpdateStatus={handleUpdateStatus} isResolved />;
              return shouldGlow ? (
                <BorderGlow 
                  key={student.interventionId} 
                  animated={true} 
                  glowColor="16 185 129"
                  backgroundColor="#f0fdf4"
                  borderRadius={16}
                  className="p-[1px] bg-slate-200"
                >
                  {cardElement}
                </BorderGlow>
              ) : cardElement;
            })}
          </div>
        </div>

      </div>

      {/* Add Intervention Modal Overlay */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] font-sans">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="text-blue-600 animate-pulse" size={20} />
                  Setup New Intervention
                </h3>
                <p className="text-xs text-slate-500 mt-1">Submit academic warning and notify the student</p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors cursor-pointer border-none bg-transparent"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            <form onSubmit={handleCreateIntervention} className="p-6 overflow-y-auto flex-1 space-y-5">
              
              {/* Student Identity (Read-only) */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Student</label>
                <input
                  type="text"
                  readOnly
                  value={addModalStudentName || "Loading..."}
                  className="w-full bg-slate-100 border border-slate-200 text-slate-600 font-medium px-4 py-2.5 rounded-xl outline-none cursor-not-allowed"
                />
              </div>

              {/* Class Dropdown Switcher (Mandatory) */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Class Focus <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={addModalClassId}
                  onChange={(e) => setAddModalClassId(e.target.value)}
                  className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-semibold px-4 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="" disabled>Select subject/class</option>
                  {lecturerClasses.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.code} - {cls.name} ({cls.group_code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Reason Description (Mandatory) */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Reason for Intervention <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Specify academic warning triggers e.g., Low continuous assessment scores, skipped lectures..."
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-800 text-sm p-4 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
                />
              </div>

              {/* Status and Priority Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Status</label>
                  <select
                    value={statusVal}
                    onChange={(e) => setStatusVal(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-800 font-semibold px-3 py-2.5 rounded-xl outline-none cursor-pointer"
                  >
                    <option value="needs_review">Needs Review</option>
                    <option value="in_progress">In Progress</option>
                    <option value="referred">Referred</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Priority</label>
                  <select
                    value={priorityVal}
                    onChange={(e) => setPriorityVal(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-800 font-semibold px-3 py-2.5 rounded-xl outline-none cursor-pointer"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              {/* Schedule Academic Advising Checkbox Option */}
              <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 hover:bg-slate-100/50 transition-colors">
                <input
                  type="checkbox"
                  id="advise_opt"
                  checked={scheduleAdvising}
                  onChange={(e) => setScheduleAdvising(e.target.checked)}
                  className="w-4.5 h-4.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                />
                <label htmlFor="advise_opt" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                  Schedule Academic Advising session
                  <span className="block text-[10px] text-slate-400 font-normal mt-0.5">Sends a mandatory calendar notification to the student</span>
                </label>
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 pt-3 border-t border-slate-100 bg-white">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer border-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors cursor-pointer border-none disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Create Case"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </main>
  );
}

export default function InterventionsPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center bg-slate-50 min-h-screen">Loading interventions...</div>}>
      <InterventionsBoardContent />
    </Suspense>
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
  const [isDraggable, setIsDraggable] = useState(false);

  const statuses = [
    { label: "Needs Review", value: "needs_review" },
    { label: "In Progress", value: "in_progress" },
    { label: "Referral", value: "referred" },
    { label: "Resolved", value: "resolved" }
  ];

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", data.interventionId);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div 
      draggable={isDraggable}
      onDragStart={handleDragStart}
      onDragEnd={() => setIsDraggable(false)}
      className={`bg-white p-5 rounded-2xl border shadow-sm group hover:shadow-md transition-all relative select-none ${isDraggable ? 'opacity-60 cursor-grabbing' : ''} ${isResolved ? 'border-emerald-100 bg-emerald-50/30' : 'border-slate-200'}`}
    >
      <div className="flex justify-between items-start mb-3">
        <div className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
          data.priority === 'critical' ? 'bg-red-100 text-red-800' :
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
          <div 
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-grab active:cursor-grabbing transition-colors"
            onMouseDown={() => setIsDraggable(true)}
            onMouseUp={() => setIsDraggable(false)}
          >
            <GripVertical size={18} />
          </div>
        </div>
      </div>
    </div>
  );
}