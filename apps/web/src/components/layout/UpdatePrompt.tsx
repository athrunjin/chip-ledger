import { useRegisterSW } from "virtual:pwa-register/react";

/** 有新版本时提示刷新。牌局进行中不强制刷新，由组织者自己决定时机。 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-20 flex items-center gap-3 rounded-2xl bg-text px-4 py-3 text-sm text-bg shadow-lg md:bottom-6 md:left-auto md:w-96"
    >
      <span className="flex-1">有新版本可用</span>
      <button type="button" className="px-2 py-1 text-bg/70" onClick={() => setNeedRefresh(false)}>
        稍后
      </button>
      <button
        type="button"
        className="rounded-lg bg-bg px-3 py-1.5 font-semibold text-text"
        onClick={() => updateServiceWorker(true)}
      >
        刷新
      </button>
    </div>
  );
}
