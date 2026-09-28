import type { ReactNode } from "react";

export function MessageHoverMetadata({
  side,
  pinned = false,
  revealed = false,
  children,
}: {
  side: "start" | "end";
  pinned?: boolean;
  /** Phone: the message was tapped, so its actions show above the bubble. */
  revealed?: boolean;
  children: ReactNode;
}) {
  // Touch exposes More; hover-capable pointers reveal the full rail on demand.
  // At phone width the rail leaves the bubble's side (where it cost message width)
  // for the space above it, and stays out of sight until the message is tapped.
  const reveal =
    pinned || revealed
      ? "pointer-events-auto opacity-100"
      : "pointer-events-auto opacity-100 max-md:pointer-events-none max-md:opacity-0 max-md:focus-within:pointer-events-auto max-md:focus-within:opacity-100 [@media(hover:hover)_and_(pointer:fine)]:pointer-events-none [@media(hover:hover)_and_(pointer:fine)]:opacity-0 [@media(hover:hover)_and_(pointer:fine)]:group-hover/message:pointer-events-auto [@media(hover:hover)_and_(pointer:fine)]:group-hover/message:opacity-100 [@media(hover:hover)_and_(pointer:fine)]:focus-within:pointer-events-auto [@media(hover:hover)_and_(pointer:fine)]:focus-within:opacity-100";

  return (
    <div
      data-testid="message-hover-rail"
      className={`absolute top-1/2 z-10 flex -translate-y-1/2 items-center transition-opacity max-md:top-auto max-md:bottom-full max-md:mb-1.5 max-md:translate-y-0 max-md:rounded-full max-md:border max-md:border-border max-md:bg-popover max-md:px-1 ${reveal} ${
        side === "end"
          ? "start-full ms-1 max-md:start-0 max-md:ms-0"
          : "end-full me-1 max-md:end-0 max-md:me-0"
      }`}
    >
      {children}
    </div>
  );
}
