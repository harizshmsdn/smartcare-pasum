import React from "react";
import { PixelIcon } from "./PixelIcon";

interface EmptyStateProps {
  icon?: any;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="border border-white/15 bg-[#09111e]/80 backdrop-blur-md rounded-none p-10 text-center shadow-2xl flex flex-col items-center justify-center py-16 w-full mx-auto text-white">
      <div className="border border-white/10 bg-white/5 p-4 rounded-none text-white/50 mb-4">
        {Icon ? (
          typeof Icon === 'function' ? <Icon size={36} /> : Icon
        ) : (
          <PixelIcon name="classes" size={36} />
        )}
      </div>
      <h3 className="font-mono text-lg font-bold uppercase tracking-wider text-white">{title}</h3>
      <p className="font-mono text-xs text-white/50 mt-1 max-w-md">
        {description}
      </p>
      {action && (
        <div className="mt-6">
          {action}
        </div>
      )}
    </div>
  );
}
