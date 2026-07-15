import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "border-2 border-charcoal-900 bg-pogo text-charcoal-900 hover:bg-pogo-soft font-semibold shadow-[0_4px_0_#0e1014] hover:-translate-y-px hover:shadow-[0_5px_0_#0e1014]",
  secondary:
    "border border-white/16 bg-white/5 text-ivory hover:border-pogo/40 hover:bg-white/10",
  ghost: "text-ivory/80 hover:text-ivory hover:bg-white/5",
  danger: "border border-red-500/40 text-red-300 hover:bg-red-500/10",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-pogo/60 disabled:pointer-events-none disabled:opacity-40",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
