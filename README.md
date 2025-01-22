# url-shortner

### Live Location

- https://url-shortner-production-d894.up.railway.app/

### Run this project

- clone the repor
- populate the .env according to example.env
- install packages
  `npm i`
- run the project
  `npm start`
- Change the index.js like this
  '
  /\*
  app.listen(process.env.PORT, () =>
  console.log(`listening on port: ${process.env.PORT}`)
  );\*/

export default app;' and run `npm test` to run tests

- revert back the index.js to run the server

## Run From Docker - colima

- `colima start`
- `docker build -t url-shortner .`
- `docker run -p 5000:5000 url-shortner`

## Implemented Features

- Google oAuth
- Redirect Service
- Analytics Apis
- Redis cache
- Mongo Database

# API Documentation

This API is a URL shortening service with analytics and user tracking features.

## Base URL

`http://localhost:<PORT>/api`

## Authentication

### Google OAuth Authentication

- **Endpoint**: `/auth/google`
- **Method**: `GET`
- **Description**: Initiates the Google OAuth authentication process.

- **Endpoint**: `/auth/google/callback`
- **Method**: `GET`
- **Description**: Handles the callback from Google after authentication. On success, redirects to `/protected`, on failure redirects to `/auth/google/failure`.

- **Endpoint**: `/auth/google/failure`
- **Method**: `GET`
- **Description**: Displays a failure message if Google authentication fails.

## User Routes

### Logout

- **Endpoint**: `/logout`
- **Method**: `GET`
- **Description**: Logs the user out and destroys the session.

## URL Shortening

### Shorten URL

- **Endpoint**: `/api/shorten`
- **Method**: `POST`
- **Request Body**:
- **Rate Limited**

```{
  "fullUrl": "https://example.com",
  "topic": "category_name",
  "alias": "customAlias"
}
```

- **Authentication Required**: Yes
- **Rate Limiting**: 50 requests per hour
- **Body Parameters**:
  - `fullUrl`: The full URL to be shortened.
  - `topic`: (Optional) Category or topic associated with the URL.
  - `alias`: (Optional) Custom alias for the shortened URL. If not provided, a random alias will be generated.
- **Description**: Creates a shortened version of the provided URL. If the alias already exists, an error is returned.

### Redirect to Original URL

- **Endpoint**: `/api/shorten/:shortUrl`
- **Method**: `GET`
- **Authentication Required**: Yes
- **Description**: Redirects the user to the original URL associated with the shortened URL. Also logs analytics such as the user's IP, operating system, device, and geolocation.

```{
  "message": "Shortened url <alias>"
}
```

## Analytics

### Analytics by Topic

- **Endpoint**: `/api/analytics/topic/:topic`
- **Method**: `GET`
- **Authentication Required**: Yes
- **Description**: Provides analytics for shortened URLs under a specific topic. Returns statistics such as:
  - Total number of clicks
  - Unique users
  - Clicks per day
  - Statistics for each URL under the topic

```{
  "totalClicks": 150,
  "uniqueUsers": 30,
  "clicksByDate": [
    {
      "day": "2025-01-15",
      "clicks": 10
    },
    ...
  ],
  "urls": [
    {
      "shortUrl": "abc123",
      "stats": {
        "totalClicks": 50,
        "uniqueUsers": 25
      }
    },
    ...
  ]
}
```

### Overall Analytics

- **Endpoint**: `/api/analytics/overall/`
- **Method**: `GET`
- **Authentication Required**: Yes
- **Description**: Provides overall analytics, including:
  - Total number of URLs created
  - Total number of clicks
  - Unique users
  - Clicks per day
  - Operating system distribution
  - Device type distribution

```{
  "totalUrls": 10,
  "totalClicks": 200,
  "uniqueUsers": 50,
  "clicksByDate": [
    {
      "day": "2025-01-15",
      "clicks": 15
    },
    ...
  ],
  "osType": [
    {
      "os": "Windows",
      "clicks": 100
    },
    ...
  ],
  "deviceType": [
    {
      "device": "Desktop",
      "clicks": 150
    },
    ...
  ]
}
```

### Analytics for a Specific Alias

- **Endpoint**: `/api/analytics/:alias`
- **Method**: `GET`
- **Authentication Required**: Yes
- **Description**: Provides analytics for a specific shortened URL alias, including:
  - Total number of clicks
  - Unique users
  - Clicks per day
  - Operating system distribution
  - Device type distribution

```{
  "totalClicks": 50,
  "uniqueUsers": 20,
  "clicksByDate": [
    {
      "day": "2025-01-15",
      "clicks": 10
    },
    ...
  ],
  "osType": [
    {
      "os": "Windows",
      "clicks": 30
    },
    ...
  ],
  "deviceType": [
    {
      "device": "Desktop",
      "clicks": 40
    },
    ...
  ]
}
```
