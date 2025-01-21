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

const redirectSchema = new mongoose.Schema(
  {
    shortUrl: {
      type: String,
      required: true,
      unique: true,
    },
    user: {
      type: String,
      required: true,
      unique: true,
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

const Redirect = mongoose.model("Redirect", redirectSchema);

export default Redirect;
