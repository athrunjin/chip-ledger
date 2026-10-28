import type { ReactNode } from "react";

interface PageProps {
  title: string;
  /** 标题右侧的操作区 */
  actions?: ReactNode;
  children: ReactNode;
}

/** 页面骨架：统一的标题、边距和最大宽度。 */
export function Page({ title, actions, children }: PageProps) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 md:px-8">
      <header className="flex min-h-16 items-center justify-between gap-4 pt-4 md:pt-8">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
        {actions}
      </header>
      <div className="pt-4">{children}</div>
    </div>
  );
}
