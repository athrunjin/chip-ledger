import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface PageProps {
  title: string;
  /** Narrows the page to a centered column under a centered title, for single forms. Actions stay on the right. */
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
          "min-h-16 items-center gap-2 pt-4 md:pt-8",
          centered ? "grid grid-cols-[1fr_auto_1fr]" : "flex justify-between gap-4",
        )}
      >
        <h1
          className={cn("text-2xl font-semibold tracking-tight md:text-3xl", {
            "col-start-2": centered,
          })}
        >
          {title}
        </h1>
        {centered && actions ? <div className="min-w-0 justify-self-end">{actions}</div> : actions}
      </header>
      <div className="pt-4">{children}</div>
    </div>
  );
}
