import { Link, Outlet } from "@tanstack/react-router";
import { cn } from "@/lib/cn";
import { NAV_ITEMS } from "./nav-items";
import { UpdatePrompt } from "./UpdatePrompt";

const linkBase =
  "flex flex-col items-center justify-center gap-1 rounded-xl text-xs font-medium text-muted transition-colors";
const linkActive = "text-text [&_svg]:text-highlight";

export function AppShell() {
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[96px_1fr]">
      {/* 平板及以上：左侧导航栏 */}
      <nav
        aria-label="主导航"
        className="sticky top-0 hidden h-dvh flex-col items-center gap-2 border-r border-line bg-surface pt-[max(1rem,env(safe-area-inset-top))] md:flex"
      >
        <img src="/favicon.svg" alt="" className="mb-4 size-10" />
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={cn(linkBase, "size-18 hover:bg-bg")}
            activeProps={{ className: linkActive, "aria-current": "page" }}
            activeOptions={{ exact: to === "/" }}
          >
            <Icon className="size-6" strokeWidth={1.75} aria-hidden />
            {label}
          </Link>
        ))}
      </nav>

      <main className="min-w-0 pt-[env(safe-area-inset-top)] pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-8">
        <Outlet />
      </main>

      {/* 手机：底部导航栏 */}
      <nav
        aria-label="主导航"
        className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-4 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={cn(linkBase, "h-16")}
            activeProps={{ className: linkActive, "aria-current": "page" }}
            activeOptions={{ exact: to === "/" }}
          >
            <Icon className="size-6" strokeWidth={1.75} aria-hidden />
            {label}
          </Link>
        ))}
      </nav>

      <UpdatePrompt />
    </div>
  );
}
