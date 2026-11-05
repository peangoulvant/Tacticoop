/** Vue de la carte : un point du viewBox (u) s'affiche à l'écran en `u * k + (x, y)`. */
export interface View {
  k: number;
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export const MAX_ZOOM_FACTOR = 8;

/** Échelle minimale : la carte couvre toute la zone, sans bande vide (tronquée si besoin). */
export const coverScale = (viewport: Size, content: Size): number =>
  Math.max(viewport.width / content.width, viewport.height / content.height);

/** Garde l'échelle dans ses bornes et la carte alignée sur les bords de la zone. */
export function clampView(view: View, viewport: Size, content: Size): View {
  const min = coverScale(viewport, content);
  const k = Math.min(min * MAX_ZOOM_FACTOR, Math.max(min, view.k));
  return {
    k,
    x: Math.min(0, Math.max(viewport.width - content.width * k, view.x)),
    y: Math.min(0, Math.max(viewport.height - content.height * k, view.y)),
  };
}

/** Zoom autour d'un point de l'écran (molette, boutons) : ce point reste fixe. */
export function zoomAt(
  view: View,
  factor: number,
  anchor: { x: number; y: number },
  viewport: Size,
  content: Size,
): View {
  const next = clampView({ ...view, k: view.k * factor }, viewport, content);
  const ratio = next.k / view.k;
  return clampView(
    {
      k: next.k,
      x: anchor.x - (anchor.x - view.x) * ratio,
      y: anchor.y - (anchor.y - view.y) * ratio,
    },
    viewport,
    content,
  );
}

/** Vue initiale : carte sur toute la largeur, centrée verticalement sur un point d'intérêt. */
export function initialView(viewport: Size, content: Size, focusY: number): View {
  const k = coverScale(viewport, content);
  return clampView({ k, x: 0, y: viewport.height / 2 - focusY * k }, viewport, content);
}

/**
 * Vue effective : celle choisie par le joueur (recadrée), sinon la vue initiale.
 * `null` tant que la zone n'a pas de taille mesurée.
 */
export function resolveView(
  custom: View | null,
  viewport: Size,
  content: Size,
  focusY: number,
): View | null {
  if (viewport.width <= 0 || viewport.height <= 0) return null;
  return custom ? clampView(custom, viewport, content) : initialView(viewport, content, focusY);
}
