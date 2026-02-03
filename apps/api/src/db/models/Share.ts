import mongoose, { Schema } from "mongoose";

export type ShareDocument = {
    passwordHash: string;
    fileIds: mongoose.Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
};

const ShareSchema = new Schema<ShareDocument>(
    {
        passwordHash: { type: String, required: true },
        fileIds: [{ type: Schema.Types.ObjectId, ref: "File", required: true }],
    },
    {
        timestamps: true,
    },
);

export const ShareModel =
    mongoose.models.Share ||
    mongoose.model<ShareDocument>("Share", ShareSchema);
