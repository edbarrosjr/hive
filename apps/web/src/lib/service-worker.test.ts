import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

const ORIGIN = "https://hive.example.test";
const source = readFileSync(fileURLToPath(new URL("../../public/sw.js", import.meta.url)), "utf8");

interface FakeRequest {
  url: string;
  method: string;
  mode: "navigate" | "cors" | "no-cors";
}

interface FetchEvent {
  request: FakeRequest;
  respondWith: (response: Promise<Response>) => void;
}

function request(path: string, init: Partial<FakeRequest> = {}): FakeRequest {
  return { url: new URL(path, ORIGIN).href, method: "GET", mode: "cors", ...init };
}

function loadWorker(network: (request: FakeRequest) => Promise<Response>) {
  const listeners = new Map<string, (event: unknown) => void>();
  const store = new Map<string, Response>();
  const deleted: string[] = [];
  const fetched: string[] = [];
  const key = (target: FakeRequest | string) => (typeof target === "string" ? target : target.url);
  const cache = {
    add: async (target: string) => {
      const response = await network(request(target, { mode: "navigate" }));
      store.set(new URL(target, ORIGIN).href, response);
    },
    match: async (target: FakeRequest | string) =>
      store.get(new URL(key(target), ORIGIN).href)?.clone(),
    put: async (target: FakeRequest | string, response: Response) => {
      store.set(new URL(key(target), ORIGIN).href, response);
    },
  };
  const context = {
    self: {
      location: { origin: ORIGIN },
      addEventListener: (type: string, listener: (event: unknown) => void) =>
        listeners.set(type, listener),
      skipWaiting: async () => undefined,
      clients: { claim: async () => undefined },
    },
    caches: {
      open: async () => cache,
      keys: async () => ["hive-shell-v0", "hive-shell-v1"],
      delete: async (name: string) => {
        deleted.push(name);
        return true;
      },
    },
    fetch: async (target: FakeRequest) => {
      fetched.push(new URL(target.url).pathname);
      return network(target);
    },
    URL,
    Response,
    Promise,
  };
  vm.runInNewContext(source, context);

  async function dispatchFetch(target: FakeRequest): Promise<Response | undefined> {
    let handled: Promise<Response> | undefined;
    const event: FetchEvent = {
      request: target,
      respondWith: (response) => {
        handled = response;
      },
    };
    listeners.get("fetch")?.(event);
    return handled;
  }

  async function dispatchLifecycle(type: "install" | "activate") {
    let pending: Promise<unknown> | undefined;
    listeners.get(type)?.({ waitUntil: (promise: Promise<unknown>) => (pending = promise) });
    await pending;
  }

  return { dispatchFetch, dispatchLifecycle, fetched, deleted, store };
}

function html(body: string) {
  return new Response(body, { status: 200, headers: { "content-type": "text/html" } });
}

describe("service worker", () => {
  it("never intercepts backend, realtime, or cross-origin requests", async () => {
    const worker = loadWorker(async () => html("shell"));
    for (const target of [
      request("/api/auth/get-session"),
      request("/rpc/bots/list"),
      request("/novnc/screen"),
      request("/health"),
      request("/.well-known/rakazo-desktop-stack"),
      request("/sw.js"),
      request("/assets/app.js", { method: "POST" }),
      { url: "https://other.example.test/assets/app.js", method: "GET", mode: "cors" as const },
    ]) {
      expect(await worker.dispatchFetch(target), target.url).toBeUndefined();
    }
    expect(worker.fetched).toEqual([]);
  });

  it("serves navigations from the network and falls back to the cached shell offline", async () => {
    let online = true;
    const worker = loadWorker(async () => {
      if (!online) throw new TypeError("Failed to fetch");
      return html("fresh shell");
    });
    const first = await worker.dispatchFetch(request("/app/bot-1", { mode: "navigate" }));
    expect(await first?.text()).toBe("fresh shell");

    online = false;
    const offline = await worker.dispatchFetch(request("/app/bot-2", { mode: "navigate" }));
    expect(await offline?.text()).toBe("fresh shell");
    expect(worker.fetched).toEqual(["/app/bot-1", "/app/bot-2"]);
  });

  it("serves hashed build assets from the cache after the first load", async () => {
    const worker = loadWorker(
      async () =>
        new Response("console.log(1)", {
          status: 200,
          headers: { "content-type": "text/javascript" },
        }),
    );
    const asset = request("/assets/index-abc123.js");
    expect(await (await worker.dispatchFetch(asset))?.text()).toBe("console.log(1)");
    expect(await (await worker.dispatchFetch(asset))?.text()).toBe("console.log(1)");
    expect(worker.fetched).toEqual(["/assets/index-abc123.js"]);
  });

  it("does not cache failed responses", async () => {
    const worker = loadWorker(async () => new Response("nope", { status: 500 }));
    await worker.dispatchFetch(request("/assets/index-abc123.js"));
    await worker.dispatchFetch(request("/app", { mode: "navigate" }));
    expect(worker.store.size).toBe(0);
  });

  it("precaches the shell on install and drops stale caches on activate", async () => {
    const worker = loadWorker(async () => html("shell"));
    await worker.dispatchLifecycle("install");
    expect(worker.store.has(`${ORIGIN}/`)).toBe(true);
    await worker.dispatchLifecycle("activate");
    expect(worker.deleted).toEqual(["hive-shell-v0"]);
  });
});
