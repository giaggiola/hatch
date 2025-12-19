'use client';

import { useState } from 'react';
import { X, Copy, Share2, Mail, Check } from 'lucide-react';
import InviteQRCode from './InviteQRCode';
import { api } from '@/lib/api';

interface InviteShareModalProps {
  code: string;
  onClose: () => void;
}

export default function InviteShareModal({ code, onClose }: InviteShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState('');

  const inviteUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/invite/${code}`
    : `/invite/${code}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on Hatch',
          text: "I'd like to pick baby names together with you on Hatch!",
          url: inviteUrl,
        });
      } catch (err) {
        // User cancelled or share failed
        console.log('Share cancelled');
      }
    }
  };

  const handleSendEmail = async () => {
    if (!email.trim()) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setEmailSending(true);
    setEmailError('');

    try {
      await api.createInvite(email);
      setEmailSent(true);
      setEmail('');
      setTimeout(() => setEmailSent(false), 3000);
    } catch (err) {
      setEmailError('Failed to send invite. Please try again.');
      console.error('Email send error:', err);
    } finally {
      setEmailSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Invite Partner</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* QR Code */}
          <div className="flex flex-col items-center">
            <p className="text-sm text-gray-500 mb-4 text-center">
              Scan this QR code to join
            </p>
            <InviteQRCode code={code} size={180} />
            <p className="mt-3 text-xs text-gray-400">
              Code: <span className="font-mono font-medium">{code}</span>
            </p>
          </div>

          {/* Invite Link */}
          <div>
            <label className="text-sm text-gray-500 block mb-2">Or share link</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inviteUrl}
                readOnly
                className="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-600 truncate"
              />
              <button
                onClick={handleCopy}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-1.5 ${
                  copied
                    ? 'bg-green-500 text-white'
                    : 'bg-primary-500 text-white hover:bg-primary-600'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Native Share (mobile) */}
          {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
            <button
              onClick={handleNativeShare}
              className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
            >
              <Share2 className="w-4 h-4" />
              Share via...
            </button>
          )}

          {/* Email Invite */}
          <div>
            <label className="text-sm text-gray-500 block mb-2">Send invite by email</label>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError('');
                }}
                placeholder="partner@email.com"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                onClick={handleSendEmail}
                disabled={emailSending || !email.trim()}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 ${
                  emailSent
                    ? 'bg-green-500 text-white'
                    : 'bg-primary-500 text-white hover:bg-primary-600'
                }`}
              >
                {emailSent ? (
                  <>
                    <Check className="w-4 h-4" />
                    Sent!
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    {emailSending ? 'Sending...' : 'Send'}
                  </>
                )}
              </button>
            </div>
            {emailError && (
              <p className="text-xs text-red-500 mt-1">{emailError}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <p className="text-xs text-gray-400 text-center">
            This invite expires in 7 days
          </p>
        </div>
      </div>
    </div>
  );
}
