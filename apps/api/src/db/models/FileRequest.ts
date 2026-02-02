import mongoose, { Schema } from "mongoose";

export type FileRequestDocument = {
    passwordHash: string;
    createdAt: Date;
    updatedAt: Date;
};

const FileRequestSchema = new Schema<FileRequestDocument>(
    {
        passwordHash: { type: String, required: true },
    },
    {
        timestamps: true,
    },
);

export const FileRequestModel =
    mongoose.models.FileRequest ||
    mongoose.model<FileRequestDocument>("FileRequest", FileRequestSchema);
