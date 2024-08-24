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

app.post("/add-discount-code", async (req, res) => {
  try {
    const { price_rule_id, discount_code } = req.body;

    // Check if both price_rule_id and discount_code are provided
    if (!price_rule_id || !discount_code) {
      return res.status(400).json({
        message:
          "Validation Error: price_rule_id and discount_code are required",
      });
    }

    const discountCodeData = {
      discount_code: {
        code: discount_code, // The code for the discount (e.g., "SUMMERSALE")
      },
    };

    const discountCodesUrl = `https://${process.env.SHOP_NAME}.myshopify.com/admin/api/2024-07/price_rules/${price_rule_id}/discount_codes.json`;

    const response = await axios.post(discountCodesUrl, discountCodeData, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(
          `${process.env.API_KEY}:${process.env.API_PASSWORD}`
        ).toString("base64")}`,
      },
    });

    console.log("Discount code created:", response.data);
    res.status(201).json({ discount_code: response.data.discount_code });
  } catch (error) {
    console.error("Error creating discount code:", error.message);
    res.status(500).json({ message: "Failed to create discount code" });
  }
});

app.post("/add-price-rule", async (req, res) => {
  try {
    const { price_rule } = req.body;

    // Define required fields
    const requiredFields = [
      "title",
      "value_type",
      "value",
      "customer_selection",
      "target_type",
      "target_selection",
      "allocation_method",
      "starts_at",
    ];

    // Check for missing fields
    const missingFields = requiredFields.filter((field) => !price_rule[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: "Validation Error: Missing required fields",
        missingFields: missingFields,
      });
    }

    // Construct the price rule data with optional fields
    const priceRuleData = {
      price_rule: {
        title: price_rule.title,
        value_type: price_rule.value_type,
        value: price_rule.value,
        customer_selection: price_rule.customer_selection,
        target_type: price_rule.target_type,
        target_selection: price_rule.target_selection,
        allocation_method: price_rule.allocation_method,
        starts_at: price_rule.starts_at,
        ends_at: price_rule.ends_at || undefined, // optional
        prerequisite_collection_ids:
          price_rule.prerequisite_collection_ids || [], // optional
        entitled_product_ids: price_rule.entitled_product_ids || [], // optional
        prerequisite_to_entitlement_quantity_ratio:
          price_rule.prerequisite_to_entitlement_quantity_ratio || undefined, // optional
        allocation_limit: price_rule.allocation_limit || undefined, // optional
      },
    };

    const priceRulesUrl = `https://${process.env.SHOP_NAME}.myshopify.com/admin/api/2024-07/price_rules.json`;

    const response = await axios.post(priceRulesUrl, priceRuleData, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(
          `${process.env.API_KEY}:${process.env.API_PASSWORD}`
        ).toString("base64")}`,
      },
    });

    console.log("Price rule created:", response.data);
    res.status(201).json({ price_rule: response.data.price_rule });
  } catch (error) {
    console.error("Error creating price rule:", error.message);
    res.status(500).json({ message: "Failed to create price rule" });
  }
});

app.get("/get-discounts", async (req, res) => {
  try {
    //shop name i.e store-for-customer-account-test
    // const { price_rules } = req.body;
    let allDiscounts = [];
    const priceRulesUrl = `https://${process.env.SHOP_NAME}.myshopify.com/admin/api/2024-07/price_rules.json`;
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
      const apiUrl = `https://${process.env.SHOP_NAME}.myshopify.com/admin/api/2024-07/price_rules/${rule.id}/discount_codes.json`;
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
