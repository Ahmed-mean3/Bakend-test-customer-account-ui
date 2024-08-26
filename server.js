const express = require("express");
const cors = require("cors");
const axios = require("axios");
const dotenv = require("dotenv");
const authMiddleware = require("./middleware/middleware_one");
const sendResponse = require("./Helper/Helper_one");
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const route = express.Router();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server Started for test cutomer account ui backend.");
});

route.use(authMiddleware);

app.post("/add-discount-code", authMiddleware, async (req, res) => {
  try {
    const getShopName = req.headers["shop-name"];
    const getApiKey = req.headers["shopify-api-key"];
    const getApiToken = req.headers["shopify-api-token"];
    const { discount_type, price_rule, discount_code } = req.body;
    if (!getShopName) {
      return res
        .status(400)
        .send(sendResponse(false, null, "Missing shopify Store/Shop name"));
    }
    if (!getApiKey) {
      return res
        .status(400)
        .send(sendResponse(false, null, "Missing shopify api key"));
    }
    if (!getApiToken) {
      return res
        .status(400)
        .send(sendResponse(false, null, "Missing shopify api token"));
    }
    // Define required fields based on discount type
    let requiredFields;
    switch (discount_type) {
      case "product":
        requiredFields = [
          "title",
          "value_type",
          "value",
          "customer_selection",
          "target_type",
          "target_selection",
          "allocation_method",
          "starts_at",
          "entitled_product_ids",
        ];
        break;
      case "order":
        requiredFields = [
          "title",
          "value_type",
          "value",
          "customer_selection",
          "target_type",
          "target_selection",
          "allocation_method",
          "starts_at",
          "prerequisite_subtotal_range",
        ];
        break;
      case "shipping":
        requiredFields = [
          "title",
          "value_type",
          "value",
          "customer_selection",
          "target_type",
          "target_selection",
          "allocation_method",
          "starts_at",
          "prerequisite_shipping_price_range",
        ];
        break;
      default:
        return res.status(400).json({ message: "Invalid discount type" });
    }

    // Check for missing fields
    const missingFields = requiredFields.filter((field) => !price_rule[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        message: "Validation Error: Missing required fields",
        missingFields: missingFields,
      });
    }

    // Construct the price rule data
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
        ends_at: price_rule.ends_at || undefined,
        ...(discount_type === "product" && {
          entitled_product_ids: price_rule.entitled_product_ids || [],
        }),
        ...(discount_type === "order" && {
          prerequisite_subtotal_range:
            price_rule.prerequisite_subtotal_range || undefined,
        }),
        ...(discount_type === "shipping" && {
          prerequisite_shipping_price_range:
            price_rule.prerequisite_shipping_price_range || undefined,
        }),
        allocation_limit: price_rule.allocation_limit || undefined,
      },
    };

    // Create the price rule
    const priceRulesUrl = `https://${process.env.SHOP_NAME}.myshopify.com/admin/api/2024-07/price_rules.json`;
    const response = await axios.post(priceRulesUrl, priceRuleData, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(
          `${process.env.API_KEY}:${process.env.API_PASSWORD}`
        ).toString("base64")}`,
      },
    });

    console.log("Price rule created:", response.data.price_rule.id);

    // Create the discount code
    const discountCodesUrl = `https://${process.env.SHOP_NAME}.myshopify.com/admin/api/2024-07/price_rules/${response.data.price_rule.id}/discount_codes.json`;
    const discountCodeData = {
      discount_code: {
        code: discount_code,
      },
    };

    const response_add_discount = await axios.post(
      discountCodesUrl,
      discountCodeData,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${Buffer.from(
            `${process.env.API_KEY}:${process.env.API_PASSWORD}`
          ).toString("base64")}`,
        },
      }
    );

    console.log("Discount code created:", response_add_discount.data);
    res
      .status(201)
      .send(
        sendResponse(
          true,
          response_add_discount.data.discount_code,
          "Discount Code Created Successfully"
        )
      );
    res
      .status(201)
      .json({ discount_code: response_add_discount.data.discount_code });
  } catch (error) {
    let errorMessage = "An unexpected error occurred";
    if (error.response && error.response.data && error.response.data.errors) {
      // Extract and format dynamic errors
      errorMessage = Object.entries(error.response.data.errors)
        .map(([key, messages]) => `${key}: ${messages}`)
        .join("\n");
    }
    res
      .status(500)
      .send(
        sendResponse(
          false,
          null,
          `Failed to create discount code.${errorMessage}`
        )
      );
  }
});

app.get("/get-discounts", authMiddleware, async (req, res) => {
  try {
    const getShopName = req.headers["shop-name"];
    const getApiKey = req.headers["shopify-api-key"];
    const getApiToken = req.headers["shopify-api-token"];
    if (!getShopName) {
      return res
        .status(400)
        .send(sendResponse(false, null, "Missing shopify Store/Shop name"));
    }
    if (!getApiKey) {
      return res
        .status(400)
        .send(sendResponse(false, null, "Missing shopify api key"));
    }
    if (!getApiToken) {
      return res
        .status(400)
        .send(sendResponse(false, null, "Missing shopify api token"));
    }
    // const credentials = req.headers.
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
    res
      .status(200)
      .send(
        sendResponse(true, allDiscounts, "Discounts Retrieved Successfully")
      );
  } catch (error) {
    console.log("->>>>>>>>>>>>>>>>>>>>", error);
    res
      .status(500)
      .send(
        sendResponse(
          false,
          null,
          "Might be Internal Server error, failed to get dicount codes.",
          error.message
        )
      );
  }
});

// Make sure to include this route to handle other routes
app.get("*", (req, res) => {
  res.status(404).send("Route Not Found");
});

app.listen(PORT, () => {
  console.log(`Testing shop Middleware server running on port ${PORT}`);
});
