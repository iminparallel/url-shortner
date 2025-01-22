# url-shortner

# API Documentation

This API is a URL shortening service with analytics and user tracking features.

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
