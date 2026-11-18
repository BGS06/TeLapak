import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b3261e]/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        primary: "bg-[#b3261e] text-white hover:bg-[#931d16] active:bg-[#7b1711] shadow-xs",
        secondary:
          "bg-white text-[#181512] border border-[#e6e0d6] hover:bg-[#f3efe9] active:bg-[#ebe4db]",
        whatsapp:
          "bg-[#146c43] text-white hover:bg-[#0f5635] active:bg-[#0b4329] shadow-xs",
        danger:
          "bg-[#fef2f2] text-[#991b1b] border border-[#fecaca] hover:bg-[#fee2e2]",
        ghost: "text-[#57524c] hover:bg-[#f3efe9] hover:text-[#181512]",
      },
      size: {
        sm: "h-9 px-3.5 text-xs rounded-lg",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-5 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />;
  },
);
Button.displayName = "Button";

export { buttonVariants };
