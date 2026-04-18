/**
 * /api/summarize – Route Handler
 * ─────────────────────────────────────────────────────────────────────
 * Accepts cleaned notebook text and sends it to the Gemini API with a
 * specialized system instruction for generating a "Context Recovery
 * Package" – a high-density summary optimized for LLM consumption.
 * ─────────────────────────────────────────────────────────────────────
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

// ── System Instruction ───────────────────────────────────────────────
const SYSTEM_INSTRUCTION = `Act as a Principal ML Engineer. You will receive raw code/markdown from a Jupyter Notebook.
Your goal is to produce a 'Context Recovery Package'.

Summary Requirements:
1. **Dependencies & Environment**: List ALL imports, installed packages, and any environment setup (GPU, seeds, configs).
2. **Logic Flow**: Map the core functions, classes, and their interactions. Show the data pipeline from input → transforms → output.
3. **Current State**: What has been fully implemented vs. what is stubbed/incomplete/TODO. Note any bugs or issues visible in the code.
4. **Key Variables & Shapes**: Document critical variable names, tensor shapes, model architectures, and hyperparameters.
5. **Execution Order**: Note the intended cell execution order if it matters for state.

Format: Use highly condensed technical shorthand to save tokens for the next LLM. Use bullet points, abbreviations, and compact notation. Avoid prose.`;

// ── POST Handler ─────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // 1. Validate API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "GEMINI_API_KEY is not configured. Add it to your .env.local file.",
        },
        { status: 500 }
      );
    }

    // 2. Parse request body
    const body = await request.json();
    const { cleanedText } = body as { cleanedText: string };

    if (!cleanedText || cleanedText.trim().length === 0) {
      return NextResponse.json(
        { error: "No notebook content provided." },
        { status: 400 }
      );
    }

    // 3. Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-lite",
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    // 4. Generate the Context Recovery Package (streaming)
    const result = await model.generateContentStream(
      `Here is the raw notebook content to summarize:\n\n${cleanedText}`
    );

    // 5. Stream the response back to the client
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
          controller.close();
        } catch (streamError) {
          console.error("Stream error:", streamError);
          controller.error(streamError);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("Summarize API error:", error);
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
