#!/usr/bin/env node
/**
 * slip-to-ledger CLI — Node.js port that reuses the same parser as the web app.
 *
 * Usage:
 *   slip parse <files-or-globs...> [--format json|csv] [--out <path>]
 *   slip watch <directory> [--format json|csv]
 *   slip schema
 *
 * Why TypeScript not Rust: the parser surface is in TS already (web/src/parse.ts)
 * and tesseract.js works in Node. Rust CLI in slip-cli/ remains as a stretch.
 */

import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { existsSync, watch as fsWatch } from "node:fs";
import { join, resolve, basename, extname } from "node:path";
import { createWorker, type Worker } from "tesseract.js";
import { parseSlip, bankLabel } from "../../web/src/parse.js";
import { parseArgs } from "./args.js";

const SCHEMA_PATH = resolve(import.meta.dirname, "../../schema.json");
const VERSION = "0.1.0-dev";

const HELP = `slip-to-ledger v${VERSION}

USAGE
  slip parse <files...> [--format json|csv] [--out <path>]
  slip watch <directory> [--format json|csv]
  slip schema
  slip --help

EXAMPLES
  slip parse slip.png slip2.jpg
  slip parse ./*.png --format csv --out ledger.csv
  slip watch ./inbox --format json
`;

let worker: Worker | null = null;

async function getWorker(): Promise<Worker> {
  if (worker) return worker;
  process.stderr.write("loading tesseract.js (tha+eng)... ");
  worker = await createWorker(["tha", "eng"], 1);
  process.stderr.write("ready\n");
  return worker;
}

async function ocrFile(path: string) {
  const w = await getWorker();
  const bytes = await readFile(path);
  const { data } = await w.recognize(bytes);
  return { text: data.text ?? "", confidence: (data.confidence ?? 0) / 100 };
}

interface Row {
  filename: string;
  bank: string;
  amount: number | null;
  date: string | null;
  reference: string | null;
  confidence: number;
  fee: number | null;
  sender: string | null;
  receiver: string | null;
}

async function processFiles(paths: string[]): Promise<Row[]> {
  const rows: Row[] = [];
  for (const p of paths) {
    process.stderr.write(`  ${basename(p)}... `);
    try {
      const ocr = await ocrFile(p);
      const parsed = parseSlip(ocr.text);
      rows.push({
        filename: basename(p),
        bank: bankLabel(parsed.bank),
        amount: parsed.amount,
        date: parsed.date,
        reference: parsed.reference,
        confidence: ocr.confidence,
        fee: parsed.fee,
        sender: parsed.senderName,
        receiver: parsed.receiverName,
      });
      process.stderr.write(
        `${parsed.amount !== null ? `${parsed.amount.toFixed(2)} THB` : "—"}\n`,
      );
    } catch (e) {
      process.stderr.write(`error: ${(e as Error).message}\n`);
    }
  }
  return rows;
}

function toCsv(rows: Row[]): string {
  const headers = [
    "filename",
    "bank",
    "date",
    "amount",
    "reference",
    "sender",
    "receiver",
    "fee",
    "confidence",
  ];
  const out = [headers.join(",")];
  for (const r of rows) {
    out.push(
      [
        r.filename,
        r.bank,
        r.date ?? "",
        r.amount ?? "",
        r.reference ?? "",
        r.sender ?? "",
        r.receiver ?? "",
        r.fee ?? "",
        r.confidence.toFixed(2),
      ]
        .map(esc)
        .join(","),
    );
  }
  return out.join("\n");
}

function esc(v: string | number | null): string {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function emit(rows: Row[], format: string, out?: string) {
  const text = format === "csv" ? toCsv(rows) : JSON.stringify(rows, null, 2);
  if (out) {
    await writeFile(out, text, "utf8");
    process.stderr.write(`wrote ${rows.length} row(s) → ${out}\n`);
  } else {
    process.stdout.write(text + "\n");
  }
}

async function expandPaths(input: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const p of input) {
    const abs = resolve(p);
    if (!existsSync(abs)) {
      process.stderr.write(`warning: not found: ${p}\n`);
      continue;
    }
    const s = await stat(abs);
    if (s.isDirectory()) {
      for (const name of await readdir(abs)) {
        if (isImage(name)) out.push(join(abs, name));
      }
    } else {
      out.push(abs);
    }
  }
  return out;
}

function isImage(name: string): boolean {
  const ext = extname(name).toLowerCase();
  return [".png", ".jpg", ".jpeg", ".webp", ".bmp"].includes(ext);
}

async function cmdParse(args: ReturnType<typeof parseArgs>) {
  if (args.positional.length === 0) {
    process.stderr.write("error: no input files\n" + HELP);
    process.exit(2);
  }
  const files = await expandPaths(args.positional);
  if (files.length === 0) {
    process.stderr.write("error: no readable image files\n");
    process.exit(2);
  }
  process.stderr.write(`processing ${files.length} file(s)\n`);
  const rows = await processFiles(files);
  await emit(rows, String(args.flags.format ?? "json"), args.flags.out as string | undefined);
  if (worker) await worker.terminate();
}

async function cmdWatch(args: ReturnType<typeof parseArgs>) {
  const dir = args.positional[0];
  if (!dir) {
    process.stderr.write("error: directory required\n");
    process.exit(2);
  }
  const abs = resolve(dir);
  if (!existsSync(abs)) {
    process.stderr.write(`error: directory not found: ${dir}\n`);
    process.exit(2);
  }
  process.stderr.write(`watching ${abs}\n`);
  const seen = new Set<string>();
  fsWatch(abs, async (_event, filename) => {
    if (!filename || !isImage(filename)) return;
    const full = join(abs, filename);
    if (seen.has(full)) return;
    seen.add(full);
    setTimeout(async () => {
      const rows = await processFiles([full]);
      await emit(rows, String(args.flags.format ?? "json"));
    }, 250);
  });
  // Prevent process from exiting
  await new Promise(() => {});
}

async function cmdSchema() {
  const text = await readFile(SCHEMA_PATH, "utf8");
  process.stdout.write(text);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.cmd === "--help" || args.cmd === "-h" || args.flags.help || args.flags.h) {
    process.stdout.write(HELP);
    return;
  }
  if (args.cmd === "--version" || args.cmd === "-v" || args.flags.version || args.flags.v) {
    process.stdout.write(`slip-to-ledger ${VERSION}\n`);
    return;
  }
  switch (args.cmd) {
    case "parse":
      await cmdParse(args);
      break;
    case "watch":
      await cmdWatch(args);
      break;
    case "schema":
      await cmdSchema();
      break;
    case "help":
      process.stdout.write(HELP);
      break;
    default:
      process.stderr.write(`unknown command: ${args.cmd}\n${HELP}`);
      process.exit(2);
  }
}

main().catch((e) => {
  process.stderr.write(`error: ${e.message}\n`);
  process.exit(1);
});
