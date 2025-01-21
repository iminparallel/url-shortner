import { mongoose, Schema } from "mongoose";

const creatorSchema = new mongoose.Schema(
  {
    googleId: {
      type: String,
      required: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

const Creator = mongoose.model("Creator", creatorSchema);

export default Creator;
