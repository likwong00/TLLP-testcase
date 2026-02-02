import { createWriteStream, promises as fs } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import path from "node:path";

const baseDir = path.resolve(process.cwd(), "data", "blobs");

const ensureDir = async () => {
    await fs.mkdir(baseDir, { recursive: true });
};

export const getBlobPath = (key: string) => path.join(baseDir, `${key}.bin`);

export const saveBlobStream = async (
    key: string,
    body: ReadableStream | null,
) => {
    if (!body) {
        throw new Error("Missing upload body");
    }

    await ensureDir();
    const filePath = getBlobPath(key);
    const nodeStream = Readable.fromWeb(body as unknown as ReadableStream);
    await pipeline(nodeStream, createWriteStream(filePath));
    return filePath;
};
