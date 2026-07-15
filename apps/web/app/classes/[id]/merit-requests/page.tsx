// apps/web/app/classes/[id]/merit-requests/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { 
  ArrowLeft, 
  Award, 
  Clock, 
  CalendarDays, 
  Check, 
  CheckSquare, 
  Square, 
  Eye, 
  FileText, 
  X, 
  ExternalLink,
  ShieldCheck
} from "lucide-react";
import { createClient } from "../../../../utils/supabase/client";

interface MeritRequest {
  id: string;
  date: string;
  time: string;
  title: string;
  category: string;
  points: number;
  description: string;
  proofType: "image" | "pdf";
  proofUrl: string;
  status: "pending" | "verified";
}

export default function MeritRequestsPage() {
  const params = useParams();
  const studentId = (params?.id as string) || "22222222-2222-2222-2222-222222222221";

  const supabase = createClient();
  const [requests, setRequests] = useState<MeritRequest[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [lecturerId, setLecturerId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setLecturerId(user.id);
        }

        // Fetch Student Profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', studentId)
          .single();
        setStudentProfile(profile);

        // Fetch Merit Claims
        const { data: claims } = await supabase
          .from('merit_claims')
          .select('*')
          .eq('student_id', studentId);

        if (claims) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const formatted = claims.map((c: any) => ({
            id: c.id,
            date: new Date(c.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
            time: new Date(c.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            title: c.title,
            category: c.category || 'General',
            points: c.awarded_points || 10,
            description: c.description || '',
            proofType: ((c.proof_file_url || '').toLowerCase().endsWith('.pdf') ? 'pdf' : 'image') as "pdf" | "image",
            proofUrl: c.proof_file_url || '',
            status: (c.status === 'approved' ? 'verified' : 'pending') as "verified" | "pending"
          }));
          setRequests(formatted);
        }
      } catch (err) {
        console.error("Error loading merit requests:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [inspectRequest, setInspectRequest] = useState<MeritRequest | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [verifiedPointsSum, setVerifiedPointsSum] = useState(0);

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleSelectRow = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const pendingIds = requests.filter(r => r.status === "pending").map(r => r.id);
    if (selectedIds.length === pendingIds.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendingIds);
    }
  };

  const verifyIndividual = async (request: MeritRequest) => {
    try {
      const { error } = await supabase
        .from('merit_claims')
        .update({
          status: 'approved',
          evaluator_id: lecturerId,
          evaluated_at: new Date().toISOString()
        })
        .eq('id', request.id);

      if (error) {
        console.error("Failed to approve merit:", error);
        return;
      }

      setRequests(prev => 
        prev.map(r => r.id === request.id ? { ...r, status: "verified" } : r)
      );
      setSelectedIds(prev => prev.filter(id => id !== request.id));
      setVerifiedPointsSum(prev => prev + request.points);

      if (studentProfile) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setStudentProfile((prev: any) => ({
          ...prev,
          total_merit_score: Number(prev.total_merit_score || 0) + request.points
        }));
      }

      setToastMessage(`Merit approved! +${request.points} points awarded for "${request.title}".`);
    } catch (err) {
      console.error(err);
    }
  };

  const verifySelectedBulk = async () => {
    if (selectedIds.length === 0) return;

    try {
      const selectedRequests = requests.filter(r => selectedIds.includes(r.id));
      const addedPoints = selectedRequests.reduce((sum, r) => sum + r.points, 0);

      const { error } = await supabase
        .from('merit_claims')
        .update({
          status: 'approved',
          evaluator_id: lecturerId,
          evaluated_at: new Date().toISOString()
        })
        .in('id', selectedIds);

      if (error) {
        console.error("Failed to bulk approve merits:", error);
        return;
      }

      setRequests(prev => 
        prev.map(r => selectedIds.includes(r.id) ? { ...r, status: "verified" } : r)
      );
      setSelectedIds([]);
      setVerifiedPointsSum(prev => prev + addedPoints);

      if (studentProfile) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setStudentProfile((prev: any) => ({
          ...prev,
          total_merit_score: Number(prev.total_merit_score || 0) + addedPoints
        }));
      }

      setToastMessage(`Bulk approval complete! ${selectedRequests.length} requests verified. +${addedPoints} total points awarded.`);
    } catch (err) {
      console.error(err);
    }
  };

  const pendingCount = requests.filter(r => r.status === "pending").length;

  if (isLoading || !studentProfile) {
    return <div className="flex-1 flex items-center justify-center bg-slate-50 min-h-screen">Loading merit requests...</div>;
  }

  return (
    <main className="flex-1 p-8 overflow-y-auto bg-slate-50 relative font-sans">
      
      {/* Toast Alert Notification */}
      {toastMessage && (
        <div className="fixed top-8 right-8 z-50 flex items-center gap-3 bg-slate-900 border border-slate-800 text-white px-5 py-4 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-emerald-500 rounded-full p-1 flex items-center justify-center">
            <Check size={16} strokeWidth={3} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold">{toastMessage}</p>
          </div>
          <button onClick={() => setToastMessage(null)} className="ml-4 text-slate-400 hover:text-white border-none bg-transparent cursor-pointer">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Navigation and Breadcrumbs */}
      <div className="mb-6 flex justify-between items-center">
        <Link href={`/classes/${studentId}`} className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors">
          <ArrowLeft size={16} /> Back to Student Profile
        </Link>
        <span className="text-xs text-slate-400 font-medium">Lecturer Portal Workspace</span>
      </div>

      {/* Main Header */}
      <header className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-xs font-bold tracking-wider uppercase text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
              Merit Verification Worklist
            </span>
            <h1 className="text-3xl font-extrabold text-slate-900 mt-3 font-sans">{studentProfile.full_name}</h1>
            <p className="text-slate-500 mt-1">Matric: {studentProfile.institutional_id}</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-right flex gap-6">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Pending Claims</span>
              <span className="text-2xl font-black text-blue-600">{pendingCount} requests</span>
            </div>
            <div className="border-l border-slate-200 pl-6">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Approved This Session</span>
              <span className="text-2xl font-black text-emerald-600">+{verifiedPointsSum} pts</span>
            </div>
          </div>
        </div>
      </header>

      {/* Selection Control Bar */}
      {selectedIds.length > 0 && (
        <div className="mb-6 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-lg flex items-center justify-between animate-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600/30 text-blue-400 rounded-lg p-2 flex items-center justify-center">
              <Award size={18} />
            </div>
            <p className="text-sm font-semibold">
              <span className="text-blue-400 font-bold">{selectedIds.length}</span> request{selectedIds.length > 1 ? "s" : ""} selected for validation
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSelectedIds([])}
              className="bg-transparent border-none text-slate-400 hover:text-white font-medium text-sm px-4 py-2 cursor-pointer transition-colors"
            >
              Cancel Selection
            </button>
            <button 
              onClick={verifySelectedBulk}
              className="bg-blue-600 hover:bg-blue-500 border-none text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2"
            >
              <ShieldCheck size={18} /> Verify Selected All at Once
            </button>
          </div>
        </div>
      )}

      {/* Requests Roster Card */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden mb-12">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="font-extrabold text-slate-900 text-lg">Merit Submissions</h2>
          <span className="text-xs text-slate-400 font-medium font-sans">Verify submissions by inspecting proof files</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100 font-bold">
                <th className="p-5 w-12 text-center">
                  <button 
                    onClick={handleSelectAll} 
                    disabled={requests.filter(r => r.status === "pending").length === 0}
                    className="bg-transparent border-none cursor-pointer flex items-center justify-center p-1 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    {selectedIds.length > 0 && selectedIds.length === requests.filter(r => r.status === "pending").length ? (
                      <CheckSquare size={20} className="text-blue-600" />
                    ) : (
                      <Square size={20} className="text-slate-400" />
                    )}
                  </button>
                </th>
                <th className="p-5">Merit Details</th>
                <th className="p-5">Submitted Date & Time</th>
                <th className="p-5 text-center">Requested Points</th>
                <th className="p-5">Proof Document</th>
                <th className="p-5 text-right">Verification Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map((request) => {
                const isSelected = selectedIds.includes(request.id);
                const isPending = request.status === "pending";
                
                return (
                  <tr 
                    key={request.id} 
                    className={`transition-colors ${
                      !isPending 
                        ? "bg-emerald-50/20 hover:bg-emerald-50/30" 
                        : isSelected 
                          ? "bg-blue-50/20" 
                          : "hover:bg-slate-50"
                    }`}
                  >
                    {/* Checkbox selector */}
                    <td className="p-5 text-center">
                      {isPending ? (
                        <button 
                          onClick={() => handleSelectRow(request.id)}
                          className="bg-transparent border-none cursor-pointer flex items-center justify-center p-1 text-slate-400 hover:text-blue-600"
                        >
                          {isSelected ? (
                            <CheckSquare size={20} className="text-blue-600" />
                          ) : (
                            <Square size={20} className="text-slate-300" />
                          )}
                        </button>
                      ) : (
                        <div className="flex items-center justify-center text-emerald-500">
                          <Check size={20} strokeWidth={3.5} />
                        </div>
                      )}
                    </td>

                    {/* Merit Details */}
                    <td className="p-5 max-w-sm">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 uppercase tracking-wider px-2 py-0.5 rounded font-sans">
                          {request.category}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm mt-2">{request.title}</h4>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {request.description}
                        </p>
                      </div>
                    </td>

                    {/* Date / Time */}
                    <td className="p-5">
                      <div className="space-y-1 text-xs text-slate-600 font-medium font-sans">
                        <div className="flex items-center gap-1.5">
                          <CalendarDays size={14} className="text-slate-400" />
                          <span>{request.date}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock size={14} className="text-slate-400" />
                          <span>{request.time}</span>
                        </div>
                      </div>
                    </td>

                    {/* Requested Points */}
                    <td className="p-5 text-center">
                      <span className="font-extrabold text-slate-900 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg text-sm font-sans">
                        +{request.points}
                      </span>
                    </td>

                    {/* Proof Attachment */}
                    <td className="p-5">
                      <button 
                        onClick={() => setInspectRequest(request)}
                        className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-100 hover:bg-blue-100/80 px-3.5 py-2 rounded-xl transition-all cursor-pointer font-sans"
                      >
                        {request.proofType === "pdf" ? <FileText size={15} /> : <Eye size={15} />}
                        <span>Inspect Proof ({request.proofType.toUpperCase()})</span>
                      </button>
                    </td>

                    {/* Verification Status */}
                    <td className="p-5 text-right font-sans">
                      {isPending ? (
                        <button 
                          onClick={() => verifyIndividual(request)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm hover:shadow hover:scale-[1.02] active:scale-95 transition-all border-none cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <ShieldCheck size={14} /> Approve Request
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 border border-emerald-200 px-3.5 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wide">
                          <Check size={14} strokeWidth={3} /> Verified
                        </span>
                      )}
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Proof Inspection Popup Modal */}
      {inspectRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="bg-slate-900 p-6 text-white relative font-sans">
              <button 
                onClick={() => setInspectRequest(null)}
                className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors border-none cursor-pointer text-white"
              >
                <X size={20} />
              </button>
              <span className="text-[10px] font-bold tracking-wider uppercase bg-blue-600 text-white px-2.5 py-0.5 rounded-full">
                Document Review
              </span>
              <h3 className="text-xl font-bold mt-2 pr-8">{inspectRequest.title}</h3>
              <p className="text-slate-400 text-xs mt-1">Submitted on {inspectRequest.date} at {inspectRequest.time}</p>
            </div>

            {/* Modal Content */}
            <div className="p-8 overflow-y-auto space-y-6 flex-1 font-sans">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Claim Description</h4>
                <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-150">
                  {inspectRequest.description}
                </p>
              </div>

              {/* Merit Points */}
              <div className="flex justify-between items-center bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 text-blue-600 p-2 rounded-xl">
                    <Award size={20} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Award Category</span>
                    <span className="font-extrabold text-slate-800 text-sm">{inspectRequest.category}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Value</span>
                  <span className="font-black text-blue-700 text-xl">+{inspectRequest.points} Points</span>
                </div>
              </div>

              {/* Document/File Preview */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Submitted Attachment Proof</h4>
                
                {inspectRequest.proofType === "image" ? (
                  <div className="relative border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-slate-900 group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={inspectRequest.proofUrl} 
                      alt="Certificate Attachment" 
                      className="w-full h-auto max-h-[300px] object-contain mx-auto"
                    />
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <a 
                        href={inspectRequest.proofUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="bg-white hover:bg-slate-100 text-slate-800 px-4 py-2 rounded-xl text-xs font-bold shadow-md inline-flex items-center gap-1.5 no-underline transition-transform scale-95 group-hover:scale-100"
                      >
                        <ExternalLink size={14} /> Open full resolution
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="border border-dashed border-slate-300 rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-slate-50">
                    <div className="bg-rose-100 text-rose-600 p-4 rounded-full mb-3">
                      <FileText size={32} />
                    </div>
                    <h5 className="font-bold text-slate-800 text-sm">Attachment: {inspectRequest.title.toLowerCase().replace(/ /g, "_")}.pdf</h5>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs">PDF Document claims verification has been scanned and pre-approved by the PASUM administration office.</p>
                    <a 
                      href="#" 
                      onClick={(e) => { e.preventDefault(); alert("Mock download started!"); }}
                      className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 border border-blue-200 bg-white hover:bg-blue-50 px-4 py-2 rounded-xl shadow-sm transition-all"
                    >
                      <ExternalLink size={14} /> Download Proof PDF
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 p-6 flex justify-end gap-3 border-t border-slate-150 font-sans">
              <button 
                onClick={() => setInspectRequest(null)}
                className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold px-5 py-3 rounded-xl transition-all cursor-pointer"
              >
                Close Inspect
              </button>
              {inspectRequest.status === "pending" && (
                <button 
                  onClick={() => {
                    verifyIndividual(inspectRequest);
                    setInspectRequest(null);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-3 rounded-xl shadow-md shadow-emerald-100 hover:shadow-lg transition-all border-none cursor-pointer flex items-center gap-1.5"
                >
                  <ShieldCheck size={18} /> Approve & Close
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </main>
  );
}
