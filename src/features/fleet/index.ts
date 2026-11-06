// API publique de la feature « fleet » : les autres features n'importent que depuis ce fichier.
export { ActivationBadge } from './components/ActivationBadge';
export { CarrierOrderBar } from './components/CarrierOrderBar';
export { CarrierPanel } from './components/CarrierPanel';
export { FleetPanel } from './components/FleetPanel';
export { HpBar, StockLine } from './components/UnitStats';
export type { CarrierOrderDraft, CarrierRouteView } from './services/carrierOrderDraft';
export { useCarrierOrderDraft, useCarrierRouteView } from './services/useCarrierOrderDraft';
