/** Slip row in the batch view. Source of truth from WASM after parse(). */
export type SlipStatus = "ready" | "review" | "failed" | "processing";

export interface SlipRow {
  id: string;
  filename: string;
  bank: string;
  amount: number | null;
  date: string | null;
  confidence: number; // 0..1
  status: SlipStatus;
  raw?: unknown;
  imageDataUrl?: string;
}

export interface AppState {
  slips: SlipRow[];
  filter: "all" | "ready" | "review" | "failed";
  selectedId: string | null;
}

export const initialState: AppState = {
  slips: [],
  filter: "all",
  selectedId: null,
};
