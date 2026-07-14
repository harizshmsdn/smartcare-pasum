// apps/web/app/classes/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Search, 
  ChevronDown, 
  AlertTriangle, 
  TrendingDown, 
  CheckCircle2,
  Users,
  Calendar,
  MoreVertical,
  Filter,
  ArrowRight
} from "lucide-react";

// Mock Data: Reflecting the risk tiers defined in the SRS
const mockStudents = [
  { id: "1720441", name: "Ahmad Hakimi bin Faisal", status: "critical", attendance: 75, latestScore: 45, lastSeen: "3 days ago" },
  { id: "1720442", name: "Nurul Izzah binti Osman", status: "good", attendance: 96, latestScore: 88, lastSeen: "Today" },
  { id: "1720445", name: "Jason Lee Wei Min", status: "at-risk", attendance: 82, latestScore: 61, lastSeen: "Yesterday" },
  { id: "1720450", name: "Siti Aisyah binti Rahman", status: "good", attendance: 100, latestScore: 92, lastSeen: "Today" },
  { id: "1720451", name: "Muhammad Danial bin Zulkifli", status: "critical", attendance: 68, latestScore: 52, lastSeen: "1 week ago" },
  { id: "1720455", name: "Priya a/p Subramaniam", status: "good", attendance: 92, latestScore: 78, lastSeen: "Today" },
  { id: "1720462", name: "Chong Wei Jie", status: "at-risk", attendance: 85, latestScore: 65, lastSeen: "2 days ago" },
];

// Mock Classes for the dropdown
const mockClasses = [
  "Physics 101 - Group A",
  "Mathematics 201 - Group B",
  "Computer Science 101"
];

export default function ClassesPage() {
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState(mockClasses[0]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  //Filter Logic: Applies Tab selection AND Search Query
  const filteredStudents = mockStudents.filter((student) => {
    //Tab Filter
    const matchesTab = activeTab === "all" || (activeTab === "alerts" && student.status !== "good");
    
    //Search Filter (matches name or ID)
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          student.id.includes(searchQuery);

    return matchesTab && matchesSearch;
  });

  //Calculate dynamic alerts count
  const alertsCount = mockStudents.filter(s => s.status !== "good").length;

  return (
    <main className="flex-1 p-8 overflow-y-auto bg-[#FAF9F6]">
      
      {/* Header & Class Selector */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-semibold text-slate-900">Class Roster</h2>
          <p className="text-slate-500 mt-1">Manage and monitor specific cohorts</p>
        </div>
        
        {/* Dropdown for selecting classes */}
        <div className="relative">
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-3 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-medium shadow-sm hover:bg-slate-50 transition-colors"
          >
            <div className="flex flex-col text-left">
              <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider leading-none mb-1">Current View</span>
              <span className="leading-none">{selectedClass}</span>
            </div>
            <ChevronDown size={18} className="text-slate-400 ml-2" />
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-full min-w-[220px] bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
              {mockClasses.map((cls) => (
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
      </header>

      {/* Top Row: Mini-Bento Class Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-blue-50 p-3 rounded-2xl text-blue-600">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Enrolled Students</p>
            <p className="text-2xl font-bold text-slate-900">42</p>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Class Average</p>
            <p className="text-2xl font-bold text-slate-900">84%</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600">
            <Calendar size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Next Lecture</p>
            <p className="text-lg font-bold text-slate-900">Wed, 10:00 AM</p>
          </div>
        </div>

        {/* Intervention Board CTA */}
        <Link href="/interventions" className="bg-slate-900 p-5 rounded-3xl shadow-md flex items-center justify-between group hover:bg-slate-800 transition-all cursor-pointer">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Action Required</p>
            <p className="text-lg font-bold text-white leading-tight">Intervention<br/>Board</p>
          </div>
          <div className="bg-white/10 p-3 rounded-2xl text-white group-hover:scale-110 group-hover:bg-blue-600 transition-all">
            <ArrowRight size={24} />
          </div>
        </Link>
      </div>

      {/* Roster Container */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        
        {/* Table Toolbar */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-white">
          {/* Tabs for filtering students */}
          <div className="flex gap-2 w-full md:w-auto">
            <button 
              onClick={() => setActiveTab("all")} 
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              All Students
            </button>
            <button 
              onClick={() => setActiveTab("alerts")} 
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === "alerts" ? "bg-red-50 text-red-700 border border-red-200" : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent"}`}
            >
              Alerts Only <span className={`px-1.5 py-0.5 rounded text-xs ${activeTab === "alerts" ? "bg-red-200 text-red-800" : "bg-red-100 text-red-700"}`}>{alertsCount}</span>
            </button>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            {/* FIX 3: Search Input tied to searchQuery state */}
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search matric ID or name..." 
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>
            <button className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors">
              <Filter size={18} />
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                <th className="p-4 font-medium">Student</th>
                <th className="p-4 font-medium">AI Risk Status</th>
                <th className="p-4 font-medium">Attendance</th>
                <th className="p-4 font-medium">Latest Score</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* NOW RENDERING filteredStudents instead of mockStudents */}
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <tr key={student.id} onClick={() => router.push(`/classes/${student.id}`)} className="hover:bg-slate-50 transition-colors group cursor-pointer">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">{student.name}</p>
                          <p className="text-xs text-slate-500">{student.id} • Last seen {student.lastSeen}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      {student.status === "critical" && (
                        <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-md text-xs font-semibold">
                          <AlertTriangle size={14} /> Critical
                        </span>
                      )}
                      {student.status === "at-risk" && (
                        <span className="inline-flex items-center gap-1.5 bg-orange-50 text-orange-700 border border-orange-200 px-2.5 py-1 rounded-md text-xs font-semibold">
                          <TrendingDown size={14} /> At Risk
                        </span>
                      )}
                      {student.status === "good" && (
                        <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-md text-xs font-semibold">
                          <CheckCircle2 size={14} /> On Track
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${student.attendance < 80 ? "text-red-600" : "text-slate-700"}`}>
                          {student.attendance}%
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`font-semibold ${student.latestScore < 50 ? "text-red-600" : "text-slate-700"}`}>
                        {student.latestScore}%
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <MoreVertical size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    No students found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
      </div>
    </main>
  );
}