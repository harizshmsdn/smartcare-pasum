// apps/web/app/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  QrCode, 
  AlertTriangle, 
  TrendingDown, 
  ChevronLeft,
  ChevronRight,
  BookOpen,
  MonitorPlay,
  Beaker,
  Clock
} from "lucide-react";

// Mock Data: Today's Schedule for the Carousel
const scheduleToday = [
  { 
    id: 1, 
    title: "Physics 101 - Mechanics", 
    group: "Group A", 
    time: "10:00 AM - 12:00 PM", 
    location: "Lecture Hall 3", 
    status: "Upcoming", 
    critical: 2, 
    atRisk: 5, 
    attendance: 88 
  },
  { 
    id: 2, 
    title: "Mathematics 201 - Calculus", 
    group: "Group B", 
    time: "2:00 PM - 3:00 PM", 
    location: "Tutorial Room 1", 
    status: "Scheduled", 
    critical: 0, 
    atRisk: 1, 
    attendance: 95 
  },
  { 
    id: 3, 
    title: "Computer Science 101", 
    group: "Group A", 
    time: "4:00 PM - 6:00 PM", 
    location: "Computer Lab 2", 
    status: "Scheduled", 
    critical: 1, 
    atRisk: 3, 
    attendance: 92 
  },
];

// Mock Data: All Assigned Classes for the bottom grid
const allAssignedClasses = [
  { id: 101, title: "Physics 101 - Mechanics", type: "Lecture", time: "Mon 10:00 AM", attendance: 88, icon: MonitorPlay },
  { id: 102, title: "Mathematics 201 - Calculus", type: "Tutorial", time: "Mon 2:00 PM", attendance: 95, icon: BookOpen },
  { id: 103, title: "Computer Science 101", type: "Lab", time: "Mon 4:00 PM", attendance: 92, icon: Beaker },
  { id: 104, title: "Physics 102 - Waves & Optics", type: "Lecture", time: "Wed 9:00 AM", attendance: 91, icon: MonitorPlay },
  { id: 105, title: "Chemistry 101 - Organic", type: "Lab", time: "Thu 11:00 AM", attendance: 85, icon: Beaker },
];

export default function HomePage() {
  // Carousel State - Defaults to the first item (Upcoming Class)
  const [activeIndex, setActiveIndex] = useState(0);

  const nextSlide = () => {
    setActiveIndex((prev) => (prev === scheduleToday.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setActiveIndex((prev) => (prev === 0 ? scheduleToday.length - 1 : prev - 1));
  };

  return (
    <main className="flex-1 overflow-y-auto bg-transparent flex flex-col">
      
      {/* 1. TOP HALF: 3D CAROUSEL (50vh height) */}
      <div className="relative w-full h-[55vh] min-h-[450px] flex items-center justify-center overflow-hidden bg-slate-900/5 rounded-b-[3rem] shadow-inner mb-10 pt-4">
        
        {/* Header Overlay */}
        <div className="absolute top-8 left-10 z-40">
          <h2 className="text-3xl font-semibold text-slate-900">Welcome back, Dr. Ahmad</h2>
          <p className="text-slate-500 mt-1">Monday, 6 July 2026 • Your Schedule</p>
        </div>

        {/* Carousel Navigation Arrows */}
        <button 
          onClick={prevSlide}
          className="absolute left-10 z-40 bg-white/80 backdrop-blur border border-slate-200 p-3 rounded-full shadow-lg text-slate-700 hover:bg-white hover:scale-110 transition-all"
        >
          <ChevronLeft size={24} />
        </button>
        
        <button 
          onClick={nextSlide}
          className="absolute right-10 z-40 bg-white/80 backdrop-blur border border-slate-200 p-3 rounded-full shadow-lg text-slate-700 hover:bg-white hover:scale-110 transition-all"
        >
          <ChevronRight size={24} />
        </button>

        {/* 3D Track */}
        <div className="relative w-full max-w-4xl h-[350px] flex items-center justify-center perspective-[1200px]">
          {scheduleToday.map((cls, index) => {
            // Calculate relative position for the 3D effect
            const offset = index - activeIndex;
            const isCenter = offset === 0;
            const isRight = offset > 0 || (activeIndex === scheduleToday.length - 1 && index === 0);
            const isLeft = offset < 0 || (activeIndex === 0 && index === scheduleToday.length - 1);
            
            // Determine Tailwind transform classes based on position
            let transformClasses = "translate-x-full scale-50 opacity-0 z-0"; // Hidden default
            if (isCenter) {
              transformClasses = "translate-x-0 scale-100 opacity-100 z-30 blur-none shadow-2xl";
            } else if (isRight && Math.abs(offset) === 1 || (activeIndex === scheduleToday.length - 1 && index === 0)) {
              transformClasses = "translate-x-[35%] scale-75 opacity-70 z-20 blur-[4px] shadow-lg cursor-pointer hover:blur-none";
            } else if (isLeft && Math.abs(offset) === 1 || (activeIndex === 0 && index === scheduleToday.length - 1)) {
              transformClasses = "-translate-x-[35%] scale-75 opacity-70 z-20 blur-[4px] shadow-lg cursor-pointer hover:blur-none";
            }

            return (
              <div 
                key={cls.id}
                onClick={() => !isCenter && setActiveIndex(index)}
                className={`absolute w-full max-w-2xl bg-white rounded-3xl border border-slate-200 p-8 transition-all duration-700 ease-[cubic-bezier(0.25,0.8,0.25,1)] ${transformClasses}`}
              >
                
                
                <div className="relative z-10 flex flex-col justify-between h-full gap-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className={`text-xs font-bold tracking-wider uppercase px-3 py-1 rounded-full ${isCenter ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                        {cls.status} • {cls.time}
                      </span>
                      <h3 className="text-3xl font-bold text-slate-900 mt-4">{cls.title}</h3>
                      <p className="text-slate-500 text-lg mt-1">{cls.group} • {cls.location}</p>
                    </div>
                    
                    {/* Primary Call to Action (Only clickable on active card) */}
                    {isCenter && (
                      <Link href="/attendance/active" className="flex flex-col items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-2xl font-semibold shadow-md shadow-blue-200 transition-all active:scale-95">
                        <QrCode size={28} />
                        <span className="text-sm">Start Session</span>
                      </Link>
                    )}
                  </div>

                  {/* Active Card Metrics */}
                  <div className={`grid grid-cols-3 gap-4 border-t border-slate-100 pt-6 transition-opacity duration-500 ${isCenter ? 'opacity-100' : 'opacity-40'}`}>
                    <div className="bg-red-50 p-3 rounded-xl border border-red-100">
                      <div className="flex items-center gap-1.5 text-red-700 text-xs font-bold uppercase mb-1">
                        <AlertTriangle size={14} /> Critical
                      </div>
                      <div className="text-2xl font-black text-red-700">{cls.critical}</div>
                    </div>
                    
                    <div className="bg-orange-50 p-3 rounded-xl border border-orange-100">
                      <div className="flex items-center gap-1.5 text-orange-700 text-xs font-bold uppercase mb-1">
                        <TrendingDown size={14} /> At-Risk
                      </div>
                      <div className="text-2xl font-black text-orange-700">{cls.atRisk}</div>
                    </div>
                    
                    <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                      <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold uppercase mb-1">
                         Attendance
                      </div>
                      <div className="text-2xl font-black text-emerald-700">{cls.attendance}%</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. BOTTOM HALF: ALL ASSIGNED CLASSES GRID */}
      <div className="px-10 pb-10">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900">All Assigned Classes</h3>
            <p className="text-sm text-slate-500 mt-1">Semester 1 • Academic Year 2025/2026</p>
          </div>
          <Link href="/classes" className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors">
            View full roster →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {allAssignedClasses.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-2.5 rounded-xl ${
                    item.type === 'Lecture' ? 'bg-indigo-100 text-indigo-600' :
                    item.type === 'Tutorial' ? 'bg-emerald-100 text-emerald-600' :
                    'bg-amber-100 text-amber-600'
                  }`}>
                    <Icon size={20} />
                  </div>
                  <span className="bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md">
                    {item.type}
                  </span>
                </div>
                
                <h4 className="font-bold text-slate-900 text-lg leading-tight mb-2 group-hover:text-blue-600 transition-colors">
                  {item.title}
                </h4>
                
                <div className="space-y-2 mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Clock size={16} className="text-slate-400" />
                    <span className="font-medium">{item.time}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Overall Attendance</span>
                    <span className={`font-bold ${item.attendance < 90 ? 'text-orange-600' : 'text-emerald-600'}`}>
                      {item.attendance}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </main>
  );
}