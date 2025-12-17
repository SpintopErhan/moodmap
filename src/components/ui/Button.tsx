// src/components/ui/Button.tsx
import React, { ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react'; // Yükleme ikonu için

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses = "flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-lg font-semibold transition-all duration-200 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variantClasses = {
   primary: 'bg-blue-700 text-white hover:bg-blue-600 shadow-md shadow-blue-700/40', // Mavi tonlarına güncellendi
    secondary: 'bg-slate-700 text-slate-200 hover:bg-slate-600 border border-slate-600',
    danger: 'bg-red-600 text-white hover:bg-red-500 shadow-md shadow-red-500/30',
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading && <Loader2 className="animate-spin h-5 w-5" />}
      {children}
    </button>
  );
};