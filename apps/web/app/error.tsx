"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service if available
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 text-center">
      <div className="bg-red-50 text-red-600 p-4 rounded-full mb-6">
        <AlertTriangle size={48} />
      </div>
      <h2 className="text-2xl font-bold text-slate-800 mb-2">
        Something went wrong!
      </h2>
      <p className="text-slate-600 mb-6 max-w-md">
        An unexpected error occurred while loading this page. We've been notified and are looking into it.
      </p>
      <div className="flex gap-4">
        <Button onClick={() => reset()} variant="default">
          Try again
        </Button>
        <Button onClick={() => window.location.href = '/'} variant="outline">
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
