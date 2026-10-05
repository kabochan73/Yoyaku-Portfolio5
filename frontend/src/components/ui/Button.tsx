import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger";
type Size = "sm" | "md";

const variantClasses: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary-hover",
  secondary: "border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50",
  danger: "bg-danger text-white hover:bg-danger-hover",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4",
};

type Style = {
  variant?: Variant;
  size?: Size;
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & Style;

// リンクをボタンと同じ見た目にするときにも使う
export function buttonClassName({
  variant = "primary",
  size = "md",
}: Style = {}): string {
  return `inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${sizeClasses[size]}`;
}

export function Button({
  variant,
  size,
  type = "button",
  className = "",
  ...props
}: Props) {
  return (
    <button
      type={type}
      className={`${buttonClassName({ variant, size })} ${className}`}
      {...props}
    />
  );
}
