/**
 * Compartment stack separating flexible content regions.
 *
 * Places `compartments` vertically at their natural content heights and draws
 * separators before every region after the first, using `separatorColor`,
 * `separatorThickness`, and `separatorLineStyle` with base fallbacks.
 *
 * Used by: class title and member compartments.
 */

import type { CSSProperties, ReactElement, ReactNode } from "react";
import styles from "./CompartmentStack.module.css";

type CompartmentStackProps = {
  readonly compartments: readonly ReactNode[];
  readonly separatorColor?: string;
  readonly separatorThickness?: string;
  readonly separatorLineStyle: "solid" | "dashed" | "dotted";
};

export default function CompartmentStack({
  compartments,
  separatorColor,
  separatorThickness,
  separatorLineStyle,
}: CompartmentStackProps): ReactElement {
  const style = {
    "--compartment-separator-color": separatorColor,
    "--compartment-separator-thickness": separatorThickness,
    "--compartment-separator-line-style": separatorLineStyle,
  } as CSSProperties;

  return (
    <div className={styles.stack} style={style}>
      {compartments.map((compartment, index) => (
        <div className={index === 0 ? styles.compartment : styles.separated} key={index}>
          {compartment}
        </div>
      ))}
    </div>
  );
}
