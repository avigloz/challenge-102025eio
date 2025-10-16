import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  userId: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  userId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const User = mongoose.model<IUser>('User', UserSchema);
