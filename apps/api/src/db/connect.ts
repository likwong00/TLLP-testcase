import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let memoryServer: MongoMemoryServer | null = null;

export const connectDatabase = async () => {
    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    if (!memoryServer) {
        memoryServer = await MongoMemoryServer.create();
    }

    const uri = memoryServer.getUri();
    await mongoose.connect(uri, {
        dbName: "file-service",
    });

    return mongoose.connection;
};

export const stopDatabase = async () => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }

    if (memoryServer) {
        await memoryServer.stop();
        memoryServer = null;
    }
};
