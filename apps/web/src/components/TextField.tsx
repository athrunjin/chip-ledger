import type { Ref } from "react";
import { cn } from "@/lib/cn";

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  issue: string | undefined;
  prefix?: string;
  suffix?: string;
  inputMode: "numeric" | "decimal" | "text";
  inputRef?: Ref<HTMLInputElement>;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

export function TextField({
  id,
  label,
  value,
  issue,
  prefix,
  suffix,
  inputMode,
  inputRef,
  onChange,
  onFocus,
  onBlur,
}: TextFieldProps) {
  const issueId = `${id}-issue`;
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1 block text-sm text-muted">
        {label}
      </label>
      <div
        className={cn(
          "flex min-h-12 items-center gap-1 rounded-xl border bg-surface px-3 focus-within:border-highlight",
          issue ? "border-highlight" : "border-line",
        )}
      >
        {prefix && <span className="text-muted">{prefix}</span>}
        <input
          ref={inputRef}
          id={id}
          type="text"
          inputMode={inputMode}
          autoComplete="off"
          value={value}
          aria-invalid={issue ? true : undefined}
          aria-describedby={issue ? issueId : undefined}
          onChange={(event) => onChange(event.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          className="min-h-11 w-full min-w-0 bg-transparent text-lg outline-none"
        />
        {suffix && <span className="shrink-0 text-sm text-muted">{suffix}</span>}
      </div>
      {issue && (
        <p id={issueId} className="mt-1 text-sm text-highlight">
          {issue}
        </p>
      )}
    </div>
  );
}
