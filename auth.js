import passport from "passport";
import GoogleStrategy from "passport-google-oauth2";
import Creator from "./models/Creator.js";
import dotenv from "dotenv";
import connectDB from "./config/db.js";

dotenv.config();
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:5000/auth/google/callback",
      passReqToCallback: true,
    },
    async function (request, accessToken, refreshToken, profile, done) {
      try {
        await connectDB();
        let user = await Creator.findOne({ googleId: profile.id });
        if (user) {
          console.log("user is there");
          return done(null, user);
        } else {
          const newUser = {
            googleId: profile.id,
          };
          user = await Creator.create(newUser);
          console.log("creating new user");
          return done(null, user);
        }
      } catch (err) {
        console.error(err);
      }
    }
  )
);
passport.serializeUser(function (user, done) {
  done(null, user);
});
passport.deserializeUser(function (user, done) {
  done(null, user);
});
