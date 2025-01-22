import request from "supertest";
import app from "./index.js"; // Adjust the path to your main Express app file
import dotenv from "dotenv";

dotenv.config();

describe("API Endpoints", () => {
  let authenticatedCookie;

  it("should authenticate with Google and redirect to protected route", async () => {
    const response = await request(app).get("/auth/google");
    expect(response.status).toBe(302);
    expect(response.headers.location).toMatch(/google/);
  });

  it("should login and get a session cookie", async () => {
    const loginResponse = await request(app).post("/auth/google/callback");
    expect(loginResponse.status);
    authenticatedCookie = loginResponse.headers["set-cookie"];
  });

  it("should return home route", async () => {
    const response = await request(app).get("/");
    expect(response.status).toBe(200);
    expect(response.text).toContain("Authenticate with Google");
  });

  it("should logout the user and destroy the session", async () => {
    const response = await request(app)
      .get("/logout")
      .set("Cookie", authenticatedCookie);
    expect(response.status).toBe(200);
    expect(response.text).toContain("Goodbye!");
  });
});
