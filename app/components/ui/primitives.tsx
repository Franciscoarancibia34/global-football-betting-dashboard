import * as React from "react";
import { twMerge } from "tailwind-merge";
import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-sm", className)} {...props} />;
}

export function Button({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200",
        className
      )}
      {...props}
    />
  );
}

export function IconButton({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card))] transition hover:bg-[rgb(var(--muted))]",
        className
      )}
      {...props}
    />
  );
}

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md bg-[rgb(var(--muted))] px-2 py-1 text-xs font-semibold text-[rgb(var(--muted-foreground))]",
        className
      )}
      {...props}
    />
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-10 w-full rounded-md border border-[rgb(var(--border))] bg-transparent px-3 text-sm outline-none ring-0 placeholder:text-[rgb(var(--muted-foreground))] focus:border-[rgb(var(--accent-2))]",
        props.className
      )}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "h-10 w-full rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 text-sm outline-none focus:border-[rgb(var(--accent-2))]",
        props.className
      )}
    />
  );
}
