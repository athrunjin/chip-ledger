interface ToggleProps {
  label: string;
  detail?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

/** A labeled on/off switch taking one row. */
export function Toggle({ label, detail, checked, disabled = false, onChange }: ToggleProps) {
  return (
    <label className="relative flex min-h-11 cursor-pointer items-center justify-between gap-3 has-disabled:cursor-default">
      <span className="min-w-0">
        <span className="block font-medium">{label}</span>
        {detail && <span className="block text-sm text-muted">{detail}</span>}
      </span>
      <input
        type="checkbox"
        role="switch"
        aria-checked={checked}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className="relative h-7 w-12 shrink-0 rounded-full bg-line transition-colors peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-highlight peer-disabled:opacity-60 after:absolute after:top-0.5 after:left-0.5 after:size-6 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5"
      />
    </label>
  );
}
