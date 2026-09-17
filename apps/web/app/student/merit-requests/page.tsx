// Student Merit Requests Portfolio in sharp dark neutral style
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "../../../utils/supabase/client";
import { api } from "../../../lib/api";
import EmptyState from "../../../components/EmptyState";
import PixelIcon from "../../../components/PixelIcon";

interface MeritRequest {
  id: string;
  date: string;
  time: string;
  title: string;
  category: string;
  points: number;
  description: string;
  proofUrl: string;
  status: "pending" | "approved" | "rejected";
}

export default function StudentMeritRequestsPage() {
  const supabase = createClient();
  const [requests, setRequests] = useState<MeritRequest[]>([]);
  const [studentName, setStudentName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal submission states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("Academic");
  const [newPoints] = useState(10);
  const [newDescription, setNewDescription] = useState("");
  const [newProofUrl, setNewProofUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Loads merit requests with FastAPI and Supabase fallback
  const loadMeritRequests = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setStudentId(user.id);

      // Fetch student profile full name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      if (profile) {
        setStudentName(profile.full_name);
      }

      try {
        const apiData = await api.get("/api/student/merit-claims");
        const formatted = (apiData.claims || []).map((c: any) => ({
          id: c.id,
          date: new Date(c.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
          time: new Date(c.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          title: c.title,
          category: c.category || 'General',
          points: Number(c.awarded_points || 10),
          description: c.description || '',
          proofUrl: c.proof_file_url || '',
          status: c.status
        }));
        setRequests(formatted);
        setIsLoading(false);
        return;
      } catch (apiErr) {
        console.warn("FastAPI merit claims error, falling back to Supabase query:", apiErr);
      }

      // Fetch directly from Supabase if backend API is unreachable
      const { data: claims } = await supabase
        .from('merit_claims')
        .select('*')
        .eq('student_id', user.id)
        .order('submitted_at', { ascending: false });

      if (claims) {
        const formatted = claims.map((c: any) => ({
          id: c.id,
          date: new Date(c.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
          time: new Date(c.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          title: c.title,
          category: c.category || 'General',
          points: Number(c.awarded_points || 10),
          description: c.description || '',
          proofUrl: c.proof_file_url || '',
          status: c.status
        }));
        setRequests(formatted);
      }
    } catch (err) {
      console.error("Error loading merit requests:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMeritRequests();

    // Live subscription on merit claims table
    const channel = supabase
      .channel('student_merit_claims_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'merit_claims' }, () => {
        loadMeritRequests();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  // Submits new merit claim
  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) return;

    if (!newTitle.trim() || !newCategory.trim() || !newDescription.trim() || !newProofUrl.trim() || newProofUrl.trim() === 'https://') {
      alert("All fields are mandatory to fill in.");
      return;
    }

    setIsSubmitting(true);
    try {
      let submittedSuccess = false;

      try {
        await api.post("/api/student/merit-claims", {
          title: newTitle,
          category: newCategory,
          awarded_points: newPoints,
          description: newDescription,
          proof_file_url: newProofUrl
        });
        submittedSuccess = true;
      } catch (apiErr) {
        console.warn("FastAPI create merit claim error, falling back to Supabase:", apiErr);
      }

      if (!submittedSuccess) {
        const { error } = await supabase
          .from('merit_claims')
          .insert({
            student_id: studentId,
            title: newTitle,
            category: newCategory,
            awarded_points: newPoints,
            description: newDescription,
            proof_file_url: newProofUrl,
            status: 'pending'
          });

        if (error) {
          console.error("Failed to submit merit request:", error);
          alert("Failed to submit request: " + error.message);
          return;
        }
      }

      setToastMessage("Merit claim submitted successfully!");
      setTimeout(() => setToastMessage(null), 3000);

      setNewTitle("");
      setNewCategory("Academic");
      setNewDescription("");
      setNewProofUrl("");
      setIsModalOpen(false);
      loadMeritRequests();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const pendingCount = requests.filter(r => r.status === "pending").length;
  const approvedPointsSum = requests
    .filter(r => r.status === "approved")
    .reduce((sum, r) => sum + r.points, 0);

  if (isLoading && requests.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-transparent min-h-screen text-white/60 text-xs">
        <span className="animate-pulse">Loading merit portfolio...</span>
      </div>
    );
  }

  return (
    <main className="flex-1 p-6 lg:p-8 overflow-y-auto bg-transparent text-white font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-[#08090c] border border-emerald-400 text-white px-5 py-3 rounded-none shadow-2xl">
          <PixelIcon name="check" size={16} className="text-emerald-400" />
          <p className="text-xs font-bold uppercase">{toastMessage}</p>
          <button onClick={() => setToastMessage(null)} className="ml-3 text-white/50 hover:text-white border-none bg-transparent cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Navigation Breadcrumb */}
      <div className="mb-6 flex justify-between items-center">
        <Link href="/student/profile" className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors uppercase">
          ← Back to Profile
        </Link>
        <span className="text-[10px] text-white/40 uppercase font-mono">STUDENT WORKSPACE</span>
      </div>

      {/* Feature Disabled Warning Banner */}
      <div className="mb-6 p-4 rounded-none bg-amber-500/10 border border-amber-400/30 flex items-center justify-between gap-3 text-amber-300">
        <div className="flex items-center gap-3">
          <PixelIcon name="warning" size={20} className="text-amber-400 shrink-0" />
          <div>
            <p className="text-xs font-bold uppercase">Feature Temporarily Suspended</p>
            <p className="text-[11px] text-amber-300/80 mt-0.5">Merit claim submissions and point verification are currently disabled.</p>
          </div>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-none bg-amber-500/20 text-amber-300 border border-amber-400/40 shrink-0">
          Disabled
        </span>
      </div>

      {/* Main Header */}
      <header className="bg-[#08090c]/80 p-6 rounded-none border border-white/15 shadow-xl backdrop-blur-md mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-[10px] font-bold tracking-widest uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-400/30 px-2.5 py-1 rounded-none">
              Merit Portfolio
            </span>
            <h1 className="text-2xl lg:text-3xl font-bold text-white mt-3 uppercase tracking-tight">{studentName || "Student"}</h1>
            <p className="text-xs text-white/60 mt-1">Track and submit co-curricular and leadership merit points</p>
          </div>

          <div className="flex gap-4 items-center flex-wrap">
            <div className="bg-black/30 p-4 rounded-none border border-white/10 text-right flex gap-6 shrink-0">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Pending Claims</span>
                <span className="text-2xl font-bold text-white">{pendingCount}</span>
              </div>
              <div className="border-l border-white/10 pl-6">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Approved Points</span>
                <span className="text-2xl font-bold text-emerald-400">+{approvedPointsSum} pts</span>
              </div>
            </div>

            <div className="relative group/disabled cursor-not-allowed" title="Disabled Feature">
              <div className="bg-white/5 text-white/40 font-bold px-4 py-3 rounded-none flex items-center gap-2 text-xs border border-white/10 pointer-events-none select-none uppercase">
                <PixelIcon name="award" size={16} /> Submit Merit Claim
              </div>
              <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover/disabled:flex items-center px-2 py-1 text-[10px] font-bold text-white bg-black border border-white/20 whitespace-nowrap z-50">
                Disabled Feature
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Submissions Table Card */}
      <div className="relative group/disabled cursor-not-allowed mb-8" title="Disabled Feature">
        <div className="pointer-events-none absolute top-4 right-4 hidden group-hover/disabled:flex items-center px-2.5 py-1 text-[10px] font-bold text-white bg-black border border-white/20 whitespace-nowrap z-50">
          Disabled Feature
        </div>
        <div className="bg-[#08090c]/80 border border-white/15 rounded-none shadow-xl backdrop-blur-md overflow-hidden opacity-50 grayscale pointer-events-none select-none">
          <div className="p-5 border-b border-white/10 flex justify-between items-center">
            <h2 className="font-bold text-white text-sm uppercase tracking-wider">My Submissions</h2>
            <span className="text-[10px] text-white/40 uppercase font-mono">{requests.length} TOTAL ENTRIES</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-white/5 text-slate-400 text-[10px] uppercase tracking-wider border-b border-white/10 font-bold">
                  <th className="p-4">Merit Details</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Submitted Date</th>
                  <th className="p-4">Proof Document</th>
                  <th className="p-4 text-right">Verification Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {requests.length > 0 ? (
                  requests.map((request) => (
                    <tr key={request.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 max-w-sm">
                        <p className="font-bold text-white text-sm leading-snug">{request.title}</p>
                        <p className="text-slate-400 text-xs mt-1 line-clamp-2 leading-relaxed">{request.description}</p>
                      </td>
                      <td className="p-4">
                        <span className="bg-white/5 text-white/80 text-[10px] font-bold uppercase px-2 py-1 border border-white/10">
                          {request.category}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-slate-300">
                        <p className="text-white font-medium">{request.date}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{request.time}</p>
                      </td>
                      <td className="p-4">
                        {request.proofUrl && request.proofUrl !== "https://" ? (
                          <a
                            href={request.proofUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 border border-emerald-400/30 px-2.5 py-1 rounded-none uppercase transition-colors"
                          >
                            View File ↗
                          </a>
                        ) : (
                          <span className="text-white/30 text-[10px] italic">No document</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase border ${
                          request.status === 'approved' ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300' :
                          request.status === 'rejected' ? 'bg-rose-500/15 border-rose-400/30 text-rose-300' :
                          'bg-amber-500/15 border-amber-400/30 text-amber-300'
                        }`}>
                          {request.status === 'approved' ? 'Verified' :
                            request.status === 'rejected' ? 'Rejected' :
                            'Pending Approval'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12">
                      <EmptyState 
                        icon="award"
                        title="No Merit Claims"
                        description='No merit claims submitted yet.'
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Submit Merit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#08090c] rounded-none shadow-2xl w-full max-w-lg overflow-hidden border border-white/20 flex flex-col max-h-[90vh]">
            <div className="border-b border-white/10 p-5 relative shrink-0">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-white/50 hover:text-white border border-white/10 bg-white/5 p-1 rounded-none transition-colors cursor-pointer"
              >
                ✕
              </button>
              <span className="text-[10px] font-bold tracking-widest uppercase text-emerald-400">
                New Merit Claim
              </span>
              <h2 className="text-xl font-bold mt-1 text-white uppercase">Submit Merit Claim</h2>
              <p className="text-xs text-white/60 mt-0.5">Provide activity details and upload evidence for evaluation</p>
            </div>

            <form onSubmit={handleSubmitRequest} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs text-white/80">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">Claim Title / Event Name</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. PASUM charity run coordinate lead"
                  className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-none text-xs text-white focus:outline-none focus:border-emerald-400"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-none text-xs text-white focus:outline-none focus:border-emerald-400 cursor-pointer"
                  required
                >
                  <option value="Academic" className="bg-[#08090c]">Academic</option>
                  <option value="Leadership" className="bg-[#08090c]">Leadership</option>
                  <option value="Sports" className="bg-[#08090c]">Sports</option>
                  <option value="Volunteering" className="bg-[#08090c]">Volunteering</option>
                  <option value="Others" className="bg-[#08090c]">Others</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">Role / Contribution</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="e.g. Committee member, Project manager, Participant"
                  rows={3}
                  className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-none text-xs text-white focus:outline-none focus:border-emerald-400"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">Proof File URL</label>
                <input
                  type="text"
                  value={newProofUrl}
                  onChange={(e) => setNewProofUrl(e.target.value)}
                  placeholder="e.g. https://drive.google.com/..."
                  className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-none text-xs text-white focus:outline-none focus:border-emerald-400"
                  required
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Link to a verified document or cloud storage folder containing certificates.
                </p>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-white/10 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="border border-white/20 bg-white/5 hover:bg-white/10 text-white font-bold px-4 py-2 rounded-none transition-all cursor-pointer text-xs uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900 text-white font-bold px-5 py-2 rounded-none transition-all cursor-pointer border-none text-xs uppercase"
                >
                  {isSubmitting ? "Submitting..." : "Submit Claim"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
