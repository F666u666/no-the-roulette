import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { ArrowLeft, Check, SpeakerHigh, SpeakerSlash } from '@phosphor-icons/react';
export function Back({ onClick }: { onClick: () => void }) {
  return (
    <button className="icon-button" aria-label="戻る" onClick={onClick}>
      <ArrowLeft size={23} />
    </button>
  );
}
export function Switch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button className="switch-row" role="switch" aria-checked={checked} onClick={onChange}>
      <span>{label}</span>
      <span className={`switch ${checked ? 'on' : ''}`}>
        <span />
      </span>
    </button>
  );
}
export function SoundToggle({ enabled, onClick }: { enabled: boolean; onClick: () => void }) {
  return (
    <button
      className="icon-button sound-button"
      aria-label={enabled ? '効果音をOFF' : '効果音をON'}
      onClick={onClick}
    >
      {enabled ? <SpeakerHigh size={21} /> : <SpeakerSlash size={21} />}
    </button>
  );
}
export function Dialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current!;
    d.showModal();
    return () => d.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby="dialog-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div>
        <h2 id="dialog-title">{title}</h2>
        {children}
      </div>
    </dialog>
  );
}
export function DoneFlash() {
  return (
    <div className="done-flash" role="status" aria-label="保存しました">
      <Check weight="bold" size={50} />
    </div>
  );
}
