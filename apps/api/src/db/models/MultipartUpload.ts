import mongoose, { Schema } from "mongoose";

export type MultipartPart = {
    partNumber: number;
    size?: number;
    uploadToken: string;
    etag?: string;
    status: "pending" | "uploaded" | "failed";
};

export type MultipartUploadDocument = {
    fileId: mongoose.Types.ObjectId;
    uploadId: string;
    partSize: number;
    parts: MultipartPart[];
    status: "pending" | "uploading" | "completed" | "failed";
    createdAt: Date;
    updatedAt: Date;
};

const MultipartPartSchema = new Schema<MultipartPart>(
    {
        partNumber: { type: Number, required: true },
        size: { type: Number, required: false },
        uploadToken: { type: String, required: true },
        etag: { type: String, required: false },
        status: {
            type: String,
            required: true,
            enum: ["pending", "uploaded", "failed"],
            default: "pending",
        },
    },
    { _id: false },
);

const MultipartUploadSchema = new Schema<MultipartUploadDocument>(
    {
        fileId: { type: Schema.Types.ObjectId, ref: "File", required: true },
        uploadId: { type: String, required: true, index: true },
        partSize: { type: Number, required: true },
        parts: { type: [MultipartPartSchema], default: [] },
        status: {
            type: String,
            required: true,
            enum: ["pending", "uploading", "completed", "failed"],
            default: "pending",
        },
    },
    { timestamps: true },
);

export const MultipartUploadModel =
    mongoose.models.MultipartUpload ||
    mongoose.model<MultipartUploadDocument>(
        "MultipartUpload",
        MultipartUploadSchema,
    );
