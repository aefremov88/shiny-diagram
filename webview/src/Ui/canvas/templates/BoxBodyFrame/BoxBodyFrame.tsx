/**
 * Box body frame stacking validation and content in a flexible region.
 *
 * Places the optional `validation` slot before `children`, allowing the body to
 * take its natural content height while leaving overflow visible; `elementRef`
 * exposes the body host for consumer-owned measurement.
 *
 * Used by: class member compartments.
 */

import type { ReactElement, ReactNode, Ref } from "react";
import styles from "./BoxBodyFrame.module.css";

type BoxBodyFrameProps = {
  readonly validation?: ReactNode;
  readonly children: ReactNode;
  readonly elementRef?: Ref<HTMLDivElement>;
};

export default function BoxBodyFrame({
  validation,
  children,
  elementRef,
}: BoxBodyFrameProps): ReactElement {
  return (
    <div ref={elementRef} className={styles.body}>
      {validation}
      {children}
    </div>
  );
}
