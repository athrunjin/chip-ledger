import { type FormEvent, type ReactNode, useEffect, useRef } from "react";

interface FormDialogProps {
  title: string;
  submitLabel: string;
  saving: boolean;
  saveFailed: boolean;
  onSubmit: (event: FormEvent) => void;
  onClose: () => void;
  children: ReactNode;
}

/** Dialog for entering one ledger record: title, form content, cancel and confirm. */
export function FormDialog({
  title,
  submitLabel,
  saving,
  saveFailed,
  onSubmit,
  onClose,
  children,
}: FormDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-line bg-surface p-5 text-text backdrop:bg-black/60"
    >
      <h2 className="text-lg font-semibold">{title}</h2>
      <form onSubmit={onSubmit} noValidate className="mt-4 flex flex-col gap-4">
        {children}
        {saveFailed && (
          <p role="alert" className="text-sm text-highlight">
            保存失败，请重试。
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => ref.current?.close()}
            className="min-h-12 rounded-xl border border-line font-medium"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={saving}
            className="min-h-12 rounded-xl bg-accent font-semibold text-accent-text disabled:opacity-60"
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}
