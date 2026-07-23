// apps/web/app/admin/cases/page.tsx
"use client";

import { useState, useEffect } from "react";
import { 
  ShieldAlert, 
  Award, 
  Check, 
  X, 
  ExternalLink, 
  Clock, 
  AlertTriangle,
  FileText,
  User,
  GraduationCap
} from "lucide-react";
import { createClient } from "../../../utils/supabase/client";

interface Intervention {
  intervention_id: string;
  issue_description: string;
  status: "needs_review" | "in_progress" | "referred" | "resolved" | string;
  priority: "critical" | "high" | "medium" | "low" | string;
  created_at: string;
  updated_at: string;
  student_name: string;
  student_id: string;
  student_inst_id: string;
  lecturer_name: string;
  subject_code: string;
  group_code: string;
}

interface MeritClaim {
  claim_id: string;
  title: string;
  category: string;
  proof_file_url: string;
  status: "pending" | "approved" | "rejected" | string;
  awarded_points: number;
  submitted_at: string;
  student_name: string;
  student_id: string;
  student_inst_id: string;
}

export default function AdminCasesPage() {
  const supabase = createClient();
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [claims, setClaims] = useState<MeritClaim[]>([]);
  
  const [activeTab, setActiveTab] = useState<"interventions" | "claims">("interventions");
  const [isLoading, setIsLoading] = useState(true);

  // Modal edit states
  const [showEditIntervention, setShowEditIntervention] = useState(false);
  const [selectedIntervention, setSelectedIntervention] = useState<Intervention | null>(null);
  const [intStatus, setIntStatus] = useState("");
  const [intPriority, setIntPriority] = useState("");
  const [intDescription, setIntDescription] = useState("");

  // Modal claim review states
  const [showReviewClaim, setShowReviewClaim] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<MeritClaim | null>(null);
  const [claimPoints, setClaimPoints] = useState(10);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 1. Fetch interventions
      const intRes = await fetch("http://localhost:8000/api/admin/interventions", {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (intRes.ok) {
        const d = await intRes.json();
        setInterventions(d.interventions);
      }

      // 2. Fetch merit claims
      const claimsRes = await fetch("http://localhost:8000/api/admin/merit-claims", {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (claimsRes.ok) {
        const d = await claimsRes.json();
        setClaims(d.claims);
      }
    } catch (err) {
      console.error("Error fetching cases data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEditIntClick = (item: Intervention) => {
    setSelectedIntervention(item);
    setIntStatus(item.status);
    setIntPriority(item.priority);
    setIntDescription(item.issue_description);
    setShowEditIntervention(true);
  };

  const handleUpdateIntervention = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIntervention) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`http://localhost:8000/api/admin/interventions/${selectedIntervention.intervention_id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          status: intStatus,
          priority: intPriority,
          issue_description: intDescription
        })
      });

      if (res.ok) {
        setShowEditIntervention(false);
        fetchData();
      } else {
        alert("Failed to update intervention.");
      }
    } catch (err) {
      console.error("Update intervention error:", err);
    }
  };

  const handleReviewClaimClick = (claim: MeritClaim) => {
    setSelectedClaim(claim);
    setClaimPoints(claim.awarded_points || 10);
    setShowReviewClaim(true);
  };

  const handleEvaluateClaim = async (status: "approved" | "rejected") => {
    if (!selectedClaim) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`http://localhost:8000/api/admin/merit-claims/${selectedClaim.claim_id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          status,
          awarded_points: Number(claimPoints)
        })
      });

      if (res.ok) {
        setShowReviewClaim(false);
        fetchData();
      } else {
        alert("Failed to process claim review.");
      }
    } catch (err) {
      console.error("Evaluate claim error:", err);
    }
  };

  const getPriorityColor = (p: string) => {
    switch (p.toLowerCase()) {
      case "critical": return "bg-red-100 text-red-800 border-red-200";
      case "high": return "bg-orange-100 text-orange-800 border-orange-200";
      case "medium": return "bg-blue-100 text-blue-800 border-blue-200";
      default: return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const getStatusColor = (s: string) => {
    switch (s.toLowerCase()) {
      case "needs_review": return "bg-rose-100 text-rose-800 border-rose-200";
      case "in_progress": return "bg-indigo-100 text-indigo-800 border-indigo-200";
      case "referred": return "bg-amber-100 text-amber-800 border-amber-200";
      default: return "bg-emerald-100 text-emerald-800 border-emerald-200";
    }
  };

  return (
    <main className="flex-1 overflow-y-auto bg-transparent p-10 flex flex-col space-y-8">
      
      {/* Header */}
      <div>
        <h2 className="text-3xl font-semibold text-slate-900">Cases & Merit Review</h2>
        <p className="text-slate-500 mt-1">Audit active intervention programs and verify student extra-curricular merit applications.</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-2xl w-full sm:w-96 shadow-sm border border-slate-200">
        <button
          onClick={() => setActiveTab("interventions")}
          className={`flex-1 px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "interventions" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Interventions ({interventions.length})
        </button>
        <button
          onClick={() => setActiveTab("claims")}
          className={`flex-1 px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "claims" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Merit Claims ({claims.length})
        </button>
      </div>

      {/* Roster lists */}
      {isLoading ? (
        <div className="text-center py-20 text-slate-500 font-medium">Loading details...</div>
      ) : activeTab === "interventions" ? (
        interventions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {interventions.map((item) => (
              <div key={item.intervention_id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  
                  {/* Title & Badge */}
                  <div className="flex justify-between items-start gap-2">
                    <div className="space-y-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${getPriorityColor(item.priority)}`}>
                        {item.priority} Priority
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm mt-1">{item.student_name}</h4>
                      <p className="text-[10px] text-slate-400 font-mono">{item.student_inst_id || "No ID"} • {item.subject_code} ({item.group_code})</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border shrink-0 ${getStatusColor(item.status)}`}>
                      {item.status.replace("_", " ")}
                    </span>
                  </div>

                  {/* Description Box */}
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs text-slate-700 leading-relaxed font-medium">
                    {item.issue_description}
                  </div>

                  {/* Date details */}
                  <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 font-semibold">
                    <span>Opened: {new Date(item.created_at).toLocaleDateString()}</span>
                    <span>By: {item.lecturer_name}</span>
                  </div>

                </div>

                <div className="flex justify-end pt-3 border-t border-slate-100">
                  <button
                    onClick={() => handleEditIntClick(item)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-semibold border-none cursor-pointer transition-colors"
                  >
                    Update Case Status
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm">
            <p className="text-slate-500 font-medium">No active student intervention cases found.</p>
          </div>
        )
      ) : (
        claims.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {claims.map((claim) => (
              <div key={claim.claim_id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  
                  {/* Name and title */}
                  <div className="flex justify-between items-start gap-2">
                    <div className="space-y-1">
                      <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-md">{claim.category}</span>
                      <h4 className="font-bold text-slate-900 text-base leading-tight mt-1">{claim.title}</h4>
                      <p className="text-[10px] text-slate-400 font-mono">{claim.student_name} ({claim.student_inst_id || "No ID"})</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize shrink-0 ${
                      claim.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                      claim.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {claim.status}
                    </span>
                  </div>

                  {/* Submission Date */}
                  <div className="text-[10px] text-slate-400 font-medium">
                    Submitted: {new Date(claim.submitted_at).toLocaleDateString()}
                  </div>

                  {/* Proof details */}
                  {claim.proof_file_url && (
                    <div className="pt-2">
                      <a
                        href={claim.proof_file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-bold inline-flex items-center gap-1 bg-blue-50/50 border border-blue-100/50 px-3 py-2 rounded-xl"
                      >
                        <FileText size={14} /> View Attached Proof Document <ExternalLink size={12} />
                      </a>
                    </div>
                  )}

                </div>

                {claim.status === "pending" && (
                  <div className="flex justify-end pt-3 border-t border-slate-100">
                    <button
                      onClick={() => handleReviewClaimClick(claim)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold border-none cursor-pointer transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <Check size={14} /> Review Merit Application
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm">
            <p className="text-slate-500 font-medium">No merit applications submitted yet.</p>
          </div>
        )
      )}

      {/* ================= EDIT INTERVENTION MODAL ================= */}
      {showEditIntervention && selectedIntervention && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 p-8 shadow-2xl space-y-6">
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Update Intervention Case</h3>
              <p className="text-xs text-slate-500 mt-1">Audit status or priorities for {selectedIntervention.student_name}'s program.</p>
            </div>

            <form onSubmit={handleUpdateIntervention} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Case Status</label>
                  <select
                    value={intStatus}
                    onChange={(e) => setIntStatus(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-800 bg-white"
                  >
                    <option value="needs_review">Needs Review</option>
                    <option value="in_progress">In Progress</option>
                    <option value="referred">Referred</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Priority Level</label>
                  <select
                    value={intPriority}
                    onChange={(e) => setIntPriority(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-800 bg-white"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Issue Details / Diagnostic Logs</label>
                <textarea
                  required
                  rows={4}
                  value={intDescription}
                  onChange={(e) => setIntDescription(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-800 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditIntervention(false)}
                  className="px-5 py-3 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors bg-transparent cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors border-none cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= REVIEW MERIT CLAIM MODAL ================= */}
      {showReviewClaim && selectedClaim && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 p-8 shadow-2xl space-y-6">
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Evaluate Merit Application</h3>
              <p className="text-xs text-slate-500 mt-1">Review {selectedClaim.student_name}'s credentials and verify awarded points.</p>
            </div>

            <div className="space-y-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs text-slate-700 leading-relaxed font-semibold">
              <p className="font-bold text-slate-900 text-sm">{selectedClaim.title}</p>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">Category: {selectedClaim.category}</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Verify Awarded Merit Points</label>
              <input
                type="number"
                required
                min={1}
                max={100}
                value={claimPoints}
                onChange={(e) => setClaimPoints(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-800"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => handleEvaluateClaim("rejected")}
                className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 py-3 rounded-xl text-sm font-semibold transition-colors border-none cursor-pointer flex items-center justify-center gap-1"
              >
                <X size={16} /> Reject Claim
              </button>
              <button
                type="button"
                onClick={() => handleEvaluateClaim("approved")}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl text-sm font-semibold transition-colors border-none cursor-pointer flex items-center justify-center gap-1 shadow-sm"
              >
                <Check size={16} /> Approve & Award
              </button>
            </div>
            
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => setShowReviewClaim(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-semibold border-none bg-transparent cursor-pointer"
              >
                Cancel Evaluation
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
