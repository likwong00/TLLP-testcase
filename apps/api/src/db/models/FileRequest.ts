import mongoose, { Schema } from "mongoose";

export type FileRequestDocument = {
    passwordHash: string;
    shareId?: string;
    createdAt: Date;
    updatedAt: Date;
};

const FileRequestSchema = new Schema<FileRequestDocument>(
    {
        passwordHash: { type: String, required: true },
        shareId: { type: String, required: false },
    },
    {
        timestamps: true,
    },
);

export const FileRequestModel =
    mongoose.models.FileRequest ||
    mongoose.model<FileRequestDocument>("FileRequest", FileRequestSchema);
