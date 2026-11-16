import { useEffect } from 'react';

let lockCount = 0;
let originalBodyOverflow = '';
let originalHtmlOverflow = '';
let originalPaddingRight = '';

/**
 * Locks background scrolling across html and body, preserving scroll position
 * and preventing layout shift from disappearing scrollbars.
 */
export function lockBodyScroll(): void {
  if (typeof document === 'undefined') return;

  if (lockCount === 0) {
    const documentElement = document.documentElement;
    const body = document.body;

    originalBodyOverflow = body.style.overflow;
    originalHtmlOverflow = documentElement.style.overflow;
    originalPaddingRight = body.style.paddingRight;

    // Calculate vertical scrollbar width to prevent background jump
    const scrollBarWidth = window.innerWidth - documentElement.clientWidth;
    if (scrollBarWidth > 0) {
      body.style.paddingRight = `${scrollBarWidth}px`;
    }

    body.classList.add('modal-open');
    documentElement.classList.add('modal-open');
    body.style.overflow = 'hidden';
    documentElement.style.overflow = 'hidden';
  }

  lockCount++;
}

/**
 * Decrements the lock count and restores background scroll when all popups/modals close.
 */
export function unlockBodyScroll(): void {
  if (typeof document === 'undefined') return;

  lockCount = Math.max(0, lockCount - 1);

  if (lockCount === 0) {
    const documentElement = document.documentElement;
    const body = document.body;

    body.classList.remove('modal-open');
    documentElement.classList.remove('modal-open');
    body.style.overflow = originalBodyOverflow;
    documentElement.style.overflow = originalHtmlOverflow;
    body.style.paddingRight = originalPaddingRight;
  }
}

/**
 * React hook to lock background scrolling while a popup or modal is open.
 * Supports multiple nested/stacked popups via reference counting.
 */
export function useBodyScrollLock(isLocked: boolean = true): void {
  useEffect(() => {
    if (!isLocked) return;

    lockBodyScroll();

    return () => {
      unlockBodyScroll();
    };
  }, [isLocked]);
}
