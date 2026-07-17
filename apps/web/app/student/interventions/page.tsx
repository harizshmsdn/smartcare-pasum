// apps/web/app/student/interventions/page.tsx
"use client";

import { useState, useEffect } from "react";
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Mail, 
  CalendarDays,
  ShieldCheck,
  TrendingDown
} from "lucide-react";
import { createClient } from "../../../utils/supabase/client";

export default function StudentInterventionsPage() {
  const supabase = createClient();
  const [interventions, setInterventions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInterventions = async () => {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch open interventions for the student (excluding resolved ones)
        const { data } = await supabase
          .from('interventions')
          .select(`
            id,
            issue_description,
            status,
            priority,
            created_at,
            lecturer:profiles!lecturer_id (
              full_name,
              email
            ),
            classes (
              group_code,
              subjects (
                code,
                name
              )
            )
          `)
          .eq('student_id', user.id)
          .neq('status', 'resolved')
          .order('created_at', { ascending: false });

        if (data) {
          setInterventions(data);
        }
      } catch (err) {
        console.error("Error fetching interventions for student:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInterventions();
  }, [supabase]);

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center bg-slate-50 min-h-screen">Loading case files...</div>;
  }

  const activeCount = interventions.length;

  return (
    <main className="flex-1 p-8 overflow-y-auto bg-[#FAF9F6]">
      {/* Header */}
      <header className="mb-8">
        <h2 className="text-3xl font-semibold text-slate-900 flex items-center gap-3">
          My Cases & Interventions
          {activeCount > 0 && (
            <span className="bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
              {activeCount} Active
            </span>
          )}
        </h2>
        <p className="text-slate-500 mt-1">Review active support plans or academic warnings initiated by lecturers</p>
      </header>

      <div className="w-full max-w-4xl">
        {activeCount > 0 ? (
          <div className="space-y-6">
            {interventions.map((item) => {
              const classNode = item.classes;
              const subjectNode = classNode?.subjects;
              const subjectText = subjectNode ? `${subjectNode.code} - ${subjectNode.name} (${classNode.group_code})` : "General Support Case";
              
              const dateStr = new Date(item.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

              return (
                <div key={item.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-200">
                  {/* Warning Banner */}
                  <div className={`p-4 flex items-center gap-3 text-white font-semibold ${
                    item.priority === 'critical' ? 'bg-red-655' : 
                    item.priority === 'high' ? 'bg-orange-655' : 
                    'bg-blue-600'
                  }`}>
                    <AlertTriangle size={20} />
                    <span>Active Support Plan Flagged — {item.priority.toUpperCase()} Priority</span>
                  </div>

                  {/* Body details */}
                  <div className="p-8 space-y-6">
                    <div className="flex justify-between items-start flex-wrap gap-4 border-b border-slate-100 pb-6">
                      <div>
                        <span className="text-xs font-bold bg-slate-100 text-slate-650 px-2 py-0.5 rounded">
                          {classNode?.group_code || 'General'}
                        </span>
                        <h3 className="text-2xl font-bold text-slate-900 mt-2">{subjectText}</h3>
                        <p className="text-slate-450 text-sm mt-1 flex items-center gap-1.5 font-medium">
                          <Clock size={14} /> Logged on {dateStr}
                        </p>
                      </div>
                      
                      <div className="flex gap-2">
                        <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${
                          item.status === 'needs_review' ? 'bg-red-50 border-red-200 text-red-800' :
                          item.status === 'in_progress' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                          'bg-blue-50 border-blue-200 text-blue-800'
                        }`}>
                          {item.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-2">Issue / Lecturer Feedback</h4>
                      <p className="text-slate-655 text-sm leading-relaxed bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                        {item.issue_description}
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-xl border border-slate-100 bg-slate-50/30 gap-4">
                      <div>
                        <p className="text-slate-400 text-xs font-bold uppercase">Case Manager</p>
                        <p className="font-bold text-slate-800 text-sm mt-1">{item.lecturer?.full_name || "Assigned Lecturer"}</p>
                      </div>
                      
                      {/* Action trigger mail link */}
                      <a 
                        href={`mailto:${item.lecturer?.email}?subject=Intervention Meeting Request - PASUM&body=Hello ${item.lecturer?.full_name}, I would like to schedule a session regarding my support plan for ${subjectNode?.code || 'class'}.`}
                        className="flex items-center justify-center gap-2 bg-[#0b2240] hover:bg-[#12253f] text-white font-semibold px-5 py-3 rounded-xl transition-all shadow-sm active:scale-95 text-xs text-center w-full sm:w-auto"
                      >
                        <Mail size={16} /> Contact Instructor
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Success Empty State */
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm flex flex-col items-center justify-center py-20 max-w-2xl mx-auto">
            <div className="bg-emerald-50 p-5 rounded-full text-emerald-600 mb-6">
              <ShieldCheck size={48} strokeWidth={2.5} />
            </div>
            <h3 className="text-2xl font-bold text-slate-900">You have no cases</h3>
            <p className="text-slate-500 mt-2 max-w-sm text-sm">
              Keep up the performance! You are fully on track with all attendance thresholds and assessment compliance guidelines.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
