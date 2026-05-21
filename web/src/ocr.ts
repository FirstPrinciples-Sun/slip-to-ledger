/**
 * tesseract.js worker. Lazy-loaded — caller must await `getOcrWorker()`
 * before processing the first image. Worker is cached for subsequent calls.
 */
import { createWorker, type Worker } from "tesseract.js";

let workerPromise: Promise<Worker> | null = null;

export function getOcrWorker(): Promise<Worker> {
  if (workerPromise) return workerPromise;
  workerPromise = (async () => {
    const w = await createWorker(["tha", "eng"], 1, {
      logger: (m) => {
        if (m.status === "recognizing text") {
          window.dispatchEvent(
            new CustomEvent("slip:ocr-progress", { detail: m.progress }),
          );
        }
      },
    });
    return w;
  })();
  return workerPromise;
}

export interface OcrResult {
  text: string;
  confidence: number;
}

export async function ocrImage(file: File | Blob): Promise<OcrResult> {
  const w = await getOcrWorker();
  const { data } = await w.recognize(file);
  return {
    text: data.text ?? "",
    confidence: (data.confidence ?? 0) / 100,
  };
}
