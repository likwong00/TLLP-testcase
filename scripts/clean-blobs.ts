import { promises as fs } from "node:fs";
import path from "node:path";

const BLOB_DIR = path.resolve(process.cwd(), "apps", "api", "data", "blobs");

const safeRemoveAll = async (dir: string) => {
    const normalized = path.resolve(dir);
    if (!normalized.endsWith(path.join("apps", "api", "data", "blobs"))) {
        throw new Error(`Refusing to delete unexpected path: ${normalized}`);
    }

    await fs.rm(normalized, { recursive: true, force: true });
    await fs.mkdir(normalized, { recursive: true });
};

const main = async () => {
    await safeRemoveAll(BLOB_DIR);
    console.log(`Cleared blob storage at ${BLOB_DIR}`);
};

main().catch((error) => {
    console.error("Failed to clean blob storage", error);
    process.exit(1);
});
