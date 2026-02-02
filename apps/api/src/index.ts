import { serve } from "@hono/node-server";
import { connectDatabase, stopDatabase } from "./db/connect";
import { createServer } from "./server";
import { PORT } from "./env";

const bootstrap = async () => {
    await connectDatabase();

    const app = createServer();
    serve({ fetch: app.fetch, port: PORT });

    // eslint-disable-next-line no-console
    console.log(`API running on http://localhost:${PORT}`);
};

const shutdown = async () => {
    await stopDatabase();
    process.exit(0);
};

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());

void bootstrap();
