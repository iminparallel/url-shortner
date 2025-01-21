import { mongoose, Schema } from "mongoose";

const geoLocationSchema = new mongoose.Schema(
  {
    city: { type: String, default: null },
    region: { type: String, default: null },
    country: { type: String, default: null },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
  },
  { _id: false }
);

const logSchema = new mongoose.Schema(
  {
    shortUrl: {
      type: String,
      required: true,
    },
    user: {
      type: String,
      required: true,
    },
    ip: {
      type: String,
      required: true,
    },
    geoLocation: {
      type: geoLocationSchema,
      required: true,
    },
    os: {
      type: String,
      required: true,
    },
    device: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const log = mongoose.model("log", logSchema);

export default log;
