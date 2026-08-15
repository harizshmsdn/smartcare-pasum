import React from "react";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm flex flex-col items-center justify-center py-20 w-full mx-auto">
      <div className="bg-slate-50 p-5 rounded-full text-slate-400 mb-6 border border-slate-100 shadow-sm">
        <Icon size={48} strokeWidth={1.5} />
      </div>
      <h3 className="text-2xl font-bold text-slate-900">{title}</h3>
      <p className="text-slate-500 mt-2 max-w-sm text-sm">
        {description}
      </p>
      {action && (
        <div className="mt-8">
          {action}
        </div>
      )}
    </div>
  );
}
