// Class Assessments and Gradebook Matrix page in dottxt.ai sharp dark style
"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../../utils/supabase/client";
import { api } from "../../../lib/api";
import PixelIcon from "../../../components/PixelIcon";

interface ClassOption {
  id: string;
  name: string;
}

interface AssessmentItem {
  id: string;
  title: string;
  type: string;
  weightage: number;
  total_marks: number;
  created_at: string;
}

interface StudentRosterScore {
  student_id: string;
  student_name: string;
  matric_id: string;
  scores: { [assessment_id: string]: number };
}

export default function ClassAssessmentsPage() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const initialClassId = searchParams.get("classId");

  const [classesList, setClassesList] = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId || "");
  const [selectedClassName, setSelectedClassName] = useState<string>("Loading...");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<"matrix" | "list" | "create">("matrix");
  const [assessments, setAssessments] = useState<AssessmentItem[]>([]);
  const [rosterScores, setRosterScores] = useState<StudentRosterScore[]>([]);
  const [editingScores, setEditingScores] = useState<{ [key: string]: number | string }>({});

  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("Continuous");
  const [newWeightage, setNewWeightage] = useState("10");
  const [newTotalMarks, setNewTotalMarks] = useState("20");
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingScore, setIsSavingScore] = useState(false);
  const [assessmentToDelete, setAssessmentToDelete] = useState<AssessmentItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch lecturer classes list
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: classesData } = await supabase
          .from('classes')
          .select(`
            id,
            group_code,
            subjects ( code, name )
          `)
          .eq('lecturer_id', user.id);

        if (classesData && classesData.length > 0) {
          const formatted: ClassOption[] = classesData.map((c: any) => ({
            id: c.id,
            name: `${c.subjects?.code} - ${c.subjects?.name} (${c.group_code})`
          }));
          setClassesList(formatted);

          const target = formatted.find(c => c.id === initialClassId) || formatted[0];
          if (target) {
            setSelectedClassId(target.id);
            setSelectedClassName(target.name);
          }
        }
      } catch (err) {
        console.error("Error loading lecturer classes:", err);
      }
    };
    fetchClasses();
  }, []);

  // Fetch class assessments and gradebook matrix
  const fetchClassAssessmentsData = async (classId: string) => {
    setIsLoading(true);
    try {
      try {
        const data = await api.get(`/api/classes/${classId}/assessments`);
        setAssessments(data.assessments || []);
        setRosterScores(data.roster || []);
        setIsLoading(false);
        return;
      } catch (apiErr) {
        console.warn("FastAPI assessments error, falling back to direct Supabase query:", apiErr);
      }

      // Direct Supabase query fallback for assessments & roster
      const [
        { data: dbAssessments },
        { data: dbEnrollments }
      ] = await Promise.all([
        supabase.from('assessments').select('*').eq('class_id', classId).order('created_at', { ascending: true }),
        supabase.from('enrollments').select('id, student_id, current_attendance_rate, profiles:student_id (id, full_name, email, institutional_id)').eq('class_id', classId)
      ]);

      const formattedAssessments: AssessmentItem[] = (dbAssessments || []).map((a: any) => ({
        id: a.id,
        title: a.title,
        type: a.type || 'Continuous',
        weightage: Number(a.weightage || 10),
        total_marks: Number(a.total_marks || 100),
        created_at: a.created_at || new Date().toISOString()
      }));
      setAssessments(formattedAssessments);

      const assessmentIds = formattedAssessments.map((a: any) => a.id);
      let studentScoresMap: Record<string, Record<string, number>> = {};

      if (assessmentIds.length > 0) {
        const { data: scores } = await supabase
          .from('student_scores')
          .select('student_id, assessment_id, score_achieved')
          .in('assessment_id', assessmentIds);

        (scores || []).forEach((s: any) => {
          if (!studentScoresMap[s.student_id]) studentScoresMap[s.student_id] = {};
          const studentEntry = studentScoresMap[s.student_id];
          if (studentEntry) {
            studentEntry[s.assessment_id] = Number(s.score_achieved);
          }
        });
      }

      const formattedRoster: StudentRosterScore[] = (dbEnrollments || []).map((e: any) => {
        const prof = e.profiles;
        const studentId = prof?.id || e.student_id;
        return {
          student_id: studentId,
          student_name: prof?.full_name || 'Student',
          matric_id: prof?.institutional_id || 'ID',
          scores: studentScoresMap[studentId] || {}
        };
      });
      setRosterScores(formattedRoster);
    } catch (err: any) {
      console.error("Failed to fetch class assessments:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedClassId) {
      fetchClassAssessmentsData(selectedClassId);
    }
  }, [selectedClassId]);

  const backUrl = selectedClassId ? `/classes?classId=${selectedClassId}` : "/classes";

  const totalWeightage = assessments.reduce((sum, a) => sum + (a.weightage || 0), 0);

  let overallAvgScore = 0;
  if (rosterScores.length > 0 && assessments.length > 0) {
    let totalScorePctSum = 0;
    let count = 0;
    rosterScores.forEach(student => {
      assessments.forEach(a => {
        const sc = student.scores?.[a.id];
        if (sc !== undefined && sc !== null && a.total_marks > 0) {
          totalScorePctSum += (sc / a.total_marks) * 100;
          count++;
        }
      });
    });
    overallAvgScore = count > 0 ? Math.round(totalScorePctSum / count) : 0;
  }

  // Remove an assessment and synchronize client state
  const handleDeleteAssessment = async (assessmentId: string) => {
    setIsDeleting(true);
    try {
      await api.delete(`/api/assessments/${assessmentId}`);
      setAssessments((prev) => prev.filter((a) => a.id !== assessmentId));
      setRosterScores((prev) =>
        prev.map((student) => {
          const updatedScores = { ...student.scores };
          delete updatedScores[assessmentId];
          return { ...student, scores: updatedScores };
        })
      );
      setEditingScores((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((key) => {
          if (key.endsWith(`_${assessmentId}`)) {
            delete next[key];
          }
        });
        return next;
      });
      setAssessmentToDelete(null);
    } catch (err: any) {
      alert("Failed to delete assessment: " + (err.detail || err.message || "Error"));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <main className="flex-1 p-8 h-screen flex flex-col bg-transparent text-white overflow-y-auto">
      {/* Header & Navigation */}
      <header className="shrink-0 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="mb-3">
            <Link
              href={backUrl}
              className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors"
            >
              ← BACK TO CLASS ROSTER
            </Link>
          </div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-none" />
            <span className="text-xs text-emerald-400 uppercase tracking-wider font-semibold">
              GRADING & EXAMS
            </span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight uppercase flex items-center gap-3">
            <PixelIcon name="book" size={28} className="text-emerald-400" />
            Assessments & Gradebook
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Manage continuous assessments, major exams, and student scores
          </p>
        </div>

        {/* Class View Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-3 bg-[#08090c]/90 border border-white/20 text-white px-4 py-2.5 rounded-none text-xs shadow-lg hover:border-white/40 transition-colors cursor-pointer"
          >
            <div className="flex flex-col text-left">
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-widest leading-none mb-1">
                TARGET CLASS
              </span>
              <span className="leading-none font-bold text-white">{selectedClassName}</span>
            </div>
            <span className="text-slate-400 text-xs ml-2">▼</span>
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-1 w-full min-w-[260px] bg-[#08090c] border border-white/20 rounded-none shadow-2xl z-50 overflow-hidden text-xs">
              {classesList.map((cls) => (
                <button
                  key={cls.id}
                  onClick={() => {
                    setSelectedClassId(cls.id);
                    setSelectedClassName(cls.name);
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 hover:bg-white/10 transition-colors border-b border-white/10 last:border-b-0 cursor-pointer ${selectedClassId === cls.id ? 'bg-emerald-600/20 text-emerald-300 font-bold' : 'text-slate-300'
                    }`}
                >
                  {cls.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Top Bento Metrics Row (4 Columns, 1 Row) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6 shrink-0">
        <div className="bg-[#08090c]/80 p-5 rounded-none border border-white/15 shadow-xl flex items-center gap-4 backdrop-blur-md">
          <div className="p-3 bg-emerald-500/10 border border-emerald-400/20 text-emerald-400 rounded-none shrink-0">
            <PixelIcon name="book" size={24} />
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <p className="text-xs text-slate-400 uppercase tracking-wider">Set Assessments</p>
            </div>
            <p className="text-2xl font-bold text-white leading-tight">{assessments.length}</p>
          </div>
        </div>

        <div className="bg-[#08090c]/80 p-5 rounded-none border border-white/15 shadow-xl flex items-center gap-4 backdrop-blur-md">
          <div className="p-3 bg-indigo-500/10 border border-indigo-400/20 text-indigo-400 rounded-none shrink-0">
            <PixelIcon name="award" size={24} />
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <p className="text-xs text-slate-400 uppercase tracking-wider">Total Weightage</p>
            </div>
            <p className="text-2xl font-bold text-white leading-tight">{totalWeightage}%</p>
          </div>
        </div>

        <div className="bg-[#08090c]/80 p-5 rounded-none border border-white/15 shadow-xl flex items-center gap-4 backdrop-blur-md">
          <div className="p-3 bg-emerald-500/10 border border-emerald-400/20 text-emerald-400 rounded-none shrink-0">
            <PixelIcon name="graduation" size={24} />
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <p className="text-xs text-slate-400 uppercase tracking-wider">Enrolled Roster</p>
            </div>
            <p className="text-2xl font-bold text-white leading-tight">{rosterScores.length}</p>
          </div>
        </div>

        <div className="bg-[#08090c]/80 p-5 rounded-none border border-white/15 shadow-xl flex items-center gap-4 backdrop-blur-md">
          <div className="p-3 bg-amber-500/10 border border-amber-400/20 text-amber-400 rounded-none shrink-0">
            <PixelIcon name="checkCircle" size={24} />
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <p className="text-xs text-slate-400 uppercase tracking-wider">Class Exam Avg</p>
            </div>
            <p className="text-2xl font-bold text-white leading-tight">
              {overallAvgScore > 0 ? `${overallAvgScore}%` : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="flex-1 min-h-0 bg-[#08090c]/80 rounded-none border border-white/15 shadow-2xl flex flex-col overflow-hidden mb-4 backdrop-blur-md">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-black/20 shrink-0 text-xs">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("matrix")}
              className={`px-3.5 py-2 rounded-none transition-all cursor-pointer border flex items-center gap-2 ${activeTab === "matrix"
                ? "bg-white/15 border-white/40 text-white font-bold"
                : "text-slate-400 border-white/10 hover:bg-white/5 bg-transparent"
                }`}
            >
              <span>OVERALL MARKS MATRIX</span>
              <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-none text-[10px] font-bold ${activeTab === "matrix" ? "bg-emerald-400 text-black" : "bg-white/10 text-slate-400"
                }`}>
                {rosterScores.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("list")}
              className={`px-3.5 py-2 rounded-none transition-all cursor-pointer border flex items-center gap-2 ${activeTab === "list"
                ? "bg-white/15 border-white/40 text-white font-bold"
                : "text-slate-400 border-white/10 hover:bg-white/5 bg-transparent"
                }`}
            >
              <span>SET ASSESSMENTS</span>
              <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-none text-[10px] font-bold ${activeTab === "list" ? "bg-emerald-400 text-black" : "bg-white/10 text-slate-400"
                }`}>
                {assessments.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("create")}
              className={`px-3.5 py-2 rounded-none transition-all cursor-pointer border flex items-center gap-1.5 ${activeTab === "create"
                ? "bg-white/15 border-white/40 text-white font-bold"
                : "text-slate-400 border-white/10 hover:bg-white/5 bg-transparent"
                }`}
            >
              <span>+ NEW ASSESSMENT</span>
            </button>
          </div>

          <div className="text-[10px] text-slate-400 hidden sm:block">
            AUTO-SAVES DIRECTLY TO REPOSITORY
          </div>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-black/10">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-slate-400 text-xs py-16">
              Loading gradebook matrix...
            </div>
          ) : (
            <>
              {/* TAB 1: OVERALL MARKS MATRIX */}
              {activeTab === "matrix" && (
                <div>
                  {assessments.length === 0 ? (
                    <div className="text-center py-16 bg-[#08090c] rounded-none border border-white/15 shadow-xl max-w-md mx-auto p-8">
                      <PixelIcon name="book" size={40} className="mx-auto text-slate-500 mb-3" />
                      <h3 className="text-lg font-bold text-white uppercase">No assessments set yet</h3>
                      <p className="text-slate-400 text-xs mb-6 mt-1">
                        Create your first quiz, lab report, midterm, or final exam for this class to start recording marks.
                      </p>
                      <button
                        onClick={() => setActiveTab("create")}
                        className="px-5 py-2.5 bg-emerald-600 text-white rounded-none font-bold text-xs hover:bg-emerald-500 transition-all border border-emerald-400 cursor-pointer"
                      >
                        + CONFIGURE FIRST ASSESSMENT
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-white/10 bg-black/20">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-white/5 border-b border-white/10 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                            <th className="p-3.5">Student</th>
                            <th className="p-3.5">Matric ID</th>
                            {assessments.map((a) => (
                              <th key={a.id} className="p-3.5 text-center min-w-[160px]">
                                <div className="font-bold text-white text-xs">{a.title}</div>
                                <div className="text-[9px] text-slate-400 mt-0.5">
                                  MAX: {a.total_marks} ({a.weightage}%)
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10 text-xs">
                          {rosterScores.map((student) => (
                            <tr key={student.student_id} className="hover:bg-white/5 transition-colors">
                              <td className="p-3.5 font-bold text-white">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-none bg-white/10 border border-white/20 text-white flex items-center justify-center font-bold text-xs shrink-0">
                                    {student.student_name.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="font-bold text-white leading-none">{student.student_name}</p>
                                    <Link
                                      href={`/classes/${student.student_id}?classId=${selectedClassId}`}
                                      className="text-[10px] text-emerald-400 hover:underline mt-1 inline-block"
                                    >
                                      VIEW PROFILE →
                                    </Link>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3.5 text-slate-400 text-xs">{student.matric_id}</td>
                              {assessments.map((a) => {
                                const key = `${student.student_id}_${a.id}`;
                                const currentScore = editingScores[key] !== undefined ? editingScores[key] : (student.scores?.[a.id] ?? "");

                                return (
                                  <td key={a.id} className="p-3.5 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                      <input
                                        type="number"
                                        min="0"
                                        max={a.total_marks}
                                        value={currentScore}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setEditingScores(prev => ({ ...prev, [key]: val }));
                                        }}
                                        placeholder="-"
                                        className="w-16 text-center bg-black/40 border border-white/20 rounded-none py-1.5 px-2 font-bold text-white focus:border-emerald-400 focus:outline-none text-xs transition-all"
                                      />
                                      <button
                                        disabled={isSavingScore || currentScore === ""}
                                        onClick={async () => {
                                          setIsSavingScore(true);
                                          try {
                                            const scoreVal = parseFloat(String(currentScore));
                                            try {
                                              await api.post(`/api/assessments/${a.id}/scores`, {
                                                student_id: student.student_id,
                                                score_achieved: scoreVal
                                              });

                                              setRosterScores(prev => prev.map(s => {
                                                if (s.student_id === student.student_id) {
                                                  return {
                                                    ...s,
                                                    scores: { ...s.scores, [a.id]: scoreVal }
                                                  };
                                                }
                                                return s;
                                              }));
                                            } catch (err: any) {
                                              alert("Error saving score: " + (err.detail || err.message || "Failed"));
                                            }
                                          } catch (err) {
                                            console.error("Score save error:", err);
                                          } finally {
                                            setIsSavingScore(false);
                                          }
                                        }}
                                        className="p-1.5 bg-emerald-600/20 hover:bg-emerald-600 hover:text-white text-emerald-300 border border-emerald-400/30 rounded-none transition-all cursor-pointer disabled:opacity-30 active:scale-95"
                                        title="Save Mark"
                                      >
                                        <PixelIcon name="check" size={12} />
                                      </button>
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: SET ASSESSMENTS LIST */}
              {activeTab === "list" && (
                <div className="space-y-4 max-w-4xl mx-auto">
                  {assessments.length === 0 ? (
                    <p className="text-center text-slate-400 py-12 text-xs">No assessments configured for this class.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {assessments.map((a) => (
                        <div
                          key={a.id}
                          className="bg-[#08090c] p-5 rounded-none border border-white/15 shadow-xl flex justify-between items-center group hover:border-white/30 transition-all"
                        >
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-bold text-white text-sm">{a.title}</h4>
                              <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-none border border-white/20 bg-white/5 text-slate-300">
                                {a.type}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mb-2">Weightage: {a.weightage}% of final GPA</p>
                            <div className="w-36 bg-white/10 h-1.5 rounded-none overflow-hidden">
                              <div className="bg-emerald-500 h-full rounded-none" style={{ width: `${Math.min(100, a.weightage * 2.5)}%` }} />
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right bg-black/30 p-3 rounded-none border border-white/10">
                              <span className="text-2xl font-bold text-white block leading-none">{a.total_marks}</span>
                              <span className="text-[9px] text-slate-400 block font-bold mt-1 uppercase">MAX</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setAssessmentToDelete(a)}
                              className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-none border border-transparent hover:border-rose-400/30 transition-all cursor-pointer"
                              title="Delete assessment"
                              aria-label={`Delete ${a.title}`}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: CREATE NEW ASSESSMENT FORM */}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await api.post(`/api/classes/${selectedClassId}/assessments`, {
                      title: newTitle,
                      type: newType,
                      weightage: parseFloat(newWeightage),
                      total_marks: parseInt(newTotalMarks, 10)
                    });

                    setNewTitle("");
                    setActiveTab("matrix");
                    if (selectedClassId) fetchClassAssessmentsData(selectedClassId);
                  } catch (err: any) {
                    alert("Failed to create assessment: " + (err.detail || err.message || "Error"));
                  }
                }}
                className="bg-[#08090c] p-6 rounded-none border border-white/20 shadow-2xl max-w-md mx-auto space-y-5 text-xs"
              >
                <div className="pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-none" />
                    <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-bold">
                      ASSESSMENT CONFIGURATION
                    </span>
                  </div>
                  <h4 className="font-bold text-white text-base">Configure New Assessment</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Set up quizzes, lab reports, or major exams</p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Assessment Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Quiz 2 / Lab Report 1 / Midterm Exam"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-black/40 border border-white/20 rounded-none px-3 py-2 text-xs text-white focus:border-emerald-400 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Type</label>
                    <select
                      value={newType}
                      onChange={(e) => setNewType(e.target.value)}
                      className="w-full bg-black/40 border border-white/20 rounded-none px-2 py-2 text-xs text-white focus:border-emerald-400 focus:outline-none"
                    >
                      <option value="Continuous" className="bg-[#08090c]">Continuous</option>
                      <option value="Midterm" className="bg-[#08090c]">Midterm</option>
                      <option value="Final" className="bg-[#08090c]">Final</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Weight (%)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="100"
                      value={newWeightage}
                      onChange={(e) => setNewWeightage(e.target.value)}
                      className="w-full bg-black/40 border border-white/20 rounded-none px-2 py-2 text-xs text-white focus:border-emerald-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Max Marks</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={newTotalMarks}
                      onChange={(e) => setNewTotalMarks(e.target.value)}
                      className="w-full bg-black/40 border border-white/20 rounded-none px-2 py-2 text-xs text-white focus:border-emerald-400 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-none border border-emerald-400 shadow-lg shadow-emerald-900/30 transition-all cursor-pointer uppercase text-xs"
                >
                  SAVE ASSESSMENT
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Confirmation modal for assessment deletion */}
      {assessmentToDelete && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[#08090c] rounded-none max-w-md w-full p-6 shadow-2xl border border-white/20 text-xs text-white">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/10">
              <div className="p-2 bg-rose-500/10 border border-rose-400/30 text-rose-300 rounded-none shrink-0">
                <PixelIcon name="warning" size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase">Remove Assessment</h3>
                <p className="text-[10px] text-slate-400">Permanent deletion</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              Are you sure you want to remove <span className="font-bold text-white">{assessmentToDelete.title}</span>? All student marks recorded for this assessment will be permanently deleted from the database.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setAssessmentToDelete(null)}
                className="px-4 py-2 rounded-none text-xs text-slate-300 hover:bg-white/10 border border-white/20 transition-all cursor-pointer bg-transparent disabled:opacity-50"
              >
                CANCEL
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => handleDeleteAssessment(assessmentToDelete.id)}
                className="px-4 py-2 rounded-none text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 border border-rose-400 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? "DELETING..." : "REMOVE ASSESSMENT"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
