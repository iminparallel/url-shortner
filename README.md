# url-shortner

URL Shortening and Analytics API Documentation
This API provides services for URL shortening, user authentication, and URL analytics. It also includes rate limiting for specific APIs to prevent abuse.

Base URL
bash
Copy
Edit
http://localhost:<PORT>/api
Authentication
The API uses Google OAuth for authentication. Users must be authenticated to access most of the API endpoints. Authentication can be done by visiting /auth/google and completing the login process.

Endpoints
POST /api/shorten
Description: Shortens a given URL and returns the shortened alias.
Authentication: Required (must be logged in)
Rate Limiting: 50 requests per hour per user.
Request Body:
json
Copy
Edit
{
"fullUrl": "https://example.com",
"topic": "category_name",
"alias": "customAlias"
}
fullUrl: The URL to be shortened.
topic: (Optional) A category or topic for the URL.
alias: (Optional) A custom alias for the shortened URL. If not provided, a random alias will be generated.
Response:
json
Copy
Edit
{
"message": "Shortened url <alias>"
}
If the alias already exists, a message indicating so will be returned.
GET /api/shorten/:shortUrl
Description: Redirects to the original URL for a given shortened URL alias.
Authentication: Required (must be logged in)
Request Params:
shortUrl: The shortened URL alias.
Response:
A 302 redirect to the original URL associated with the alias.
If the alias is not found, returns a 404 status.
GET /api/analytics/overall/
Description: Provides overall analytics for the URL shortener, including total clicks, unique users, clicks by date, and device/OS usage for the past 7 days.
Authentication: Required (must be logged in)
Response:
json
Copy
Edit
{
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
GET /api/analytics/topic/:topic
Description: Provides analytics for URLs in a specific category or topic for the past 7 days.
Authentication: Required (must be logged in)
Request Params:
topic: The category or topic to filter URLs by.
Response:
json
Copy
Edit
{
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
GET /api/analytics/:alias
Description: Provides analytics for a specific shortened URL alias (e.g., abc123).
Authentication: Required (must be logged in)
Request Params:
alias: The shortened URL alias for which to retrieve analytics.
Response:
json
Copy
Edit
{
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
POST /redirect
Description: Redirects a user to a shortened URL based on the provided short URL.
Authentication: Required (must be logged in)
Request Body:
json
Copy
Edit
{
"shortUrl": "alias"
}
shortUrl: The shortened URL alias.
Response: A 302 redirect to the original URL. If the shortUrl parameter is missing, a 400 error is returned.
GET /logout
Description: Logs out the user and destroys the session.
Authentication: N/A
Response: A message "Goodbye!" after successfully logging out.
Error Responses
400 Bad Request: Missing or invalid data (e.g., missing shortUrl in the body).
401 Unauthorized: User is not authenticated.
404 Not Found: URL alias not found in the database.
429 Too Many Requests: Rate limit exceeded (applies to the /api/shorten endpoint).
Rate Limiting
The /api/shorten endpoint has rate limiting applied, restricting users to 50 requests per hour based on their IP address or x-user-id header. If the rate limit is exceeded, users will receive a 429 Too Many Requests error with the message:

json
Copy
Edit
{
"message": "You have exceeded the 50 requests per hour limit!"
}
Technologies Used
Express: Web framework for handling API requests.
Passport.js: Authentication middleware.
MongoDB: Database for storing URL and log data.
Redis: Caching for URL redirection to improve performance.
Axios: Making HTTP requests for geolocation data.
Rate Limiting: To prevent abuse of the API.
This API allows users to shorten URLs, track analytics for each shortened URL, and offers detailed analytics across different time periods. It uses a simple and intuitive design, utilizing session management and authentication via Google OAuth.
