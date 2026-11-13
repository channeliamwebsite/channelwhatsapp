import { unstable_rethrow } from "next/navigation";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

/** An error that is safe to show to the client. */
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Centralised error → JSON response mapping for route handlers. */
export function toErrorResponse(error: unknown) {
  unstable_rethrow(error); // let Next.js handle its own control-flow signals
  if (error instanceof ApiError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof ZodError) {
    const issue = error.issues[0];
    return NextResponse.json({ error: `Invalid ${issue?.path.join(".") || "request"}: ${issue?.message ?? "bad input"}` }, { status: 400 });
  }
  console.error("[api] unexpected error", error);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}
