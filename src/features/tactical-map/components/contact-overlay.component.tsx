import * as engine from '../../../engine';
import { palette } from '../../../app/theme.config';
import * as labels from '../../../shared/ui.label';
import { contactTint } from '../services/contact-tint.service';
import { HEX_POINTS, hexCenter, zoneContour } from '../services/hex-geometry.service';

/** Centre de la zone, moyenne des centres de ses hexagones : il n'indique pas la cible (AB-20). */
function zoneCenter(zone: readonly engine.Hex[]): { x: number; y: number } {
  const centers = zone.map(hexCenter);
  return {
    x: centers.reduce((sum, c) => sum + c.x, 0) / centers.length,
    y: centers.reduce((sum, c) => sum + c.y, 0) / centers.length,
  };
}

/** Une zone de contact suspect : hexagones remplis à la teinte du contact, contour et étiquette (AB-23, AB-26). */
function ContactZone({ contact }: { contact: engine.SuspectContact }) {
  const center = zoneCenter(contact.zone);
  const tint = contactTint(contact.id, palette.contactTints);
  return (
    <g pointerEvents="none" data-testid={`contact-${contact.id}`}>
      {contact.zone.map((hex) => {
        const { x, y } = hexCenter(hex);
        return (
          <polygon
            key={`${hex.col},${hex.row}`}
            points={HEX_POINTS}
            transform={`translate(${x.toFixed(2)} ${y.toFixed(2)})`}
            fill={tint}
            fillOpacity={0.25}
          />
        );
      })}
      <path d={zoneContour(contact.zone)} fill="none" stroke={tint} strokeWidth="1.6" />
      <text
        x={center.x}
        y={center.y}
        fontSize="4.5"
        fontWeight="bold"
        textAnchor="middle"
        dominantBaseline="middle"
        fill={palette.text}
      >
        {contact.id}
      </text>
    </g>
  );
}

/** Opacité d'un contact identifié « ancien » (AB-27). */
const STALE_OPACITY = 0.55;

/**
 * Un navire identifié par recherche active (AB-30) : case à la position exacte, contour de la
 * couleur hostile, badge de type « F » ou « SM » (jamais une silhouette de classe) et étiquette.
 * Un contact « ancien » a un contour en pointillés et une opacité réduite (AB-27).
 */
function IdentifiedContactToken({
  contact,
}: {
  contact: Extract<engine.FriendContact, { kind: 'identified' }>;
}) {
  const { x, y } = hexCenter(contact.position);
  const tint = contactTint(contact.id, palette.contactTints);
  return (
    <g
      transform={`translate(${x.toFixed(2)} ${y.toFixed(2)})`}
      pointerEvents="none"
      opacity={contact.stale ? STALE_OPACITY : 1}
      data-testid={`contact-${contact.id}`}
      data-stale={contact.stale}
    >
      <polygon
        points={HEX_POINTS}
        transform="scale(0.92)"
        fill={tint}
        fillOpacity={0.4}
        stroke={palette.enemy}
        strokeWidth="1.8"
        strokeDasharray={contact.stale ? '3 2' : undefined}
      />
      <text
        y="-1"
        fontSize="6"
        fontWeight="bold"
        textAnchor="middle"
        dominantBaseline="middle"
        fill={palette.text}
      >
        {labels.contactBadgeLabel[contact.targetType]}
      </text>
      <text
        y="5.2"
        fontSize="3.6"
        fontWeight="bold"
        textAnchor="middle"
        dominantBaseline="middle"
        fill={palette.text}
      >
        {contact.id}
      </text>
    </g>
  );
}

/**
 * Contacts du camp ami, sous les unités : zones suspectes et navires identifiés. Aucune unité
 * hostile n'y figure, et aucune cible réelle n'est désignée (SF-04 §5).
 */
export function ContactOverlay({ contacts }: { contacts: readonly engine.FriendContact[] }) {
  return (
    <>
      {contacts.map((contact) =>
        contact.kind === 'suspect' ? (
          <ContactZone key={contact.id} contact={contact} />
        ) : (
          <IdentifiedContactToken key={contact.id} contact={contact} />
        ),
      )}
    </>
  );
}
