import React, { useState, useRef } from 'react';
import { Check, Copy } from 'lucide-react';

export type CopyFieldVariant = 'light' | 'dark' | 'glass';

export type CopyFieldProps = {
  label: string;
  value: string;
  buttonText?: string;
  copiedText?: string;
  variant?: CopyFieldVariant;
  isMonospace?: boolean;
  letterSpacing?: string;
  className?: string;
};

export const CopyField: React.FC<CopyFieldProps> = ({
  label,
  value,
  buttonText = 'نسخ',
  copiedText = 'تم النسخ',
  variant = 'dark',
  isMonospace = false,
  letterSpacing,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleCopy = async () => {
    if (!value) return;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = value;
        textarea.style.position = 'fixed';
        textarea.style.left = '-999999px';
        textarea.style.top = '-999999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
      }

      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setCopied(false);
      }, 2200);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="text-[12px] font-semibold text-slate-300 flex items-center justify-between">
        <span>{label}</span>
        {copied && (
          <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 animate-fade-in">
            <Check className="w-3 h-3" />
            {copiedText}
          </span>
        )}
      </label>

      <div className="group relative flex items-center justify-between gap-2 p-1.5 ps-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/40 transition-all duration-200 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20">
        <span
          dir="ltr"
          className={`truncate select-all text-start flex-1 min-w-0 ${
            isMonospace
              ? 'font-mono font-bold text-sm text-white tracking-wider'
              : 'font-mono text-xs text-slate-200'
          }`}
          style={letterSpacing ? { letterSpacing } : undefined}
        >
          {value || '—'}
        </span>

        <button
          type="button"
          onClick={handleCopy}
          aria-live="polite"
          className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-150 active:scale-95 cursor-pointer outline-none ${
            copied
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs'
          }`}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span>{copiedText}</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 shrink-0" />
              <span>{buttonText}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default CopyField;


