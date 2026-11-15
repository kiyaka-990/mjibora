import { subscribe, recent, type Event } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function GET() {
  const encoder = new TextEncoder();
  let unsub: (() => void) | null = null;
  let keepAlive: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (e: Event) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
      recent().forEach(send);
      unsub = subscribe(send);
      keepAlive = setInterval(
        () => controller.enqueue(encoder.encode(": ping\n\n")),
        15000
      );
    },
    cancel() {
      // Client disconnected — release the subscription and the timer.
      unsub?.();
      if (keepAlive) clearInterval(keepAlive);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
