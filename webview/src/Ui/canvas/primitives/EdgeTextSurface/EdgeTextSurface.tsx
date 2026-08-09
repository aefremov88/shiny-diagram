/**
 * Edge-text pill sized to its text.
 *
 * Renders `text` on a single line and sizes itself to its text with fixed
 * minimums, centered on the point where the consumer places it. Pointer input
 * remains available across both text and surface.
 *
 * Modifiers:
 * - `interaction` — the pill's resting pointer role:
 *   - `select` presents an action cursor. Used by: labels and multiplicities on
 *     unselected relationships
 *   - `edit` presents the default cursor. Used by: labels and multiplicities on
 *     selected relationships
 * - `variant` — the edge-text situation:
 *   - `label` uses light label treatment. Used by: relationship labels
 *   - `multiplicity` uses dark caption treatment. Used by: endpoint
 *     multiplicities
 */

import { useLayoutEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import styles from "./EdgeTextSurface.module.css";

type EdgeTextSurfaceProps = {
  readonly text: string;
  readonly interaction: "select" | "edit";
  readonly variant: "label" | "multiplicity";
};

const MIN_WIDTH = 24;
const HORIZONTAL_PADDING = 12;
const HEIGHT = 18;

export default function EdgeTextSurface({
  text,
  interaction,
  variant,
}: EdgeTextSurfaceProps): ReactElement {
  const textRef = useRef<SVGTextElement>(null);
  const [textWidth, setTextWidth] = useState(0);
  const surfaceWidth = Math.max(MIN_WIDTH, textWidth + HORIZONTAL_PADDING);
  const treatmentClass = variant === "label" ? styles.label : styles.multiplicity;
  const interactionClass = interaction === "select" ? styles.select : styles.edit;

  useLayoutEffect(() => {
    setTextWidth(textRef.current?.getComputedTextLength() ?? 0);
  }, [text, variant]);

  return (
    <>
      <rect
        x={-surfaceWidth / 2}
        y={-HEIGHT / 2}
        width={surfaceWidth}
        height={HEIGHT}
        className={`${styles.surface} ${treatmentClass} ${interactionClass}`}
      />
      <text
        ref={textRef}
        x={0}
        y={0}
        className={`${styles.text} ${treatmentClass} ${interactionClass}`}
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {text}
      </text>
    </>
  );
}
