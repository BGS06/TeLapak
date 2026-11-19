import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold select-none transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b3261e]/35 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-[#b3261e] text-white hover:bg-[#8f1c15] active:bg-[#7b1711]",
        outline:
          "border border-[#b3261e] bg-white text-[#b3261e] hover:bg-[#fdf2f2] active:bg-[#fbe6e5]",
        secondary:
          "border border-[#d9dfdf] bg-white text-[#171717] hover:bg-[#f2f4f4] active:bg-[#e6eaea]",
        whatsapp: "bg-[#146c43] text-white hover:bg-[#0f5635] active:bg-[#0b4329]",
        danger: "border border-[#fecaca] bg-[#fef2f2] text-[#991b1b] hover:bg-[#fee2e2]",
        ghost: "text-[#666666] hover:bg-[#f2f4f4] hover:text-[#171717]",
      },
      size: {
        sm: "h-8 rounded-md px-3 text-xs",
        md: "h-10 rounded-md px-4 text-sm",
        lg: "h-11 rounded-md px-5 text-sm sm:text-base",
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
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
