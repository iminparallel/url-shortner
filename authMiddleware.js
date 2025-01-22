jest.mock("./authMiddleware", () => (req, res, next) => {
  req.user = { id: "test-user-id" }; // Mock authenticated user
  next();
});
