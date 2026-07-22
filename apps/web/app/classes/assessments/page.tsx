// apps/web/app/classes/assessments/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  FileSpreadsheet,
  Plus,
  Save,
  ChevronDown,
  BookOpen,
  Users,
  CheckCircle2,
  Award,
  Layers,
  Sparkles
} from "lucide-react";
import { createClient } from "../../../utils/supabase/client";

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

  // 1. Fetch lecturer classes
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Fetch class assessments and gradebook matrix
  const fetchClassAssessmentsData = async (classId: string) => {
    if (!classId) return;
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`http://localhost:8000/api/classes/${classId}/assessments`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setAssessments(data.assessments || []);
        setRosterScores(data.roster || []);
      } else {
        await fetchFallbackClassAssessments(classId);
      }
    } catch (err) {
      console.warn("FastAPI offline, using Supabase direct assessment fetch:", err);
      await fetchFallbackClassAssessments(classId);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFallbackClassAssessments = async (classId: string) => {
    const { data: assessmentsData } = await supabase
      .from('assessments')
      .select('*')
      .eq('class_id', classId)
      .order('created_at', { ascending: true });

    setAssessments(assessmentsData || []);

    const { data: enrollments } = await supabase
      .from('enrollments')
      .select(`
        student_id,
        profiles ( id, full_name, institutional_id )
      `)
      .eq('class_id', classId);

    if (enrollments) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const roster: StudentRosterScore[] = enrollments.map((e: any) => ({
        student_id: e.student_id,
        student_name: e.profiles?.full_name || "Student",
        matric_id: e.profiles?.institutional_id || "N/A",
        scores: {}
      }));
      setRosterScores(roster);
    }
  };

  useEffect(() => {
    if (selectedClassId) {
      fetchClassAssessmentsData(selectedClassId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClassId]);

  const backUrl = selectedClassId ? `/classes?classId=${selectedClassId}` : "/classes";

  // Calculate metrics
  const totalWeightage = assessments.reduce((sum, a) => sum + (a.weightage || 0), 0);
  
  // Calculate average class score %
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

  return (
    <main className="flex-1 p-8 h-screen flex flex-col bg-[#FAF9F6] overflow-y-auto">
      
      {/* Header & Navigation */}
      <header className="shrink-0 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="mb-4 sm:mb-5">
            <Link
              href={backUrl}
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors bg-white border border-slate-200 px-3.5 py-1.5 rounded-xl shadow-sm"
            >
              <ArrowLeft size={16} /> Back to Class Roster
            </Link>
          </div>
          <h2 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <FileSpreadsheet className="text-blue-600" size={32} />
            Assessments & Gradebook Matrix
          </h2>
          <p className="text-slate-500 text-sm mt-1">Manage continuous assessments, major exams, and student scores</p>
        </div>

        {/* Class View Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-3 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-medium shadow-sm hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <div className="flex flex-col text-left">
              <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider leading-none mb-1">Target Class</span>
              <span className="leading-none font-bold text-slate-900">{selectedClassName}</span>
            </div>
            <ChevronDown size={18} className="text-slate-400 ml-2" />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-full min-w-[260px] bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
              {classesList.map((cls) => (
                <button
                  key={cls.id}
                  onClick={() => {
                    setSelectedClassId(cls.id);
                    setSelectedClassName(cls.name);
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 text-sm hover:bg-slate-50 transition-colors cursor-pointer ${
                    selectedClassId === cls.id ? 'bg-blue-50/50 text-blue-700 font-bold' : 'text-slate-700'
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
      <div className="grid grid-cols-4 gap-5 mb-8 shrink-0" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-blue-50 p-3.5 rounded-2xl text-blue-600 shrink-0">
            <BookOpen size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-0.5">Set Assessments</p>
            <p className="text-2xl font-bold text-slate-900 leading-tight">{assessments.length}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-indigo-50 p-3.5 rounded-2xl text-indigo-600 shrink-0">
            <Award size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-0.5">Total Weightage</p>
            <p className="text-2xl font-bold text-slate-900 leading-tight">{totalWeightage}%</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-emerald-50 p-3.5 rounded-2xl text-emerald-600 shrink-0">
            <Users size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-0.5">Enrolled Roster</p>
            <p className="text-2xl font-bold text-slate-900 leading-tight">{rosterScores.length}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-amber-50 p-3.5 rounded-2xl text-amber-600 shrink-0">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-0.5">Class Exam Avg</p>
            <p className="text-2xl font-bold text-slate-900 leading-tight">{overallAvgScore > 0 ? `${overallAvgScore}%` : 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="flex-1 min-h-0 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden mb-4">
        
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-white shrink-0">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("matrix")}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer border-none ${
                activeTab === "matrix" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 bg-transparent"
              }`}
            >
              Overall Marks Matrix ({rosterScores.length})
            </button>
            <button
              onClick={() => setActiveTab("list")}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer border-none ${
                activeTab === "list" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 bg-transparent"
              }`}
            >
              Set Assessments ({assessments.length})
            </button>
            <button
              onClick={() => setActiveTab("create")}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer border-none flex items-center gap-1.5 ${
                activeTab === "create" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 bg-transparent"
              }`}
            >
              <Plus size={16} /> New Assessment
            </button>
          </div>

          <div className="text-xs font-medium text-slate-400 hidden sm:block">
            Auto-saves directly to Supabase & FastAPI database
          </div>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/40">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-slate-400 font-medium py-16">Loading gradebook matrix...</div>
          ) : (
            <>
              {/* TAB 1: OVERALL MARKS MATRIX */}
              {activeTab === "matrix" && (
                <div>
                  {assessments.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-sm max-w-lg mx-auto p-8">
                      <BookOpen size={48} className="mx-auto text-slate-300 mb-3" />
                      <h3 className="text-xl font-bold text-slate-800">No assessments set yet</h3>
                      <p className="text-slate-500 text-sm mb-6 mt-1">Create your first quiz, lab report, midterm, or final exam for this class to start recording student marks.</p>
                      <button
                        onClick={() => setActiveTab("create")}
                        className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-md shadow-blue-200 border-none cursor-pointer"
                      >
                        + Configure First Assessment
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-sm bg-white">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider">
                            <th className="p-4 sm:p-5">Student</th>
                            <th className="p-4 sm:p-5">Matric ID</th>
                            {assessments.map((a) => (
                              <th key={a.id} className="p-4 sm:p-5 text-center min-w-[160px]">
                                <div className="font-bold text-slate-900 text-sm">{a.title}</div>
                                <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                                  Max: {a.total_marks} marks ({a.weightage}%)
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                          {rosterScores.map((student) => (
                            <tr key={student.student_id} className="hover:bg-blue-50/20 transition-colors">
                              <td className="p-4 sm:p-5 font-semibold text-slate-900">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                                    {student.student_name.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-900 leading-none">{student.student_name}</p>
                                    <Link
                                      href={`/classes/${student.student_id}?classId=${selectedClassId}`}
                                      className="text-[11px] text-blue-600 hover:underline font-medium mt-1 inline-block"
                                    >
                                      View Profile →
                                    </Link>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4 sm:p-5 text-slate-500 font-mono text-xs font-medium">{student.matric_id}</td>
                              {assessments.map((a) => {
                                const key = `${student.student_id}_${a.id}`;
                                const currentScore = editingScores[key] !== undefined ? editingScores[key] : (student.scores?.[a.id] ?? "");

                                return (
                                  <td key={a.id} className="p-4 text-center">
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
                                        className="w-20 text-center bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-xl py-2 px-3 font-extrabold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none text-base transition-all shadow-sm"
                                      />
                                      <button
                                        disabled={isSavingScore || currentScore === ""}
                                        onClick={async () => {
                                          setIsSavingScore(true);
                                          try {
                                            const scoreVal = parseFloat(String(currentScore));
                                            const { data: { session } } = await supabase.auth.getSession();
                                            const token = session?.access_token;

                                            const res = await fetch(`http://localhost:8000/api/assessments/${a.id}/scores`, {
                                              method: "POST",
                                              headers: {
                                                "Content-Type": "application/json",
                                                "Authorization": `Bearer ${token}`
                                              },
                                              body: JSON.stringify({
                                                student_id: student.student_id,
                                                score_achieved: scoreVal
                                              })
                                            });

                                            if (res.ok) {
                                              setRosterScores(prev => prev.map(s => {
                                                if (s.student_id === student.student_id) {
                                                  return {
                                                    ...s,
                                                    scores: { ...s.scores, [a.id]: scoreVal }
                                                  };
                                                }
                                                return s;
                                              }));
                                            } else {
                                              const errData = await res.json();
                                              alert("Error saving score: " + (errData.detail || "Failed"));
                                            }
                                          } catch (err) {
                                            console.error("Score save error:", err);
                                          } finally {
                                            setIsSavingScore(false);
                                          }
                                        }}
                                        className="p-2 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 rounded-xl transition-all border-none cursor-pointer disabled:opacity-30 active:scale-95 shadow-sm"
                                        title="Save Mark"
                                      >
                                        <Save size={18} />
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
                    <p className="text-center text-slate-500 py-12">No assessments configured for this class.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {assessments.map((a) => (
                        <div key={a.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex justify-between items-center group hover:border-blue-200 transition-all">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-bold text-slate-900 text-lg">{a.title}</h4>
                              <span className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded-md ${
                                a.type === 'Midterm' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' :
                                a.type === 'Final' ? 'bg-sky-100 text-sky-700 border border-sky-200' :
                                'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}>
                                {a.type}
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-slate-500 mb-1">Weightage: {a.weightage}% of final GPA</p>
                            <div className="w-36 bg-slate-100 h-2 rounded-full overflow-hidden mt-2">
                              <div className="bg-blue-600 h-full rounded-full" style={{ width: `${Math.min(100, a.weightage * 2.5)}%` }}></div>
                            </div>
                          </div>
                          <div className="text-right bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <span className="text-3xl font-extrabold text-slate-900">{a.total_marks}</span>
                            <span className="text-xs text-slate-400 block font-semibold mt-0.5">Max Marks</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: CREATE NEW ASSESSMENT FORM */}
              {activeTab === "create" && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      const { data: { session } } = await supabase.auth.getSession();
                      const token = session?.access_token;

                      const res = await fetch(`http://localhost:8000/api/classes/${selectedClassId}/assessments`, {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          "Authorization": `Bearer ${token}`
                        },
                        body: JSON.stringify({
                          title: newTitle,
                          type: newType,
                          weightage: parseFloat(newWeightage),
                          total_marks: parseInt(newTotalMarks, 10)
                        })
                      });

                      if (res.ok) {
                        setNewTitle("");
                        setActiveTab("matrix");
                        if (selectedClassId) fetchClassAssessmentsData(selectedClassId);
                      } else {
                        const err = await res.json();
                        alert("Failed to create assessment: " + (err.detail || "Error"));
                      }
                    } catch (err) {
                      console.error("Create assessment error:", err);
                    }
                  }}
                  className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm max-w-lg mx-auto space-y-6"
                >
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                      <Sparkles size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-lg">Configure New Assessment</h4>
                      <p className="text-xs text-slate-500">Set up quizzes, lab reports, or major exams</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Assessment Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Quiz 2 / Lab Report 1 / Midterm Exam"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Type</label>
                      <select
                        value={newType}
                        onChange={(e) => setNewType(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all"
                      >
                        <option value="Continuous">Continuous</option>
                        <option value="Midterm">Midterm</option>
                        <option value="Final">Final</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Weight (%)</label>
                      <input
                        type="number"
                        required
                        min="1"
                        max="100"
                        value={newWeightage}
                        onChange={(e) => setNewWeightage(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Max Marks</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={newTotalMarks}
                        onChange={(e) => setNewTotalMarks(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl shadow-md shadow-blue-200 transition-all cursor-pointer border-none font-sans"
                  >
                    Save Assessment
                  </button>
                </form>
              )}
            </>
          )}
        </div>

      </div>
    </main>
  );
}
