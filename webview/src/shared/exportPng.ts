/**
 * @fileoverview Result contract for Editor PNG capture.
 */

export type ExportPngResult =
  | {
      readonly status: "success";
      readonly requestId: number;
      readonly base64: string;
    }
  | {
      readonly status: "error";
      readonly requestId: number;
      readonly stage: string;
      readonly message: string;
    };
