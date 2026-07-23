import { ChevronDown } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';

const MENU_OPEN_EVENT = 'openapi-studio:utility-menu-open';

interface UtilityMenuProps {
  label: string;
  isOpen: boolean;
  onOpen(): void;
  onClose(): void;
  children: ReactNode;
}

export function UtilityMenu({ label, isOpen, onOpen, onClose, children }: UtilityMenuProps) {
  const id = useId();
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const clearScheduledClose = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = undefined;
  };
  const openMenuFromPointerOrFocus = () => {
    clearScheduledClose();
    onOpen();
    document.dispatchEvent(new CustomEvent(MENU_OPEN_EVENT, { detail: id }));
  };
  const scheduleClose = () => {
    clearScheduledClose();
    closeTimerRef.current = setTimeout(onClose, 240);
  };

  useEffect(() => () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  useEffect(() => {
    const closeWhenAnotherMenuOpens = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== id) onClose();
    };
    document.addEventListener(MENU_OPEN_EVENT, closeWhenAnotherMenuOpens);
    return () => document.removeEventListener(MENU_OPEN_EVENT, closeWhenAnotherMenuOpens);
  }, [id, onClose]);

  return <div className="utility-menu" onMouseEnter={openMenuFromPointerOrFocus} onMouseLeave={scheduleClose} onFocusCapture={openMenuFromPointerOrFocus} onBlurCapture={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      clearScheduledClose();
      onClose();
    }
  }}>
    <button className="secondary-btn compact utility-menu-trigger" type="button" aria-label={`${label} 메뉴`} aria-haspopup="menu" aria-expanded={isOpen} onClick={openMenuFromPointerOrFocus}>{label}<ChevronDown size={14} /></button>
    {isOpen && <div className="utility-menu-popover" role="menu" aria-label={`${label} 작업`}>{children}</div>}
  </div>;
}
