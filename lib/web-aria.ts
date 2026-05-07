// Workaround for modals/overlays that set aria-hidden on a container
// while it still holds focus, leaving focus in an inaccessible element.
// Call once at startup, only on web.
export function installWebAriaFix(): void {
  if (typeof document === 'undefined') return;

  const orig = HTMLElement.prototype.setAttribute;
  HTMLElement.prototype.setAttribute = function (name: string, value: string) {
    if (name === 'aria-hidden' && value === 'true') {
      const focused = document.activeElement as HTMLElement | null;
      if (focused && focused !== document.body && this.contains(focused)) {
        focused.blur();
      }
    }
    return orig.call(this, name, value);
  };
}
