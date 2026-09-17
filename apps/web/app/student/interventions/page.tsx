// Student Cases & Interventions page in sharp dark neutral style
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "../../../utils/supabase/client";
import { studentService } from "../../../lib/services/student";
import EmptyState from "../../../components/EmptyState";
import PixelIcon from "../../../components/PixelIcon";

export default function StudentInterventionsPage() {
  const supabase = createClient();
  const [interventions, setInterventions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetches intervention cases assigned to student
  const fetchInterventions = async () => {
    setIsLoading(true);
    try {
      const data = await studentService.getInterventions();
      const formatted = (data.interventions || []).map((i: any) => ({
        id: i.id,
        issue_description: i.issue_description,
        status: i.status,
        priority: i.priority,
        created_at: i.created_at,
        lecturer: {
          full_name: i.lecturer_name,
          email: i.lecturer_email
        },
        classes: {
          group_code: i.group_code,
          subjects: {
            code: i.subject_code,
            name: i.subject_name
          }
        }
      }));
      setInterventions(formatted);
    } catch (err) {
      console.error("Error fetching interventions for student:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInterventions();

    // Subscribe to realtime changes on interventions table
    const channel = supabase
      .channel('student_interventions_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'interventions' }, () => {
        fetchInterventions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  if (isLoading) {
    return (
      <main className="flex-1 p-6 lg:p-8 overflow-y-auto bg-transparent text-white">
        <div className="mb-6 flex justify-between items-center">
          <div className="w-32 h-4 bg-white/10 rounded-none animate-pulse"></div>
          <div className="w-24 h-4 bg-white/10 rounded-none animate-pulse"></div>
        </div>
        <header className="mb-8">
          <div className="w-56 h-8 bg-white/10 rounded-none animate-pulse mb-2"></div>
          <div className="w-80 h-4 bg-white/10 rounded-none animate-pulse"></div>
        </header>
        <div className="w-full max-w-4xl space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-[#08090c]/80 border border-white/15 p-6 rounded-none animate-pulse">
              <div className="h-6 bg-white/10 w-1/3 mb-4"></div>
              <div className="h-16 bg-white/5 w-full"></div>
            </div>
          ))}
        </div>
      </main>
    );
  }

  const activeCount = interventions.length;

  return (
    <main className="flex-1 p-6 lg:p-8 overflow-y-auto bg-transparent text-white font-sans">
      {/* Navigation Breadcrumb */}
      <div className="mb-6 flex justify-between items-center">
        <Link href="/student/classes" className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors uppercase">
          ← Back to Enrolled Courses
        </Link>
        <span className="text-[10px] text-white/40 uppercase font-mono">STUDENT WORKSPACE</span>
      </div>

      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight text-white uppercase">
            Cases & Interventions
          </h2>
          {activeCount > 0 && (
            <span className="bg-rose-500/20 text-rose-300 border border-rose-400/40 text-[10px] font-bold px-2.5 py-0.5 rounded-none uppercase">
              {activeCount} Active
            </span>
          )}
        </div>
        <p className="text-xs text-white/60 mt-1">Review active support plans or academic notices initiated by lecturers</p>
      </header>

      {/* Feature Disabled Banner */}
      <div className="mb-6 p-4 rounded-none bg-amber-500/10 border border-amber-400/30 flex items-center justify-between gap-3 text-amber-300 max-w-4xl">
        <div className="flex items-center gap-3">
          <PixelIcon name="warning" size={20} className="text-amber-400 shrink-0" />
          <div>
            <p className="text-xs font-bold uppercase">Feature Temporarily Suspended</p>
            <p className="text-[11px] text-amber-300/80 mt-0.5">Student support case tracking and active interventions are currently disabled.</p>
          </div>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-none bg-amber-500/20 text-amber-300 border border-amber-400/40 shrink-0">
          Disabled
        </span>
      </div>

      <div className="relative group/disabled w-full max-w-4xl cursor-not-allowed" title="Disabled Feature">
        <div className="pointer-events-none absolute top-4 right-4 hidden group-hover/disabled:flex items-center px-2.5 py-1 text-[10px] font-bold text-white bg-black border border-white/20 whitespace-nowrap z-50">
          Disabled Feature
        </div>
        <div className="w-full opacity-50 grayscale pointer-events-none select-none">
          {activeCount > 0 ? (
            <div className="space-y-4">
              {interventions.map((item) => {
                const classNode = item.classes;
                const subjectNode = classNode?.subjects;
                const subjectText = subjectNode ? `${subjectNode.code} - ${subjectNode.name} (${classNode.group_code})` : "General Support Case";
                const dateStr = new Date(item.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

                return (
                  <div key={item.id} className="bg-[#08090c]/80 border border-white/15 rounded-none shadow-xl backdrop-blur-md overflow-hidden">
                    {/* Priority Banner */}
                    <div className={`p-3.5 flex items-center gap-2 text-xs font-bold uppercase border-b ${
                      item.priority === 'critical' ? 'bg-rose-500/20 text-rose-300 border-rose-400/30' :
                      item.priority === 'high' ? 'bg-amber-500/20 text-amber-300 border-amber-400/30' :
                      'bg-blue-500/20 text-blue-300 border-blue-400/30'
                    }`}>
                      <PixelIcon name="warning" size={16} />
                      <span>Active Support Case Flagged — {item.priority.toUpperCase()} Priority</span>
                    </div>

                    {/* Case Details */}
                    <div className="p-6 space-y-4 text-xs">
                      <div className="flex justify-between items-start flex-wrap gap-4 border-b border-white/10 pb-4">
                        <div>
                          <span className="text-[10px] font-bold bg-white/5 text-white/70 px-2 py-0.5 rounded-none border border-white/10 uppercase">
                            {classNode?.group_code || 'General'}
                          </span>
                          <h3 className="text-xl font-bold text-white mt-1.5">{subjectText}</h3>
                          <p className="text-white/50 text-xs mt-1">Logged on {dateStr}</p>
                        </div>

                        <div>
                          <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-none border ${
                            item.status === 'needs_review' ? 'bg-rose-500/15 border-rose-400/30 text-rose-300' :
                            item.status === 'in_progress' ? 'bg-amber-500/15 border-amber-400/30 text-amber-300' :
                            'bg-blue-500/15 border-blue-400/30 text-blue-300'
                          }`}>
                            {item.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-bold text-slate-400 text-[10px] uppercase tracking-wider mb-1.5">
                          Lecturer Feedback & Notes
                        </h4>
                        <p className="text-white/80 text-xs leading-relaxed bg-black/30 p-4 border border-white/10 rounded-none">
                          {item.issue_description}
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3.5 border border-white/10 bg-white/5 gap-3">
                        <div>
                          <p className="text-slate-400 text-[10px] font-bold uppercase">Case Manager</p>
                          <p className="font-bold text-white text-xs mt-0.5">{item.lecturer?.full_name || "Assigned Lecturer"}</p>
                        </div>

                        <a
                          href={`mailto:${item.lecturer?.email}?subject=Intervention Meeting Request - PASUM&body=Hello ${item.lecturer?.full_name}, I would like to schedule a session regarding my support plan for ${subjectNode?.code || 'class'}.`}
                          className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white font-bold px-4 py-2 text-[10px] uppercase border border-white/20 transition-colors cursor-pointer"
                        >
                          Contact Instructor
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-16 max-w-2xl mx-auto">
              <EmptyState 
                icon="shield"
                title="No Cases Flagged"
                description="Keep up the great work! You are fully on track with all attendance thresholds and assessment requirements."
              />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
