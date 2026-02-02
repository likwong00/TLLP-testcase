import mongoose, { Schema } from "mongoose";

export type AuthSessionDocument = {
    token: string;
    scope: "request";
    scopeId: string;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
};

const AuthSessionSchema = new Schema<AuthSessionDocument>(
    {
        token: { type: String, required: true, index: true, unique: true },
        scope: { type: String, required: true, enum: ["request"] },
        scopeId: { type: String, required: true, index: true },
        expiresAt: { type: Date, required: true, index: true, expires: 0 },
    },
    { timestamps: true },
);

export const AuthSessionModel =
    mongoose.models.AuthSession ||
    mongoose.model<AuthSessionDocument>("AuthSession", AuthSessionSchema);
