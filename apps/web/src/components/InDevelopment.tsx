/** 标记尚未实现的功能，注明计划在哪个里程碑完成。 */
export function InDevelopment({ milestone }: { milestone: string }) {
  return (
    <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-xs text-muted">
      {milestone} 开发中
    </span>
  );
}
