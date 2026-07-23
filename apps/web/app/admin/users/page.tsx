// apps/web/app/admin/users/page.tsx
"use client";

import { useState, useEffect } from "react";
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  ChevronRight,
  GraduationCap
} from "lucide-react";
import { createClient } from "../../../utils/supabase/client";

interface UserProfile {
  id: string;
  role: "student" | "lecturer" | "admin";
  full_name: string;
  institutional_id: string;
  email: string;
  phone_number: string;
  office_location: string;
  affiliation: string;
}

export default function AdminUsersPage() {
  const supabase = createClient();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [activeTab, setActiveTab] = useState<"student" | "lecturer">("student");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Form modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  // Form field states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"student" | "lecturer" | "admin">("student");
  const [institutionalId, setInstitutionalId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [officeLocation, setOfficeLocation] = useState("");
  const [affiliation, setAffiliation] = useState("");

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch("http://localhost:8000/api/admin/users", {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const query = searchQuery.toLowerCase();
    const result = users.filter((u) => {
      const matchesRole = u.role === activeTab;
      const matchesQuery = 
        u.full_name?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query) ||
        u.institutional_id?.toLowerCase().includes(query);
      return matchesRole && matchesQuery;
    });
    setFilteredUsers(result);
  }, [users, activeTab, searchQuery]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch("http://localhost:8000/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          full_name: fullName,
          email,
          role,
          institutional_id: institutionalId || null,
          phone_number: phoneNumber || null,
          office_location: officeLocation || null,
          affiliation: affiliation || null
        })
      });

      if (res.ok) {
        setShowAddModal(false);
        resetForm();
        fetchUsers();
      } else {
        const errData = await res.json();
        alert(errData.detail || "Failed to create user.");
      }
    } catch (err) {
      console.error("Add user error:", err);
    }
  };

  const handleEditClick = (u: UserProfile) => {
    setSelectedUser(u);
    setFullName(u.full_name || "");
    setEmail(u.email || "");
    setRole(u.role);
    setInstitutionalId(u.institutional_id || "");
    setPhoneNumber(u.phone_number || "");
    setOfficeLocation(u.office_location || "");
    setAffiliation(u.affiliation || "");
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`http://localhost:8000/api/admin/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          full_name: fullName,
          email,
          role,
          institutional_id: institutionalId || null,
          phone_number: phoneNumber || null,
          office_location: officeLocation || null,
          affiliation: affiliation || null
        })
      });

      if (res.ok) {
        setShowEditModal(false);
        resetForm();
        fetchUsers();
      } else {
        const errData = await res.json();
        alert(errData.detail || "Failed to update user.");
      }
    } catch (err) {
      console.error("Update user error:", err);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user? All associated data will be deleted.")) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`http://localhost:8000/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (res.ok) {
        fetchUsers();
      } else {
        alert("Failed to delete user.");
      }
    } catch (err) {
      console.error("Delete user error:", err);
    }
  };

  const resetForm = () => {
    setSelectedUser(null);
    setFullName("");
    setEmail("");
    setRole(activeTab);
    setInstitutionalId("");
    setPhoneNumber("");
    setOfficeLocation("");
    setAffiliation("");
  };

  return (
    <main className="flex-1 overflow-y-auto bg-transparent p-10 flex flex-col space-y-8">
      
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-semibold text-slate-900">User Management</h2>
          <p className="text-slate-500 mt-1">Manage and audit student and faculty directory records securely.</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setRole(activeTab);
            setShowAddModal(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl font-semibold text-sm transition-all flex items-center gap-2 shadow-sm"
        >
          <Plus size={16} /> Add User Account
        </button>
      </div>

      {/* Tabs & Search controls */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
        
        {/* Tab Selection */}
        <div className="flex bg-slate-100 p-1 rounded-2xl w-full sm:w-auto">
          <button
            onClick={() => {
              setActiveTab("student");
              setSearchQuery("");
            }}
            className={`flex-1 sm:flex-initial px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "student" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Students
          </button>
          <button
            onClick={() => {
              setActiveTab("lecturer");
              setSearchQuery("");
            }}
            className={`flex-1 sm:flex-initial px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "lecturer" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Faculty Members
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={`Search ${activeTab === 'student' ? 'students' : 'lecturers'}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all text-sm text-slate-800 placeholder-slate-400"
          />
        </div>

      </div>

      {/* User Directory List */}
      {isLoading ? (
        <div className="text-center py-20 text-slate-500 font-medium">Fetching directory...</div>
      ) : filteredUsers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((u) => (
            <div key={u.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
              
              {/* Card top details */}
              <div className="space-y-4">
                
                {/* Header details */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-slate-50 rounded-2xl text-slate-700">
                      {u.role === 'student' ? <GraduationCap size={24} /> : <User size={24} />}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{u.full_name}</h4>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{u.institutional_id || "No ID assigned"}</p>
                    </div>
                  </div>
                </div>

                {/* Body Meta list */}
                <div className="space-y-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-slate-400 shrink-0" />
                    <span className="truncate">{u.email}</span>
                  </div>
                  {u.phone_number && (
                    <div className="flex items-center gap-2">
                      <Phone size={14} className="text-slate-400 shrink-0" />
                      <span>{u.phone_number}</span>
                    </div>
                  )}
                  {u.role === 'lecturer' && u.office_location && (
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-slate-400 shrink-0" />
                      <span className="truncate">{u.office_location}</span>
                    </div>
                  )}
                  {u.affiliation && (
                    <div className="flex items-center gap-2">
                      <Briefcase size={14} className="text-slate-400 shrink-0" />
                      <span className="truncate">{u.affiliation}</span>
                    </div>
                  )}
                </div>

              </div>

              {/* Actions row */}
              <div className="flex justify-end items-center gap-3 mt-6 pt-4 border-t border-slate-100">
                <button
                  onClick={() => handleEditClick(u)}
                  className="p-2 hover:bg-slate-50 text-slate-500 hover:text-blue-600 rounded-xl transition-all border-none bg-transparent cursor-pointer"
                  title="Edit user details"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDeleteUser(u.id)}
                  className="p-2 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-xl transition-all border-none bg-transparent cursor-pointer"
                  title="Remove user account"
                >
                  <Trash2 size={16} />
                </button>
              </div>

            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm">
          <p className="text-slate-500 font-medium">No users found matching your filters.</p>
        </div>
      )}

      {/* ================= ADD USER MODAL ================= */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 p-8 shadow-2xl space-y-6">
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Create New User Account</h3>
              <p className="text-xs text-slate-500 mt-1">Default password for new accounts is <strong className="text-slate-700">password123</strong>.</p>
            </div>

            <form onSubmit={handleAddUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-800"
                    placeholder="E.g. Alan Turing"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-800"
                    placeholder="alan@pasum.edu.my"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-800 bg-white"
                  >
                    <option value="student">Student</option>
                    <option value="lecturer">Lecturer</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Institutional ID</label>
                  <input
                    type="text"
                    value={institutionalId}
                    onChange={(e) => setInstitutionalId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-800"
                    placeholder="E.g. STF-001 or 1720441"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Phone Number</label>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-800"
                  placeholder="+60 12-345 6789"
                />
              </div>

              {role === 'lecturer' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Office Location</label>
                  <input
                    type="text"
                    value={officeLocation}
                    onChange={(e) => setOfficeLocation(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-800"
                    placeholder="Block B, Room 2.4"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Affiliation / Stream / Department</label>
                <input
                  type="text"
                  value={affiliation}
                  onChange={(e) => setAffiliation(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-800"
                  placeholder="E.g. Physics Department or Physical Sciences Stream"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-3 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors bg-transparent cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors border-none cursor-pointer"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= EDIT USER MODAL ================= */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 p-8 shadow-2xl space-y-6">
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Modify User Account</h3>
              <p className="text-xs text-slate-500 mt-1">Modify directory information for this account.</p>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-800 bg-white"
                  >
                    <option value="student">Student</option>
                    <option value="lecturer">Lecturer</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Institutional ID</label>
                  <input
                    type="text"
                    value={institutionalId}
                    onChange={(e) => setInstitutionalId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Phone Number</label>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-800"
                />
              </div>

              {role === 'lecturer' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Office Location</label>
                  <input
                    type="text"
                    value={officeLocation}
                    onChange={(e) => setOfficeLocation(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-800"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Affiliation / Stream / Department</label>
                <input
                  type="text"
                  value={affiliation}
                  onChange={(e) => setAffiliation(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
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

    </main>
  );
}
