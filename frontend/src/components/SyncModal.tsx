import React, { useEffect, useState, useRef } from 'react';
import {
  X,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Terminal,
  Brain,
  ExternalLink,
  MessageSquareCode,
  ShieldAlert,
} from 'lucide-react';
import {
  startSync,
  getSyncStatus,
  submitSyncOtp,
  cancelSync,
  openMessagesPermissions,
} from '../services/api';
import type { SyncStatusResponse } from '../types';

const InstagramIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete: () => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({
  isOpen,
  onClose,
  onSyncComplete,
}) => {
  const [syncState, setSyncState] = useState<SyncStatusResponse | null>(null);
  const [otpCode, setOtpCode] = useState<string>('');
  const [isSubmittingOtp, setIsSubmittingOtp] = useState<boolean>(false);
  const [otpMessage, setOtpMessage] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [permMsg, setPermMsg] = useState<string | null>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);

  // Poll sync status every 1.2s when modal is open
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const poll = async () => {
      try {
        const state = await getSyncStatus();
        if (isMounted) {
          setSyncState(state);
        }
      } catch (e) {
        console.error('Failed to poll sync status:', e);
      }
    };

    poll();
    const interval = setInterval(poll, 1200);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isOpen]);

  // Auto-scroll logs to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [syncState?.logs]);

  // Focus OTP input when awaiting OTP
  useEffect(() => {
    if (syncState?.awaiting_otp) {
      setTimeout(() => otpInputRef.current?.focus(), 150);
    }
  }, [syncState?.awaiting_otp]);

  if (!isOpen) return null;

  const isRunning =
    syncState?.status === 'running' ||
    syncState?.status === 'extracting' ||
    syncState?.status === 'curating' ||
    syncState?.status === 'saving';

  const isAwaitingOtp = syncState?.awaiting_otp;
  const isCompleted = syncState?.status === 'completed';
  const isError = syncState?.status === 'error';
  const hasMessagesAccess = syncState?.messages_access ?? false;

  const handleStartSync = async () => {
    setIsStarting(true);
    setPermMsg(null);
    try {
      const res = await startSync();
      setSyncState(res.state);
    } catch (err: any) {
      alert(`Could not start sync: ${err.message}`);
    } finally {
      setIsStarting(false);
    }
  };

  const handleOtpSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!otpCode.trim()) return;

    setIsSubmittingOtp(true);
    setOtpMessage(null);
    try {
      const res = await submitSyncOtp(otpCode.trim());
      setOtpMessage(res.message);
      setOtpCode('');
    } catch (err: any) {
      setOtpMessage(`Error: ${err.message}`);
    } finally {
      setIsSubmittingOtp(false);
    }
  };

  const handleOpenPermissions = async () => {
    try {
      const res = await openMessagesPermissions();
      setPermMsg(res.message);
    } catch (err: any) {
      setPermMsg(`Could not open System Settings: ${err.message}`);
    }
  };

  const handleCancel = async () => {
    try {
      await cancelSync();
    } catch (err) {
      console.error(err);
    }
  };

  const handleClose = () => {
    if (isCompleted) {
      onSyncComplete();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs select-none">
      <div className="w-full max-w-xl bg-[#161616] border border-[#2a2a2a] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#242424] flex items-center justify-between bg-[#191919]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-linear-to-tr from-amber-500/20 via-rose-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-rose-400">
              <InstagramIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#f0f0f0] flex items-center gap-2">
                Sync Instagram Saved Vault
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 font-mono border border-sky-500/30">
                  @ishan_roy31
                </span>
              </h2>
              <p className="text-[11px] text-[#7a7a7a]">
                Playwright crawl, auto SMS switch & macOS Messages OTP + Gemini 3.5 Flash Lite curation
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1 rounded text-[#777] hover:text-[#e0e0e0] hover:bg-[#252525] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* macOS Messages Auto-OTP Status Bar */}
          <div
            className={`px-3.5 py-2.5 rounded-lg border flex items-center justify-between gap-3 text-xs ${
              hasMessagesAccess
                ? 'bg-emerald-950/15 border-emerald-500/25 text-emerald-300'
                : 'bg-amber-950/20 border-amber-500/30 text-amber-200'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {hasMessagesAccess ? (
                <MessageSquareCode className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              <div className="truncate">
                <span className="font-medium">
                  {hasMessagesAccess
                    ? 'macOS Messages Auto-OTP Ready'
                    : 'macOS Messages DB Needs Full Disk Access'}
                </span>
                <p className="text-[11px] text-[#999] truncate">
                  {hasMessagesAccess
                    ? 'Switches WhatsApp 2FA to SMS (if needed), opens Messages & auto-fills your OTP.'
                    : 'Enable Full Disk Access for Terminal / Antigravity so Curio can read SMS OTPs automatically.'}
                </p>
              </div>
            </div>

            {!hasMessagesAccess && (
              <button
                onClick={handleOpenPermissions}
                className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-[11px] font-medium shrink-0 transition-colors cursor-pointer"
              >
                Grant Access
              </button>
            )}
          </div>

          {permMsg && (
            <div className="text-[11px] text-amber-300/90 font-mono px-1">
              {permMsg}
            </div>
          )}

          {/* Main Status Hero */}
          <div
            className={`p-4 rounded-lg border transition-all ${
              isCompleted
                ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                : isError
                ? 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                : isAwaitingOtp
                ? 'bg-amber-950/25 border-amber-500/40 text-amber-200'
                : isRunning
                ? 'bg-sky-950/25 border-sky-500/35 text-sky-200'
                : 'bg-[#1c1c1c] border-[#2b2b2b] text-[#cccccc]'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : isError ? (
                  <AlertCircle className="w-5 h-5 text-rose-400" />
                ) : isAwaitingOtp ? (
                  <KeyRound className="w-5 h-5 text-amber-400 animate-pulse" />
                ) : isRunning ? (
                  <RefreshCw className="w-5 h-5 text-sky-400 animate-spin" />
                ) : (
                  <Brain className="w-5 h-5 text-sky-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold tracking-wide uppercase font-mono">
                    {syncState?.status || 'Ready'}
                  </h3>
                  {(isRunning || isAwaitingOtp) && (
                    <span className="text-[10px] font-mono text-sky-400 animate-pulse">
                      Live sync active
                    </span>
                  )}
                </div>

                <p className="text-xs mt-1 leading-relaxed text-[#dedede]">
                  {syncState?.stage || 'Click Start Sync to fetch new saved posts from Instagram.'}
                </p>

                {isCompleted && (
                  <div className="mt-2.5 pt-2 border-t border-emerald-500/20 flex items-center justify-between text-xs">
                    <span className="text-emerald-300 font-medium">
                      Successfully synced {syncState.new_count} new reels!
                    </span>
                    <button
                      onClick={handleClose}
                      className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition-colors cursor-pointer text-xs font-medium"
                    >
                      View in Vault →
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Automatic + Interactive OTP Card (Shown when 2FA is active) */}
          {isAwaitingOtp && (
            <div className="p-4 rounded-lg bg-[#1f1b14] border border-amber-500/50 shadow-lg space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold">
                  <MessageSquareCode className="w-4 h-4 text-amber-400 animate-bounce" />
                  Watching macOS Messages for Instagram OTP...
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/30">
                  Auto-fill Active
                </span>
              </div>

              {syncState?.auto_otp_status && (
                <div className="text-[11px] font-mono text-amber-200/90 bg-black/30 px-2.5 py-1.5 rounded border border-amber-500/20">
                  {syncState.auto_otp_status}
                </div>
              )}

              <p className="text-xs text-[#b8a58b] leading-relaxed">
                Curio automatically switched 2FA to SMS (if it defaulted to WhatsApp), opened your Mac&apos;s <strong>Messages</strong> app, and is watching for the Instagram SMS code to enter it automatically:
              </p>

              <form onSubmit={handleOtpSubmit} className="flex items-center gap-2">
                <input
                  ref={otpInputRef}
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="Auto-detecting from Messages (or enter 6-digit code)"
                  className="flex-1 bg-[#141414] border border-amber-500/40 focus:border-amber-400 px-3 py-2 rounded-md text-sm font-mono tracking-widest text-amber-100 placeholder-[#666] outline-none"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={isSubmittingOtp || !otpCode.trim()}
                  className="px-4 py-2 rounded-md bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {isSubmittingOtp ? 'Submitting...' : 'Submit OTP'}
                </button>
              </form>

              {otpMessage && (
                <p className="text-[11px] text-amber-300 font-mono">{otpMessage}</p>
              )}
            </div>
          )}

          {/* Live Activity Terminal Log */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-[#777]">
              <div className="flex items-center gap-1.5 font-mono">
                <Terminal className="w-3.5 h-3.5 text-[#888]" />
                Live Execution Activity
              </div>
              <span className="font-mono text-[10px]">
                {syncState?.logs?.length || 0} events
              </span>
            </div>

            <div className="bg-[#101010] border border-[#222] rounded-lg p-3 max-h-48 overflow-y-auto font-mono text-[11px] leading-relaxed space-y-1 scrollbar-thin">
              {(!syncState?.logs || syncState.logs.length === 0) && (
                <div className="text-[#555] italic">No logs yet. Click Start Sync to begin.</div>
              )}
              {syncState?.logs?.map((entry, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-[#555] shrink-0">{entry.time}</span>
                  <span
                    className={
                      entry.message.includes('complete') ||
                      entry.message.includes('Successfully') ||
                      entry.message.includes('accepted')
                        ? 'text-emerald-400'
                        : entry.message.includes('Found Instagram OTP') ||
                          entry.message.includes('Messages')
                        ? 'text-amber-300 font-medium'
                        : entry.message.includes('Extracted') || entry.message.includes('Discovered')
                        ? 'text-sky-300 font-medium'
                        : entry.message.includes('Gemini')
                        ? 'text-purple-300'
                        : entry.message.includes('Error') || entry.message.includes('failed')
                        ? 'text-rose-400'
                        : 'text-[#9c9c9c]'
                    }
                  >
                    {entry.message}
                  </span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-[#242424] bg-[#141414] flex items-center justify-between">
          <div className="text-[11px] text-[#666] flex items-center gap-1">
            <span>Target:</span>
            <a
              href="https://www.instagram.com/ishan_roy31/saved/"
              target="_blank"
              rel="noreferrer"
              className="text-sky-400/80 hover:text-sky-300 underline inline-flex items-center gap-0.5"
            >
              /ishan_roy31/saved/
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>

          <div className="flex items-center gap-2">
            {(isRunning || isAwaitingOtp) && (
              <button
                onClick={handleCancel}
                className="px-3 py-1.5 rounded-md border border-[#333] hover:bg-[#222] text-[#888] hover:text-[#ccc] text-xs font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}

            {!isRunning && !isAwaitingOtp && (
              <button
                onClick={handleStartSync}
                disabled={isStarting}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-sky-500 hover:bg-sky-400 active:scale-95 text-black font-semibold text-xs transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isStarting ? 'animate-spin' : ''}`} />
                {isStarting ? 'Starting...' : isCompleted ? 'Sync Again' : 'Start Sync'}
              </button>
            )}

            {isCompleted && (
              <button
                onClick={handleClose}
                className="px-3.5 py-1.5 rounded-md bg-[#252525] hover:bg-[#303030] text-[#dedede] hover:text-white text-xs font-medium transition-colors cursor-pointer"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
