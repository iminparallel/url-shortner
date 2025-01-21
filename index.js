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

dotenv.config();
const app = express();
app.use(express.json());
app.set("view engine", "ejs");

app.use(express.urlencoded({ extended: true }));
app.use(useragent.express());

function isLoggedIn(req, res, next) {
  req.user ? next() : res.sendStatus(401);
}

app.use(
  session({
    secret: process.env.EXPRESS_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);
app.use(passport.initialize());
app.use(passport.session());

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

app.post("/api/shorten", isLoggedIn, async (req, res) => {
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
  await connectDB();
  const url = await links.findOne({ shortUrl: req.params.shortUrl });
  if (!url) {
    return res.sendStatus(404);
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
    console.log(ip, os, device);
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
      res.redirect(url.originalUrl);
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
    clicksByDate: clicksByDay,
    urls: urlDict,
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
      clicksByDate: clicksByDay,
      osType: osDict,
      deviceType: deviceDict,
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
      clicksByDate: clicksByDay,
      osType: osDict,
      deviceType: deviceDict,
    };
    res.send(`${req.params.alias} : ${JSON.stringify(returnObject)}`);
  } catch (err) {
    res.send(`error: ${err}`);
  }
});

app.get("/protected", isLoggedIn, async (req, res) => {
  await connectDB();
  const urls = (await links.find()) || [];
  res.render("index", { urls: urls });
});
app.get("/logout", (req, res) => {
  req.logout();
  req.session.destroy();
  res.send("Goodbye!");
});

app.listen(5000, () => console.log("listening on port: 5000"));
