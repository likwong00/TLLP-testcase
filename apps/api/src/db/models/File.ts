import mongoose, { Schema } from "mongoose";

export type FileDocument = {
    requestId: string;
    originalName: string;
    mimeType: string;
    size: number;
    status: "pending" | "uploaded" | "failed";
    uploadToken?: string;
    storageKey?: string;
    createdAt: Date;
    updatedAt: Date;
};

const FileSchema = new Schema<FileDocument>(
    {
        requestId: { type: String, required: true, index: true },
        originalName: { type: String, required: true },
        mimeType: { type: String, required: true },
        size: { type: Number, required: true },
        status: {
            type: String,
            required: true,
            enum: ["pending", "uploaded", "failed"],
            default: "pending",
        },
        uploadToken: { type: String, required: false, index: true },
        storageKey: { type: String, required: false },
    },
    {
        timestamps: true,
    },
);

export const FileModel =
    mongoose.models.File || mongoose.model<FileDocument>("File", FileSchema);
