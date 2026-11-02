import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import type { Hex } from '../../engine';
import { clampView, resolveView, zoomAt, type Size, type View } from './viewTransform';

/** Déplacement (px) au-delà duquel un appui devient un glisser et non un clic. */
const DRAG_THRESHOLD = 4;

/** Taille de la zone d'affichage, recalculée à chaque redimensionnement de la fenêtre. */
function useElementSize(ref: RefObject<HTMLElement | null>): Size {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return size;
}

/** La molette doit empêcher le défilement de la page : écouteur natif non passif. */
function useWheelZoom(
  ref: RefObject<HTMLElement | null>,
  zoomBy: (factor: number, anchor: { x: number; y: number }) => void,
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      zoomBy(Math.exp(-e.deltaY * 0.0015), { x: e.clientX - rect.left, y: e.clientY - rect.top });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [ref, zoomBy]);
}

/** Case sous un point de l'écran, retrouvée par ses attributs `data-col` / `data-row`. */
function hexAtPoint(x: number, y: number): Hex | null {
  const cell = document.elementFromPoint(x, y)?.closest('[data-col]');
  if (!cell) return null;
  return { col: Number(cell.getAttribute('data-col')), row: Number(cell.getAttribute('data-row')) };
}

interface Drag {
  x: number;
  y: number;
  view: View;
  moved: boolean;
}

/** Glisser = déplacer la carte ; appui sans glisser = clic sur la case sous le curseur. */
function usePanAndClick(
  view: View | null,
  viewport: Size,
  content: Size,
  setCustom: (view: View) => void,
  onCellClick: (hex: Hex) => void,
) {
  const drag = useRef<Drag | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!view || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, view, moved: false };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    d.moved = true;
    setCustom(clampView({ ...d.view, x: d.view.x + dx, y: d.view.y + dy }, viewport, content));
  };

  // Avec la capture du pointeur, la case cliquée se retrouve par ses coordonnées.
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.moved) return;
    const hex = hexAtPoint(e.clientX, e.clientY);
    if (hex) onCellClick(hex);
  };

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: () => (drag.current = null),
  };
}

/**
 * Vue de la carte : pleine largeur, déplaçable au glisser-déposer, zoomable à la molette.
 * Tant que le joueur n'a rien touché, la vue initiale suit la taille de la zone.
 */
export function useMapView(
  contentWidth: number,
  contentHeight: number,
  focusY: number,
  onCellClick: (hex: Hex) => void,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewport = useElementSize(containerRef);
  const content = useMemo(
    () => ({ width: contentWidth, height: contentHeight }),
    [contentWidth, contentHeight],
  );
  const [custom, setCustom] = useState<View | null>(null);
  const view = resolveView(custom, viewport, content, focusY);

  const zoomBy = useCallback(
    (factor: number, anchor?: { x: number; y: number }) =>
      setCustom((previous) => {
        const base = resolveView(previous, viewport, content, focusY);
        const center = anchor ?? { x: viewport.width / 2, y: viewport.height / 2 };
        return base ? zoomAt(base, factor, center, viewport, content) : previous;
      }),
    [viewport, content, focusY],
  );
  useWheelZoom(containerRef, zoomBy);
  const pointerHandlers = usePanAndClick(view, viewport, content, setCustom, onCellClick);

  return {
    containerRef,
    viewport,
    view,
    zoomBy,
    resetView: () => setCustom(null),
    pointerHandlers,
  };
}
