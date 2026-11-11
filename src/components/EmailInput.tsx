import { useState, useRef, useEffect } from 'react';
import { Mail } from 'lucide-react';

const DOMAINS = ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com'];

interface EmailInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function EmailInput({ value, onChange, placeholder = 'seu@email.com', disabled = false, className = '' }: EmailInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Detecta se o cursor está após o @
  const atIndex = value.indexOf('@');
  const hasAt = atIndex !== -1;
  const localPart = hasAt ? value.slice(0, atIndex + 1) : value;
  const domainPart = hasAt ? value.slice(atIndex + 1).toLowerCase() : '';
  const hasFullDomain = domainPart.includes('.');

  // Filtra domínios baseado no que foi digitado após o @
  const suggestions = hasAt && !hasFullDomain
    ? DOMAINS.filter((d) => d.toLowerCase().startsWith(domainPart) && d !== domainPart)
    : [];

  // Fecha sugestões ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mostra sugestões quando tem @ e domínio parcial
  useEffect(() => {
    if (suggestions.length > 0 && hasAt && !hasFullDomain) {
      setShowSuggestions(true);
      setSelectedIndex(0);
    } else {
      setShowSuggestions(false);
    }
  }, [suggestions.length, hasAt, hasFullDomain]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
  };

  const selectDomain = (domain: string) => {
    const newEmail = localPart + domain;
    onChange(newEmail);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (suggestions[selectedIndex]) {
        e.preventDefault();
        selectDomain(suggestions[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
      <input
        ref={inputRef}
        type="email"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (suggestions.length > 0) setShowSuggestions(true);
        }}
        placeholder={placeholder}
        autoComplete="email"
        disabled={disabled}
        className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-slate-900 placeholder-slate-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
      />
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
          {suggestions.map((domain, index) => (
            <button
              key={domain}
              type="button"
              onClick={() => selectDomain(domain)}
              className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors ${
                index === selectedIndex
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                  : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span className="text-slate-400 dark:text-slate-500">{localPart}</span>
              <span className="font-medium">{domain}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
