import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-xl border border-[#dcd5c9] bg-white px-3.5 py-2 text-sm text-[#181512] placeholder:text-[#857e76] focus:border-[#b3261e] focus:outline-none focus:ring-2 focus:ring-[#b3261e]/15 disabled:cursor-not-allowed disabled:bg-[#f3efe9] disabled:opacity-60",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-[110px] w-full rounded-xl border border-[#dcd5c9] bg-white px-3.5 py-2.5 text-sm text-[#181512] placeholder:text-[#857e76] focus:border-[#b3261e] focus:outline-none focus:ring-2 focus:ring-[#b3261e]/15 disabled:cursor-not-allowed disabled:bg-[#f3efe9] disabled:opacity-60",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "flex h-11 w-full rounded-xl border border-[#dcd5c9] bg-white px-3.5 py-2 text-sm text-[#181512] focus:border-[#b3261e] focus:outline-none focus:ring-2 focus:ring-[#b3261e]/15 disabled:cursor-not-allowed disabled:bg-[#f3efe9] disabled:opacity-60",
      className,
    )}
    {...props}
  />
));
Select.displayName = "Select";
