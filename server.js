const express = require("express");
const cors = require("cors");
const axios = require("axios");
const dotenv = require("dotenv");
const morgan = require("morgan");
const apicache = require("apicache");
const authMiddleware = require("./middleware/middleware_one");
const sendResponse = require("./Helper/Helper_one");
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const route = express.Router();
app.use(morgan("dev"));

//configure apicache
let cache = apicache.middleware;

//caching all routes for 5 minutes
app.use(cors());
app.use(express.json());
app.use(cache("3 minutes"));

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
          prerequisite_product_ids: price_rule.prerequisite_product_ids || [],
          prerequisite_to_entitlement_quantity_ratio:
            price_rule.prerequisite_to_entitlement_quantity_ratio || [],
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
        code: discount_code + "_CC",
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
        .send(sendResponse(false, null, "Missing Shopify Store/Shop name"));
    }
    if (!getApiKey) {
      return res
        .status(400)
        .send(sendResponse(false, null, "Missing Shopify API key"));
    }
    if (!getApiToken) {
      return res
        .status(400)
        .send(sendResponse(false, null, "Missing Shopify API token"));
    }

    const priceRulesUrl = `https://${process.env.SHOP_NAME}.myshopify.com/admin/api/2024-07/price_rules.json?fields=id,title`;
    const priceRulesResponse = await axios.get(priceRulesUrl, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(
          `${process.env.API_KEY}:${process.env.API_PASSWORD}`
        ).toString("base64")}`,
      },
    });

    const priceRuleIds = priceRulesResponse.data.price_rules.map(
      (rule) => rule.id
    );

    // Fetch all discount codes for all price rules in one request
    const allDiscountPromises = priceRuleIds.map((id) =>
      axios.get(
        `https://${process.env.SHOP_NAME}.myshopify.com/admin/api/2024-07/price_rules/${id}/discount_codes.json`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${Buffer.from(
              `${process.env.API_KEY}:${process.env.API_PASSWORD}`
            ).toString("base64")}`,
          },
        }
      )
    );

    // Wait for all requests to finish
    const allDiscountResponses = await Promise.all(allDiscountPromises);

    // Combine and filter discount codes in a single step
    const filteredDiscounts = allDiscountResponses.flatMap((response) =>
      response.data.discount_codes.filter((discount) =>
        discount.code.endsWith("_CC")
      )
    );

    res
      .status(200)
      .send(
        sendResponse(
          true,
          filteredDiscounts,
          "Discounts Retrieved Successfully"
        )
      );
  } catch (error) {
    console.log("->>>>>>>>>>>>>>>>>>>>", error);
    res
      .status(500)
      .send(
        sendResponse(
          false,
          null,
          "Might be Internal Server error, failed to get discount codes.",
          error.message
        )
      );
  }
});

//get single discount route

// Make sure to include this route to handle other routes
app.get("*", (req, res) => {
  res.status(404).send("Route Not Found");
});

app.listen(PORT, () => {
  console.log(`Testing shop Middleware server running on port ${PORT}`);
});
