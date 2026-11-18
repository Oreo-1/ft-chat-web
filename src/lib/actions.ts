/**
 * "Open the message menu" gesture: right-click on desktop, long-press on
 * touch. Android Chrome fires `contextmenu` on long-press by itself; iOS
 * Safari doesn't, so a touch timer covers it. Fires at most once per gesture.
 */
export function longpress(node: HTMLElement, onMenu: (x: number, y: number) => void) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let start = { x: 0, y: 0 };
  let lastFired = 0;
  let cb = onMenu;

  const fire = (x: number, y: number) => {
    if (Date.now() - lastFired < 800) return;
    lastFired = Date.now();
    navigator.vibrate?.(10);
    cb(x, y);
  };
  const cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  const onContext = (e: MouseEvent) => {
    e.preventDefault();
    fire(e.clientX, e.clientY);
  };
  const onDown = (e: PointerEvent) => {
    if (e.pointerType !== 'touch') return;
    start = { x: e.clientX, y: e.clientY };
    cancel();
    timer = setTimeout(() => fire(start.x, start.y), 500);
  };
  const onMove = (e: PointerEvent) => {
    if (timer && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10) cancel();
  };

  node.addEventListener('contextmenu', onContext);
  node.addEventListener('pointerdown', onDown);
  node.addEventListener('pointermove', onMove);
  node.addEventListener('pointerup', cancel);
  node.addEventListener('pointercancel', cancel);

  return {
    update(next: (x: number, y: number) => void) {
      cb = next;
    },
    destroy() {
      cancel();
      node.removeEventListener('contextmenu', onContext);
      node.removeEventListener('pointerdown', onDown);
      node.removeEventListener('pointermove', onMove);
      node.removeEventListener('pointerup', cancel);
      node.removeEventListener('pointercancel', cancel);
    },
  };
}
