import express from "express";
import session from "express-session";
import passport from "passport";
import "./auth.js";
import dotenv from "dotenv";
import shortId from "shortid";
import links from "./models/Links.js";
import connectDB from "./config/db.js";
import log from "./models/Log.js";
import useragent from "express-useragent";
import axios from "axios";
import rateLimit from "express-rate-limit";
import redis from "@redis/client";

dotenv.config();
const client = redis.createClient({
  url:
    "redis://" +
    process.env.REDIS_USER +
    ":" +
    process.env.REDIS_PASSWORD +
    "@" +
    process.env.REDIS_ENDPOINT +
    ":" +
    process.env.REDIS_PORT,
});
client.on("connect", () => {
  console.log("connected");
});
client.connect();

const app = express();
app.use(express.json());
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(useragent.express());
app.use(
  session({
    secret: process.env.EXPRESS_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);
app.use(passport.initialize());
app.use(passport.session());

const specificApiLimiter = rateLimit({
  keyGenerator: (req) => req.headers["x-user-id"] || req.ip,
  windowMs: 60 * 60 * 1000,
  max: 50,
  message: "You have exceeded the 3 requests per hour limit!",
  headers: true,
});

function isLoggedIn(req, res, next) {
  req.user ? next() : res.sendStatus(401);
}

app.get("/", (req, res) => {
  res.send('<a href="/auth/google">Authenticate with Google</a>');
});
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["email", "profile"] })
);
app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    successRedirect: "/protected",
    failureRedirect: "/auth/google/failure",
  })
);
app.get("/auth/google/failure", (req, res) => {
  res.send("Failed to authenticate..");
});
app.post("/redirect", isLoggedIn, (req, res) => {
  const shortUrl = req.body.shortUrl;

  if (!shortUrl) {
    return res.status(400).send("shortUrl is required.");
  }

  res.redirect(`/api/shorten/${encodeURIComponent(shortUrl)}`);
});
app.get("/protected", isLoggedIn, async (req, res) => {
  await connectDB();
  const urls = (await links.find()) || [];
  res.render("index", { urls: urls.reverse() });
});
app.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    req.session.destroy((err) => {
      if (err) {
        return next(err);
      }
      res.send("Goodbye!");
    });
  });
});

app.post("/api/shorten", isLoggedIn, specificApiLimiter, async (req, res) => {
  const fullUrl = req.body.fullUrl;
  let category = req.body.topic;
  let alias = req.body.alias;
  if (!alias) {
    alias = shortId.generate();
  }
  if (!category) {
    category = "";
  }
  await connectDB();
  let url = await links.findOne({ shortUrl: alias });
  if (url) {
    res.send(`alias ${alias} already exists`);
  }
  try {
    await links.create({
      originalUrl: fullUrl,
      shortUrl: alias,
      creator: req.user.googleId,
      topic: category,
    });
    res.send(`Shortened url ${alias}`);
  } catch (err) {
    console.log(err);
    res.send(`error: ${JSON.stringify(err)}`);
  }
});

app.get("/api/shorten/:shortUrl", isLoggedIn, async (req, res) => {
  if (!req.params.shortUrl) {
    return res.status(400).json({ error: "shortUrl required." });
  }
  const data = await client.get(req.params.shortUrl.toString());
  await connectDB();

  let redirectUrl = "";
  if (data) {
    redirectUrl = data.toString();
  } else {
    const url = await links.findOne({ shortUrl: req.params.shortUrl });
    if (!url) {
      return res.sendStatus(404);
    }
    redirectUrl = url.originalUrl;
  }

  try {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const os = req.useragent.os;
    const device = req.useragent.platform;

    let geoLocation = {
      city: null,
      region: null,
      country: null,
      latitude: null,
      longitude: null,
    };
    try {
      const response = await axios.get(`https://ipapi.co/${ip}/json/`);
      geoLocation = {
        city: response.data.city || null,
        region: response.data.region || null,
        country: response.data.country_name || null,
        latitude: response.data.latitude || null,
        longitude: response.data.longitude || null,
      };
    } catch (geoError) {
      console.error("Geolocation API error:", geoError.message);
    }
    try {
      await log.create({
        shortUrl: req.params.shortUrl,
        user: req.user.googleId,
        ip: ip,
        geoLocation: geoLocation,
        os: os,
        device: device,
      });
      await client.set(req.params.shortUrl.toString(), redirectUrl);
      res.redirect(redirectUrl);
    } catch (err) {
      res.send(`error: ${JSON.stringify(err)}`);
    }
  } catch (err) {
    res.send(`error: ${JSON.stringify(err)}`);
  }
});

app.get("/api/analytics/topic/:topic", isLoggedIn, async (req, res) => {
  const category = req.params.topic;
  await connectDB();
  const time = new Date();
  const timeLastWeek = new Date(time - 7 * 24 * 60 * 60 * 1000);
  const categoryLinks = await links.find({ topic: category }).exec();
  const topicWiseStats = await Promise.all(
    categoryLinks.map(async (newLog) => {
      const record = await log.findOne({
        shortUrl: newLog.shortUrl,
      });
      return {
        ...newLog._doc,
        user: record ? record.user : "N/A",
        ip: record ? record.ip : "N/A",
        geoLocation: record ? record.geoLocation : "N/A",
        os: record ? record.os : "N/A",
        device: record ? record.device : "N/A",
        time: record ? record.createdAt : null,
      };
    })
  );
  let totalClicks = 0;
  let uniqueUsers = new Set();
  let clicksByDay = {};
  let urlDict = {};
  for (let i = 0; i < topicWiseStats.length; i++) {
    if (timeLastWeek <= topicWiseStats[i].createdAt <= time) {
      totalClicks++;
      uniqueUsers.add(topicWiseStats[i].user);
      const uniqueDate = topicWiseStats[i].createdAt
        .toISOString()
        .split("T")[0];
      const shortenedUrl = topicWiseStats[i].shortUrl;
      if (uniqueDate in clicksByDay) {
        clicksByDay[uniqueDate]++;
      } else {
        clicksByDay[uniqueDate] = 1;
      }
      if (shortenedUrl in urlDict) {
        urlDict[shortenedUrl].totalCLicks++;
        urlDict[shortenedUrl].uniqueUsers.add(topicWiseStats[i].user);
      } else {
        urlDict[shortenedUrl] = {};
        urlDict[shortenedUrl].totalClicks = 1;
        urlDict[shortenedUrl].uniqueUsers = new Set([topicWiseStats[i].user]);
      }
    }
  }
  for (const [key, value] of Object.entries(urlDict)) {
    value.uniqueUsers = value.uniqueUsers.size;
  }
  const returnObject = {
    totalClicks: totalClicks,
    uniqueUsers: uniqueUsers.size,
    clicksByDate: Object.getOwnPropertyNames(clicksByDay).map((key) => ({
      day: key,
      clicks: clicksByDay[key],
    })),
    urls: Object.getOwnPropertyNames(urlDict).map((key) => ({
      shortUrl: key,
      stats: urlDict[key],
    })),
  };
  res.send(`${category} : ${JSON.stringify(returnObject)}`);
});

app.get("/api/analytics/overall/", isLoggedIn, async (req, res) => {
  try {
    await connectDB();
    const time = new Date();
    const timeLastWeek = new Date(time - 7 * 24 * 60 * 60 * 1000);
    const redirectEvents = (await log.find()) || [];
    let totalClicks = 0;
    let uniqueUsers = new Set();
    let clicksByDay = {};
    let osDict = {};
    let deviceDict = {};
    let totalUrls = new Set();

    for (let i = 0; i < redirectEvents.length; i++) {
      if (timeLastWeek <= redirectEvents[i].createdAt <= time) {
        totalClicks++;
        uniqueUsers.add(redirectEvents[i].user);
        totalUrls.add(redirectEvents[i].shortUrl);
        const uniqueDate = redirectEvents[i].createdAt
          .toISOString()
          .split("T")[0];
        const os = redirectEvents[i].os;
        const device = redirectEvents[i].os;
        if (uniqueDate in clicksByDay) {
          clicksByDay[uniqueDate]++;
        } else {
          clicksByDay[uniqueDate] = 1;
        }
        if (os in osDict) {
          osDict[os]++;
        } else {
          osDict[os] = 1;
        }
        if (device in deviceDict) {
          deviceDict[device]++;
        } else {
          deviceDict[device] = 1;
        }
      }
    }
    const returnObject = {
      totalUrls: totalUrls.size,
      totalClicks: totalClicks,
      uniqueUsers: uniqueUsers.size,
      clicksByDate: Object.getOwnPropertyNames(clicksByDay).map((key) => ({
        day: key,
        clicks: clicksByDay[key],
      })),
      osType: Object.getOwnPropertyNames(osDict).map((key) => ({
        os: key,
        clicks: osDict[key],
      })),
      deviceType: Object.getOwnPropertyNames(deviceDict).map((key) => ({
        device: key,
        clicks: deviceDict[key],
      })),
    };
    res.send(`overall : ${JSON.stringify(returnObject)}`);
  } catch (err) {
    res.send(`error: ${err}`);
  }
});

app.get("/api/analytics/:alias", isLoggedIn, async (req, res) => {
  try {
    await connectDB();
    const time = new Date();
    const timeLastWeek = new Date(time - 7 * 24 * 60 * 60 * 1000);
    const redirectEvents =
      (await log.find({ shortUrl: req.params.alias })) || [];
    let totalClicks = 0;
    let uniqueUsers = new Set();
    let clicksByDay = {};
    let osDict = {};
    let deviceDict = {};
    console.log("here");
    for (let i = 0; i < redirectEvents.length; i++) {
      if (timeLastWeek <= redirectEvents[i].createdAt <= time) {
        totalClicks++;
        uniqueUsers.add(redirectEvents[i].user);
        const uniqueDate = redirectEvents[i].createdAt
          .toISOString()
          .split("T")[0];
        const os = redirectEvents[i].os;
        const device = redirectEvents[i].os;
        if (uniqueDate in clicksByDay) {
          clicksByDay[uniqueDate]++;
        } else {
          clicksByDay[uniqueDate] = 1;
        }
        if (os in osDict) {
          osDict[os]++;
        } else {
          osDict[os] = 1;
        }
        if (device in deviceDict) {
          deviceDict[device]++;
        } else {
          deviceDict[device] = 1;
        }
      }
    }
    const returnObject = {
      totalClicks: totalClicks,
      uniqueUsers: uniqueUsers.size,
      clicksByDate: Object.getOwnPropertyNames(clicksByDay).map((key) => ({
        day: key,
        clicks: clicksByDay[key],
      })),
      osType: Object.getOwnPropertyNames(osDict).map((key) => ({
        os: key,
        clicks: osDict[key],
      })),
      deviceType: Object.getOwnPropertyNames(deviceDict).map((key) => ({
        device: key,
        clicks: deviceDict[key],
      })),
    };
    res.send(`${req.params.alias} : ${JSON.stringify(returnObject)}`);
  } catch (err) {
    res.send(`error: ${err}`);
  }
});

app.listen(process.env.PORT, () =>
  console.log(`listening on port: ${process.env.PORT}`)
);
