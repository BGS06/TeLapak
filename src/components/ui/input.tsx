import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-md border border-[#d9dfdf] bg-white px-3.5 py-2 text-sm text-[#171717] placeholder:text-[#8c8c8c] transition-colors focus:border-[#b3261e] focus:outline-none focus:ring-2 focus:ring-[#b3261e]/15 disabled:cursor-not-allowed disabled:bg-[#f2f4f4] disabled:opacity-60",
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
      "flex min-h-[110px] w-full rounded-md border border-[#d9dfdf] bg-white px-3.5 py-2.5 text-sm text-[#171717] placeholder:text-[#8c8c8c] transition-colors focus:border-[#b3261e] focus:outline-none focus:ring-2 focus:ring-[#b3261e]/15 disabled:cursor-not-allowed disabled:bg-[#f2f4f4] disabled:opacity-60",
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
      "flex h-10 w-full rounded-md border border-[#d9dfdf] bg-white px-3.5 py-2 text-sm text-[#171717] transition-colors focus:border-[#b3261e] focus:outline-none focus:ring-2 focus:ring-[#b3261e]/15 disabled:cursor-not-allowed disabled:bg-[#f2f4f4] disabled:opacity-60",
      className,
    )}
    {...props}
  />
));
Select.displayName = "Select";