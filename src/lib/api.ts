import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ServiceError } from "./errors";
import { firstIssue } from "./validation";

/** Wrap a route handler: converts known errors to friendly JSON, hides unknown ones. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof ServiceError) return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
      if (e instanceof ZodError) return NextResponse.json({ error: firstIssue(e), code: "BAD_REQUEST" }, { status: 400 });
      if (e instanceof SyntaxError) return NextResponse.json({ error: "Invalid request body.", code: "BAD_REQUEST" }, { status: 400 });
      console.error("[api] unexpected error", e);
      return NextResponse.json({ error: "Something went wrong on our side. Please try again.", code: "INTERNAL" }, { status: 500 });
    }
  };
}
