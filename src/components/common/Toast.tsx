import { useApp } from '../../context/AppContext';

export function Toast() {
  const { toast } = useApp();

  return (
    <div
      aria-live="polite"
      className={`fixed top-20 left-1/2 -translate-x-1/2 z-[70] bg-inverse-surface text-inverse-on-surface px-4 py-2.5 rounded-full font-label-md text-label-md shadow-xl flex items-center gap-2 pointer-events-none transition-all duration-300 ${
        toast.visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      }`}
    >
      <span className="material-symbols-outlined text-[18px] text-tertiary-fixed-dim">
        {toast.icon}
      </span>
      <span className="whitespace-nowrap">{toast.message}</span>
    </div>
  );
}
