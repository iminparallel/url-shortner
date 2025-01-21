import { mongoose, Schema } from "mongoose";

const conversionSchema = new mongoose.Schema(
  {
    originalUrl: {
      type: String,
      required: true,
    },
    shortUrl: {
      type: String,
      required: true,
      unique: true,
    },
    creator: {
      type: String,
      required: true,
    },
    topic: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const links = mongoose.model("links", conversionSchema);

export default links;
