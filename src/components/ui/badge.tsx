import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium tracking-tight",
  {
    variants: {
      tone: {
        neutral: "bg-[#f3efe9] text-[#57524c] border border-[#e6e0d6]",
        brand: "bg-[#fdeceb] text-[#931d16] border border-[#f8c9c6]",
        success: "bg-[#e8f5ee] text-[#146c43] border border-[#bfe3ce]",
        warning: "bg-[#fef6e6] text-[#92400e] border border-[#f8deb0]",
        danger: "bg-[#fef2f2] text-[#991b1b] border border-[#fecaca]",
        info: "bg-[#eef4ff] text-[#1e40af] border border-[#c7d9fe]",
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
