import { type ReactNode, useEffect, useRef } from "react";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ title, onClose, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-sm rounded-2xl border border-line bg-surface p-3 text-text backdrop:bg-black/60"
    >
      <h2 className="mb-2 font-semibold">{title}</h2>
      {children}
    </dialog>
  );
}
