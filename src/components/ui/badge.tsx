import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium tracking-tight",
  {
    variants: {
      tone: {
        neutral: "border border-[#edf2f2] bg-[#f2f4f4] text-[#666666]",
        brand: "border border-[#f8c9c6] bg-[#fdf2f2] text-[#b3261e]",
        success: "border border-[#bfe3ce] bg-[#e8f5ee] text-[#146c43]",
        warning: "border border-[#f8deb0] bg-[#fef6e6] text-[#92400e]",
        danger: "border border-[#fecaca] bg-[#fef2f2] text-[#991b1b]",
        info: "border border-[#c7d9fe] bg-[#eef4ff] text-[#1e40af]",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}