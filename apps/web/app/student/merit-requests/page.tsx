// apps/web/app/student/merit-requests/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Award,
  Clock,
  Check,
  X,
  FileText,
  ExternalLink,
  PlusCircle
} from "lucide-react";
import { createClient } from "../../../utils/supabase/client";

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

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("Academic");
  const [newPoints, setNewPoints] = useState(10);
  const [newDescription, setNewDescription] = useState("");
  const [newProofUrl, setNewProofUrl] = useState("https://");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadMeritRequests = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setStudentId(user.id);

      // Fetch Profile for Name
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (profile) {
        setStudentName(profile.full_name);
      }

      // Fetch Merit Claims
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
  }, []);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !newTitle.trim()) return;

    setIsSubmitting(true);
    try {
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

      setToastMessage("Merit claim submitted successfully!");
      setTimeout(() => setToastMessage(null), 3000);

      // Reset Modal Form
      setNewTitle("");
      setNewCategory("Academic");
      setNewPoints(10);
      setNewDescription("");
      setNewProofUrl("https://");
      setIsModalOpen(false);
      
      // Reload list
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
        <Link href="/student/profile" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors">
          <ArrowLeft size={16} /> Back to Profile
        </Link>
        <span className="text-xs text-slate-400 font-medium">Student Portal Workspace</span>
      </div>

      {/* Main Header */}
      <header className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-xs font-bold tracking-wider uppercase text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
              Merit Claims Portfolio
            </span>
            <h1 className="text-3xl font-extrabold text-slate-900 mt-3 font-sans">{studentName || "Student"}</h1>
            <p className="text-slate-500 mt-1">Track and submit co-curricular and leadership merit points</p>
          </div>
          
          <div className="flex gap-4 items-center flex-wrap">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-right flex gap-6 shrink-0">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Pending Claims</span>
                <span className="text-2xl font-black text-blue-600">{pendingCount} requests</span>
              </div>
              <div className="border-l border-slate-200 pl-6">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Approved Points</span>
                <span className="text-2xl font-black text-emerald-600">+{approvedPointsSum} pts</span>
              </div>
            </div>
            
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-[#0b2240] hover:bg-[#12253f] text-white font-semibold px-5 py-3 rounded-xl shadow-md hover:scale-[1.02] active:scale-95 flex items-center gap-2 border-none cursor-pointer text-sm transition-all"
            >
              <PlusCircle size={18} /> Submit Merit Claim
            </button>
          </div>
        </div>
      </header>

      {/* Requests Table Card */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden mb-12">
        <div className="p-6 border-b border-slate-100">
          <h2 className="font-extrabold text-slate-900 text-lg">My Submissions</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100 font-bold">
                <th className="p-5">Merit Details</th>
                <th className="p-5">Category</th>
                <th className="p-5">Submitted Date & Time</th>
                <th className="p-5 text-center">Requested Points</th>
                <th className="p-5">Proof Document</th>
                <th className="p-5 text-right">Verification Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.length > 0 ? (
                requests.map((request) => (
                  <tr key={request.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-5 max-w-sm">
                      <p className="font-bold text-slate-900 text-base leading-snug">{request.title}</p>
                      <p className="text-slate-450 text-xs mt-1.5 line-clamp-2 leading-relaxed">{request.description}</p>
                    </td>
                    <td className="p-5">
                      <span className="bg-slate-100 text-slate-600 text-xs font-semibold px-2.5 py-1 rounded-md">
                        {request.category}
                      </span>
                    </td>
                    <td className="p-5 text-sm text-slate-500 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Clock size={14} className="text-slate-400" />
                        <div>
                          <p className="text-slate-800">{request.date}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{request.time}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-5 text-center font-bold text-slate-900 text-lg font-mono">
                      {request.points}
                    </td>
                    <td className="p-5">
                      {request.proofUrl && request.proofUrl !== "https://" ? (
                        <a 
                          href={request.proofUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50/50 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 transition-colors"
                        >
                          <FileText size={14} /> View File <ExternalLink size={10} />
                        </a>
                      ) : (
                        <span className="text-slate-400 text-xs italic">No document</span>
                      )}
                    </td>
                    <td className="p-5 text-right">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold uppercase border ${
                        request.status === 'approved' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                        request.status === 'rejected' ? 'bg-red-50 border-red-200 text-red-800' :
                        'bg-blue-50 border-blue-200 text-blue-800'
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
                  <td colSpan={6} className="p-10 text-center text-slate-400 italic text-sm">
                    No merit requests submitted yet. Click "Submit Merit Claim" to start.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submit Merit Request Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-slate-900 p-6 text-white relative shrink-0">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors border-none cursor-pointer text-white"
              >
                <X size={20} />
              </button>
              <span className="text-xs font-bold tracking-wider uppercase bg-blue-600 text-white px-3 py-1 rounded-full">
                New Merit Request
              </span>
              <h2 className="text-2xl font-bold mt-3">Submit Merit Claim</h2>
              <p className="text-slate-400 mt-1">Provide activity details and upload evidence for evaluation</p>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitRequest} className="p-8 space-y-5 overflow-y-auto flex-1 text-sm text-slate-700">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Claim Title / Event Name</label>
                <input 
                  type="text" 
                  value={newTitle} 
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. PASUM charity run coordinate lead"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-sans text-slate-800"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Category</label>
                  <select 
                    value={newCategory} 
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-sans"
                  >
                    <option value="Academic">Academic</option>
                    <option value="Leadership">Leadership</option>
                    <option value="Sports">Sports</option>
                    <option value="Volunteering">Volunteering</option>
                    <option value="Others">Others</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Requested Points</label>
                  <input 
                    type="number" 
                    value={newPoints} 
                    onChange={(e) => setNewPoints(Number(e.target.value))}
                    min="5" 
                    max="100" 
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-sans text-slate-800"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Claim Description</label>
                <textarea 
                  value={newDescription} 
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Briefly state your role and responsibilities in this event..."
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-sans text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Proof File URL</label>
                <input 
                  type="text" 
                  value={newProofUrl} 
                  onChange={(e) => setNewProofUrl(e.target.value)}
                  placeholder="e.g. https://domain.com/proof.pdf"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-sans text-slate-800"
                />
                <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                  Provide a link to a cloud storage file (Google Drive, Dropbox) containing certificates or photos.
                </p>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-white hover:bg-slate-100 border border-slate-350 text-slate-700 font-semibold px-5 py-3 rounded-xl transition-all cursor-pointer font-sans"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold px-6 py-3 rounded-xl shadow-md shadow-blue-200 transition-all hover:shadow-lg active:scale-95 cursor-pointer border-none font-sans"
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
