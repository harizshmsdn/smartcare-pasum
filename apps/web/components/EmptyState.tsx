import React from "react";
import { PixelIcon } from "./PixelIcon";

interface EmptyStateProps {
  icon?: any;
  title: string;
  description: string;
  action?: React.ReactNode;
}

// Seamless empty state presentation with no nested card borders
export default function EmptyState({ icon: Icon, title, description, action, className = "" }: EmptyStateProps & { className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center w-full mx-auto text-white/40 ${className}`}>
      <div className="text-white/30 mb-2.5">
        {Icon ? (
          typeof Icon === 'function' ? (
            <Icon size={32} />
          ) : typeof Icon === 'string' ? (
            <PixelIcon name={Icon} size={32} />
          ) : (
            Icon
          )
        ) : (
          <PixelIcon name="classes" size={32} />
        )}
      </div>
      <h3 className="font-mono text-xs uppercase tracking-wider text-white/70 font-bold">{title}</h3>
      <p className="font-mono text-[11px] text-white/40 mt-1 max-w-md">
        {description}
      </p>
      {action && (
        <div className="mt-5">
          {action}
        </div>
      )}
    </div>
  );
}
