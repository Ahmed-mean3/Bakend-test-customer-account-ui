const express = require("express");
const cors = require("cors");
const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server Started");
});

app.post("/get-discounts", async (req, res) => {
  try {
    const { price_rules } = req.body;
    let allDiscounts = [];
    const priceRulesUrl = `https://store-for-customer-account-test.myshopify.com/admin/api/2024-07/price_rules.json`;
    const priceRulesResponse = await axios.get(priceRulesUrl, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(
          `${process.env.API_KEY}:${process.env.API_PASSWORD}`
        ).toString("base64")}`,
      },
    });
    console.log("all price rules retreival", priceRulesResponse.data);
    const priceRules = priceRulesResponse.data.price_rules;
    for (const rule of priceRules) {
      const apiUrl = `https://store-for-customer-account-test.myshopify.com/admin/api/2024-07/price_rules/${rule.id}/discount_codes.json`;
      const response = await axios.get(apiUrl, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${Buffer.from(
            `${process.env.API_KEY}:${process.env.API_PASSWORD}`
          ).toString("base64")}`,
        },
      });
      console.log("data retreival", response.data);
      allDiscounts = [...allDiscounts, ...response.data.discount_codes];
    }
    res.status(200).json({ discounts: allDiscounts });
  } catch (error) {
    console.error("Error fetching discounts:", error.message);
    res.status(500).json({ message: "Failed to fetch discounts data" });
  }
});

app.listen(PORT, () => {
  console.log(`Testing shop Middleware server running on port ${PORT}`);
});
