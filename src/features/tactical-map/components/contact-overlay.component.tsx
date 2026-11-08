import * as engine from '../../../engine';
import { palette } from '../../../app/theme.config';
import { HEX_POINTS, hexCenter, zoneContour } from '../services/hex-geometry.service';

/** Centre de la zone, moyenne des centres de ses hexagones : il n'indique pas la cible (AB-20). */
function zoneCenter(zone: readonly engine.Hex[]): { x: number; y: number } {
  const centers = zone.map(hexCenter);
  return {
    x: centers.reduce((sum, c) => sum + c.x, 0) / centers.length,
    y: centers.reduce((sum, c) => sum + c.y, 0) / centers.length,
  };
}

/** Une zone de contact : hexagones remplis, contour continu et étiquette (AB-23). */
function ContactZone({ contact }: { contact: engine.Contact }) {
  const center = zoneCenter(contact.zone);
  return (
    <g pointerEvents="none" data-testid={`contact-${contact.id}`}>
      {contact.zone.map((hex) => {
        const { x, y } = hexCenter(hex);
        return (
          <polygon
            key={`${hex.col},${hex.row}`}
            points={HEX_POINTS}
            transform={`translate(${x.toFixed(2)} ${y.toFixed(2)})`}
            fill={palette.suspect}
            fillOpacity={0.25}
          />
        );
      })}
      <path d={zoneContour(contact.zone)} fill="none" stroke={palette.suspect} strokeWidth="1.6" />
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

/** Zones des contacts suspects du camp ami, sous les unités ; aucune unité hostile n'y figure. */
export function ContactOverlay({ contacts }: { contacts: readonly engine.Contact[] }) {
  return (
    <>
      {contacts.map((contact) => (
        <ContactZone key={contact.id} contact={contact} />
      ))}
    </>
  );
}
