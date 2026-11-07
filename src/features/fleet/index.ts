// API publique de la feature « fleet » : les autres features n'importent que depuis ce fichier.
export { ActivationBadge } from './components/activation-badge.component';
export { CarrierOrderBar } from './components/carrier-order-bar.component';
export { CarrierPanel } from './components/carrier-panel.component';
export { FleetPanel } from './components/fleet-panel.component';
export { HpBar, StockLine } from './components/unit-stats.component';
export { UnitPanel } from './components/unit-panel.component';
export type { CarrierOrderDraft, CarrierRouteView } from './services/carrier-order-draft.service';
export { useCarrierOrderDraft, useCarrierRouteView } from './services/use-carrier-order-draft';
