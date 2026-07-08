import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

function loadWords(filename: string): string[] {
  const file = readFileSync(join(process.cwd(), "public", "wordle_assets", filename), "utf8");
  return file.split("\n").map((w) => w.trim().toLowerCase()).filter(Boolean);
}

// Loaded once at module init — cached for the lifetime of the server process
const WORD_BANK = loadWords("word-bank.csv");
const VALID_SET = new Set([...loadWords("valid-words.csv"), ...WORD_BANK]);

export function GET(req: NextRequest) {
  const check = req.nextUrl.searchParams.get("check");

  if (check !== null) {
    return NextResponse.json({ valid: VALID_SET.has(check.toLowerCase()) });
  }

  const word = WORD_BANK[Math.floor(Math.random() * WORD_BANK.length)].toUpperCase();
  return NextResponse.json({ word });
}
