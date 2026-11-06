import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface PageProps {
  title: string;
  /** Narrows the page to a centered column under a centered title, for single forms */
  centered?: boolean;
  /** Actions to the right of the title */
  actions?: ReactNode;
  children: ReactNode;
}

/** Page skeleton: shared title, margins and maximum width. */
export function Page({ title, centered = false, actions, children }: PageProps) {
  return (
    <div
      className={cn("mx-auto w-full px-4 md:px-8", centered ? "max-w-md md:max-w-lg" : "max-w-3xl")}
    >
      <header
        className={cn(
          "flex min-h-16 items-center gap-4 pt-4 md:pt-8",
          centered ? "justify-center" : "justify-between",
        )}
      >
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
        {actions}
      </header>
      <div className="pt-4">{children}</div>
    </div>
  );
}
