"use client";

import React, { useState } from 'react';
import { PixelIcon } from './PixelIcon';
import { changePassword } from '../app/login/actions';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Real-time live password requirement checks
  const hasMinLength = newPassword.length >= 8;
  const hasCapital = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const isDifferentFromOld = currentPassword.length === 0 || newPassword.length === 0 || newPassword !== currentPassword;
  const passwordsMatch = newPassword.length > 0 && confirmPassword.length > 0 && newPassword === confirmPassword;

  const allRequirementsMet = hasMinLength && hasCapital && hasNumber && hasSpecial && isDifferentFromOld;

  // Handles updating password via server action
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!currentPassword) {
      setErrorMsg("Please enter your current password.");
      return;
    }

    if (!allRequirementsMet) {
      setErrorMsg("Please ensure all password criteria are satisfied.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("Confirm password does not match new password.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await changePassword(currentPassword, newPassword);

      if (res?.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg("Password updated successfully!");
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          onClose();
          setSuccessMsg(null);
        }, 1500);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200 text-white">
      <div className="w-full max-w-md rounded-none bg-[#09111e] p-6 sm:p-8 shadow-2xl border border-white/20 relative">
        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          disabled={isSubmitting}
          className="absolute top-5 right-5 border border-white/15 bg-white/5 hover:bg-white/15 p-1 text-white/70 hover:text-white rounded-none transition-colors cursor-pointer"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5 border-b border-white/10 pb-4">
          <div className="p-2 border border-white/15 bg-white/5 text-blue-400 rounded-none">
            <PixelIcon name="key" size={20} />
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-blue-400">01 // SECURITY</div>
            <h3 className="text-xl font-bold font-mono text-white">Change Password</h3>
            <p className="font-mono text-xs text-white/50 mt-0.5">Update your account credentials</p>
          </div>
        </div>

        {/* Feedback Alerts */}
        {errorMsg && (
          <div className="mb-4 p-3 text-xs font-mono text-red-300 bg-red-500/10 border border-red-500/30 rounded-none flex items-start gap-2.5">
            <PixelIcon name="warning" size={14} className="shrink-0 mt-0.5 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 text-xs font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-none flex items-start gap-2.5">
            <PixelIcon name="check" size={14} className="shrink-0 mt-0.5 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Password Input */}
          <div className="space-y-1.5">
            <label className="font-mono text-xs uppercase tracking-wider text-white/70">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                disabled={isSubmitting}
                placeholder="Enter current password"
                className="w-full px-3.5 py-2.5 pr-10 rounded-none border border-white/20 bg-black/50 font-mono text-xs text-white focus:outline-none focus:border-blue-400 transition-colors placeholder:text-white/30"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors cursor-pointer"
              >
                <PixelIcon name={showCurrent ? "eyeOff" : "eye"} size={16} />
              </button>
            </div>
          </div>

          {/* New Password Input */}
          <div className="space-y-1.5">
            <label className="font-mono text-xs uppercase tracking-wider text-white/70">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={isSubmitting}
                placeholder="Enter new strong password"
                className="w-full px-3.5 py-2.5 pr-10 rounded-none border border-white/20 bg-black/50 font-mono text-xs text-white focus:outline-none focus:border-blue-400 transition-colors placeholder:text-white/30"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors cursor-pointer"
              >
                <PixelIcon name={showNew ? "eyeOff" : "eye"} size={16} />
              </button>
            </div>

            {/* Live Requirement Checklist */}
            <div className="bg-black/40 border border-white/10 rounded-none p-3 mt-2 space-y-1.5 font-mono text-[11px]">
              <div className="text-white/60 mb-1 uppercase tracking-wider">
                Password Requirements:
              </div>
              <div className={`flex items-center gap-2 transition-colors ${hasMinLength ? 'text-emerald-400' : 'text-white/40'}`}>
                <PixelIcon name={hasMinLength ? "check" : "close"} size={13} className={hasMinLength ? 'text-emerald-400' : 'text-white/20'} />
                <span>At least 8 characters</span>
              </div>
              <div className={`flex items-center gap-2 transition-colors ${hasCapital ? 'text-emerald-400' : 'text-white/40'}`}>
                <PixelIcon name={hasCapital ? "check" : "close"} size={13} className={hasCapital ? 'text-emerald-400' : 'text-white/20'} />
                <span>At least one capital letter (A-Z)</span>
              </div>
              <div className={`flex items-center gap-2 transition-colors ${hasNumber ? 'text-emerald-400' : 'text-white/40'}`}>
                <PixelIcon name={hasNumber ? "check" : "close"} size={13} className={hasNumber ? 'text-emerald-400' : 'text-white/20'} />
                <span>At least one number (0-9)</span>
              </div>
              <div className={`flex items-center gap-2 transition-colors ${hasSpecial ? 'text-emerald-400' : 'text-white/40'}`}>
                <PixelIcon name={hasSpecial ? "check" : "close"} size={13} className={hasSpecial ? 'text-emerald-400' : 'text-white/20'} />
                <span>At least one special character (!@#$%^&*)</span>
              </div>
              {currentPassword && newPassword && !isDifferentFromOld && (
                <div className="flex items-center gap-1.5 text-amber-300 pt-1">
                  <PixelIcon name="warning" size={13} className="text-amber-400 shrink-0" />
                  <span>Cannot be the same as current password</span>
                </div>
              )}
            </div>
          </div>

          {/* Confirm Password Input */}
          <div className="space-y-1.5">
            <label className="font-mono text-xs uppercase tracking-wider text-white/70">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isSubmitting}
                placeholder="Re-enter your new password"
                className="w-full px-3.5 py-2.5 pr-10 rounded-none border border-white/20 bg-black/50 font-mono text-xs text-white focus:outline-none focus:border-blue-400 transition-colors placeholder:text-white/30"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors cursor-pointer"
              >
                <PixelIcon name={showConfirm ? "eyeOff" : "eye"} size={16} />
              </button>
            </div>
            {confirmPassword && (
              <div className={`flex items-center gap-1.5 font-mono text-xs pt-1 ${passwordsMatch ? 'text-emerald-400' : 'text-red-400'}`}>
                <PixelIcon name={passwordsMatch ? "check" : "warning"} size={13} className={passwordsMatch ? 'text-emerald-400' : 'text-red-400'} />
                <span>{passwordsMatch ? "Passwords match" : "Passwords do not match"}</span>
              </div>
            )}
          </div>

          <p className="font-mono text-[10px] text-white/40 leading-normal">
            Supabase administrators retain access to manage and verify accounts for beta testing.
          </p>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 rounded-none border border-white/20 bg-white/5 hover:bg-white/10 text-white font-mono text-xs uppercase transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !allRequirementsMet || !passwordsMatch || !currentPassword}
              className="flex-1 px-4 py-2.5 rounded-none border border-blue-400 bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs uppercase font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-none animate-spin" />
              ) : (
                "Update Password"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ChangePasswordModal;
