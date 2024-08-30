const sendResponse = require("../Helper/Helper_one");
var dotenv = require("dotenv");
dotenv.config();

const authMiddleware = (req, res, next) => {
  // Check for the presence of API access key in headers
  const apiKey = req.headers["api-key"];
  console.log("matchup", apiKey === process.env.SECURE_KEY);
  if (apiKey !== process.env.SECURE_KEY) {
    return res
      .status(401)
      .send(sendResponse(false, null, "API access key is missing"));
  }
  next();
};

module.exports = authMiddleware;
