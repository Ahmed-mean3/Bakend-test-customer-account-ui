const express = require("express");
const cors = require("cors");
const axios = require("axios");
const dotenv = require("dotenv");
// const morgan = require("morgan");
// const apicache = require("apicache");

dotenv.config();

var ResponseObj = {
  status: null,
  data: null,
  message: "",
  error: "",
  page: null,
  limit: null,
};

const sendResponse = (status, data, message, error, page, limit) => {
  ResponseObj.status = status;
  ResponseObj.data = data;
  ResponseObj.message = message;
  ResponseObj.error = error;
  ResponseObj.page = page;
  ResponseObj.limit = limit;
  return ResponseObj;
};

const authMiddleware = (req, res, next) => {
  // Check for the presence of API access key in headers
  const apiKey = req.headers["api-key"];
  // console.log("matchup", apiKey === process.env.SECURE_KEY);
  if (apiKey !== process.env.SECURE_KEY) {
    return res
      .status(401)
      .send(sendResponse(false, null, "API access key is missing"));
  }
  next();
};
const app = express();
const PORT = process.env.PORT || 4000;
const route = express.Router();
// app.use(morgan("dev"));

//configure apicache
// let cache = apicache.middleware;

//caching all routes for 5 minutes
app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  res.send("Server Started for test cutomer account ui backend.");
});

//get discounts with pagination
app.get("/get-discounts", authMiddleware, async (req, res) => {
  try {
    let { page, limit } = req.query;
    const getShopName = req.headers["shop-name"];
    const getApiKey = req.headers["shopify-api-key"];
    const getApiToken = req.headers["shopify-api-token"];
    let link;
    if (!limit) limit = 50;
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
    // if (!page) page = 1;

    // Fetch all price rules and filter by title starting with "CC_"
    let priceRulesUrl = `https://${getShopName}.myshopify.com/admin/api/2024-07/price_rules.json?limit=${limit}`;
    if (page) {
      priceRulesUrl += `&page_info=${page}`;
    }
    const priceRulesResponse = await axios.get(priceRulesUrl, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(
          `${getApiKey}:${getApiToken}`
        ).toString("base64")}`,
      },
    });
    let filteredPriceRules = [];

    for (const rule of priceRulesResponse.data.price_rules) {
      if (rule.title.startsWith("CC_")) {
        filteredPriceRules.push({
          code: rule.title,
          usage_count: rule.usage_count,
          priceRuleDetails: {
            id: rule.id,
            value_type: rule.value_type,
            value: rule.value,
            customer_selection: rule.customer_selection,
            target_type: rule.target_type,
            target_selection: rule.target_selection,
            allocation_method: rule.allocation_method,
            allocation_limit: rule.allocation_limit,
            once_per_customer: rule.once_per_customer,
            usage_limit: rule.usage_limit,
            starts_at: rule.starts_at,
            ends_at: rule.ends_at,
            created_at: rule.created_at,
            updated_at: rule.updated_at,
            entitled_product_ids: rule.entitled_product_ids,
            entitled_variant_ids: rule.entitled_variant_ids,
            entitled_collection_ids: rule.entitled_collection_ids,
            entitled_country_ids: rule.entitled_country_ids,
            prerequisite_product_ids: rule.prerequisite_product_ids,
            prerequisite_variant_ids: rule.prerequisite_variant_ids,
            prerequisite_collection_ids: rule.prerequisite_collection_ids,
            customer_segment_prerequisite_ids:
              rule.customer_segment_prerequisite_ids,
            prerequisite_customer_ids: rule.prerequisite_customer_ids,
            prerequisite_subtotal_range: rule.prerequisite_subtotal_range,
            prerequisite_quantity_range: rule.prerequisite_quantity_range,
            prerequisite_shipping_price_range:
              rule.prerequisite_shipping_price_range,
            prerequisite_to_entitlement_quantity_ratio:
              rule.prerequisite_to_entitlement_quantity_ratio,
            prerequisite_to_entitlement_purchase:
              rule.prerequisite_to_entitlement_purchase,
            title: rule.title,
            admin_graphql_api_id: rule.admin_graphql_api_id,
          },
        });
      }
    }
    let prevPage = null,
      forwardPage = null;

    // Find all occurrences of 'page_info'
    const occurrences = priceRulesResponse.headers.link.match(/page_info/g);

    // Check if 'page_info' appears more than once
    if (occurrences && occurrences.length > 1) {
      console.log("forward and backward block");
      prevPage = priceRulesResponse.headers.link?.split("&page_info=")[1];
      prevPage = prevPage?.split(">")[0];
      forwardPage =
        priceRulesResponse.headers.link?.split(`rel="previous",`)[1];
      forwardPage = forwardPage?.split("&page_info=")[1];
      forwardPage = forwardPage?.split(">")[0];
    } else {
      console.log("only forward block");
      forwardPage = priceRulesResponse.headers.link?.split("&page_info=")[1];
      forwardPage = forwardPage?.split(">")[0];
    }

    link = {
      prevPage,
      forwardPage,
    };
    // console.log(
    //   "prev",
    //   prevPage,
    //   "forward",
    //   forwardPage,
    //   priceRulesResponse.headers.link
    // );
    res
      .status(200)
      .send(
        sendResponse(
          true,
          filteredPriceRules,
          "Discounts Retrieved Successfully",
          "",
          link
        )
      );
  } catch (error) {
    // console.log("->>>>>>>>>>>>>>>>>>>>", error);
    let errorMessage = "An unexpected error occurred";
    if (error.response && error.response.data && error.response.data.errors) {
      // Extract and format dynamic errors
      errorMessage = Object.entries(error.response.data.errors)
        .map(([key, messages]) => `${key}: ${messages}`)
        .join("\n");
    }
    console.log("error", errorMessage);

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
//get all products or single collection with pagination
app.get("/get-collections", authMiddleware, async (req, res) => {
  try {
    let { page, limit } = req.query;
    const getShopName = req.headers["shop-name"];
    const getApiKey = req.headers["shopify-api-key"];
    const getApiToken = req.headers["shopify-api-token"];
    let collectionResponse, _collectionReponse;
    let collectionUrl, _collectionUrl;
    let allCollections = [];
    let prevPage = null,
      forwardPage = null;

    let link;
    if (!limit) limit = 50;

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

    collectionUrl = `https://${getShopName}.myshopify.com/admin/api/2024-07/custom_collections.json?limit=${limit}`;
    // let collectionUrl = `https://${getApiKey}:${getApiToken}@${getShopName}.myshopify.com/admin/api/2024-07/products.json`;
    if (page) {
      collectionUrl += `&page_info=${page}`;
    }
    collectionResponse = await axios.get(collectionUrl, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(
          `${getApiKey}:${getApiToken}`
        ).toString("base64")}`,
      },
    });
    _collectionUrl = `https://${getShopName}.myshopify.com/admin/api/2024-07/smart_collections.json?limit=${limit}`;
    // let collectionUrl = `https://${getApiKey}:${getApiToken}@${getShopName}.myshopify.com/admin/api/2024-07/products.json`;
    if (page) {
      _collectionUrl += `&page_info=${page}`;
    }
    _collectionReponse = await axios.get(_collectionUrl, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(
          `${getApiKey}:${getApiToken}`
        ).toString("base64")}`,
      },
    });

    allCollections = [
      ...collectionResponse.data.custom_collections,
      ..._collectionReponse.data.smart_collections,
    ];
    // console.log("data", _collectionReponse.data);
    const occurrences = collectionResponse?.headers?.link?.match(/page_info/g);

    if (occurrences && occurrences.length > 1) {
      console.log("forward and backward block");
      prevPage = collectionResponse.headers.link?.split("&page_info=")[1];
      prevPage = prevPage?.split(">")[0];
      forwardPage =
        collectionResponse.headers.link?.split(`rel="previous",`)[1];
      forwardPage = forwardPage?.split("&page_info=")[1];
      forwardPage = forwardPage?.split(">")[0];
    } else {
      console.log("only forward block");
      forwardPage = collectionResponse.headers.link?.split("&page_info=")[1];
      forwardPage = forwardPage?.split(">")[0];
    }

    link = {
      prevPage,
      forwardPage,
    };
    res
      .status(200)
      .send(
        sendResponse(
          true,
          allCollections,
          `All Collections Retreived Successfully`,
          "",
          link
        )
      );
  } catch (error) {
    console.log("error what happening", error);
    res
      .status(500)
      .send(
        sendResponse(
          false,
          null,
          "Might be Internal Server error, failed to get products or collection",
          error.message
        )
      );
  }
});
//get all products or single collection with pagination
app.get("/get-products", authMiddleware, async (req, res) => {
  try {
    let { page, limit, isCollection } = req.query;
    const getShopName = req.headers["shop-name"];
    const getApiKey = req.headers["shopify-api-key"];
    const getApiToken = req.headers["shopify-api-token"];
    let productsResponse;
    let productsUrl;
    let link;
    if (!limit) {
      limit = 50;
    }
    if (!isCollection) {
      isCollection = false;
    }
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

    if (!isCollection) {
      productsUrl = `https://${getShopName}.myshopify.com/admin/api/2024-07/products.json?limit=${limit}`;
      // let productsUrl = `https://${getApiKey}:${getApiToken}@${getShopName}.myshopify.com/admin/api/2024-07/products.json`;
      if (page) {
        productsUrl += `&page_info=${page}`;
      }
      productsResponse = await axios.get(productsUrl, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${Buffer.from(
            `${getApiKey}:${getApiToken}`
          ).toString("base64")}`,
        },
      });
      // console.log("products retrieved:", productsResponse.data);
      link = productsResponse.headers?.link?.split("&page_info=")[1];
      link = link?.split(">")[0];
      // console.log("yooo", link);
    } else {
      productsUrl = `https://${getShopName}.myshopify.com/admin/api/2024-07/collections/${isCollection}.json`;
      link = null;
      productsResponse = await axios.get(productsUrl, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${Buffer.from(
            `${getApiKey}:${getApiToken}`
          ).toString("base64")}`,
        },
      });
      console.log("collection retrieved:", productsResponse.data.collection);
      // const collectionBaseProductUrl = `https://${getShopName}.myshopify.com/admin/api/2024-07/collections/${isCollection}/products.json?limit=${limit}`;
      // if (page) {
      //   collectionBaseProductUrl += `&page_info=${page}`;
      // }
      // productsResponse = await axios.get(collectionBaseProductUrl, {
      //   headers: {
      //     "Content-Type": "application/json",
      //     Authorization: `Basic ${Buffer.from(
      //       `${getApiKey}:${getApiToken}`
      //     ).toString("base64")}`,
      //   },
      // });
      link = productsResponse.headers?.link?.split("&page_info=")[1];
      link = link?.split(">")[0];
      console.log(
        "collection based products retrieved:",
        productsResponse.data
      );
    }

    res
      .status(200)
      .send(
        sendResponse(
          true,
          productsResponse.data,
          `${
            isCollection ? "Collection Based Products " : "Products"
          } Retreived Successfully`,
          "",
          link
        )
      );
  } catch (error) {
    console.log("error what happening", error);
    res
      .status(500)
      .send(
        sendResponse(
          false,
          null,
          "Might be Internal Server error, failed to get products or collection",
          error.message
        )
      );
  }
});
//get all products or single collection with pagination
app.get("/get-customers", authMiddleware, async (req, res) => {
  try {
    let { page, limit } = req.query;
    const getShopName = req.headers["shop-name"];
    const getApiKey = req.headers["shopify-api-key"];
    const getApiToken = req.headers["shopify-api-token"];
    let customersResponse;
    let cutomersUrl;
    let link;
    if (!limit) {
      limit = 50;
    }

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

    cutomersUrl = `https://${getShopName}.myshopify.com/admin/api/2024-07/customers.json?limit=${limit}`;
    // let cutomersUrl = `https://${getApiKey}:${getApiToken}@${getShopName}.myshopify.com/admin/api/2024-07/products.json`;
    if (page) {
      cutomersUrl += `&page_info=${page}`;
    }
    customersResponse = await axios.get(cutomersUrl, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(
          `${getApiKey}:${getApiToken}`
        ).toString("base64")}`,
      },
    });
    // console.log("products retrieved:", customersResponse.data);
    link = customersResponse.headers?.link?.split("&page_info=")[1];
    link = link?.split(">")[0];
    // console.log("yooo", link);

    res
      .status(200)
      .send(
        sendResponse(
          true,
          customersResponse.data,
          `Customers Retreived Successfully`,
          "",
          link
        )
      );
  } catch (error) {
    console.log("error what happening", error);
    res
      .status(500)
      .send(
        sendResponse(
          false,
          null,
          "Might be Internal Server error, failed to get products or collection",
          error.message
        )
      );
  }
});
//get price rule (single discount detail)
app.get("/get-price_rule/:id", authMiddleware, async (req, res) => {
  try {
    const getShopName = req.headers["shop-name"];
    const getApiKey = req.headers["shopify-api-key"];
    const getApiToken = req.headers["shopify-api-token"];
    const priceRuleId = req.params.id;

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
    if (!priceRuleId) {
      return res
        .status(400)
        .send(
          sendResponse(
            false,
            null,
            "Missing Price Rule Id in the Parameters of the Request}"
          )
        );
    }

    // const priceRulesUrl = `https://${getShopName}.myshopify.com/admin/api/2024-07/price_rules/${priceRuleId}`;
    const priceRulesUrl = `https://${getApiKey}:${getApiToken}@${getShopName}.myshopify.com/admin/api/2024-07/price_rules.json?id=${priceRuleId}`;
    const priceRulesResponse = await axios.get(priceRulesUrl, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("Price rule retrieved:", priceRulesResponse.data);
    res
      .status(200)
      .send(
        sendResponse(
          true,
          priceRulesResponse.data,
          "Price rule Retrieved Successfully"
        )
      );
  } catch (error) {
    res
      .status(500)
      .send(
        sendResponse(
          false,
          null,
          "Might be Internal Server error, failed to get price rules",
          error.message
        )
      );
  }
});
//add a discount
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
    if (
      !price_rule.entitled_product_ids &&
      !price_rule.entitled_collection_ids
    ) {
      return res.status(400).json({
        message:
          "at least collection ids or product ids required to create discount",
        missingFields: ["entitled_collection_ids", "entitled_product_ids"],
      });
    }
    if (
      price_rule.customer_selection === "prerequisite" &&
      !price_rule.prerequisite_customer_ids &&
      !price_rule.customer_segment_prerequisite_ids
    ) {
      return res.status(400).json({
        message:
          "at least prerequisite customer ids or customer_segment prerequisite ids required to create discount",
        missingFields: [
          "prerequisite_customer_ids",
          "customer_segment_prerequisite_ids",
        ],
      });
    }

    // Construct the price rule data
    const priceRuleData = {
      price_rule: {
        title: "CC_" + price_rule.title,
        value_type: price_rule.value_type,
        value: price_rule.value,
        customer_selection: price_rule.customer_selection,
        target_type: price_rule.target_type,
        target_selection: price_rule.target_selection,
        allocation_method: price_rule.allocation_method,
        starts_at: price_rule.starts_at,
        ends_at: price_rule.ends_at || undefined,
        ...(discount_type === "product" && {
          prerequisite_subtotal_range:
            price_rule.prerequisite_subtotal_range || {},
        }),
        ...(discount_type === "product" && {
          prerequisite_to_entitlement_quantity_ratio:
            price_rule.prerequisite_to_entitlement_quantity_ratio || {},
        }),
        ...(discount_type === "product" && {
          entitled_product_ids: price_rule.entitled_product_ids || [],
          entitled_collection_ids: price_rule.entitled_collection_ids || [],
          prerequisite_product_ids: price_rule.prerequisite_product_ids || [],
        }),
        ...(discount_type === "product" &&
          price_rule.hasOwnProperty(
            "prerequisite_to_entitlement_quantity_ratio"
          ) &&
          price_rule.prerequisite_to_entitlement_quantity_ratio && {
            prerequisite_to_entitlement_quantity_ratio:
              price_rule.prerequisite_to_entitlement_quantity_ratio,
          }),
        ...(price_rule.customer_selection === "prerequisite" &&
          price_rule.prerequisite_customer_ids && {
            prerequisite_customer_ids:
              price_rule.prerequisite_customer_ids || [],
          }),
        ...(price_rule.customer_selection === "prerequisite" &&
          price_rule.customer_segment_prerequisite_ids && {
            customer_segment_prerequisite_ids:
              price_rule.customer_segment_prerequisite_ids || [],
          }),
        ...(discount_type === "order" &&
          price_rule.hasOwnProperty("prerequisite_subtotal_range") &&
          price_rule.prerequisite_subtotal_range && {
            prerequisite_subtotal_range:
              price_rule.prerequisite_subtotal_range || undefined,
          }),
        ...(discount_type === "shipping" && {
          prerequisite_shipping_price_range:
            price_rule.prerequisite_shipping_price_range || undefined,
        }),
        allocation_limit: price_rule.allocation_limit || undefined,
        usage_limit: price_rule.usage_limit || undefined,
        once_per_customer: price_rule.once_per_customer || false,
      },
    };

    // Create the price rule
    const priceRulesUrl = `https://${getShopName}.myshopify.com/admin/api/2024-07/price_rules.json`;
    const response = await axios.post(priceRulesUrl, priceRuleData, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(
          `${getApiKey}:${getApiToken}`
        ).toString("base64")}`,
      },
    });

    console.log("Price rule created:", response.data.price_rule.id);

    // Create the discount code
    const discountCodesUrl = `https://${getShopName}.myshopify.com/admin/api/2024-07/price_rules/${response.data.price_rule.id}/discount_codes.json`;
    const discountCodeData = {
      discount_code: {
        code: "CC_" + discount_code,
      },
    };

    const response_add_discount = await axios.post(
      discountCodesUrl,
      discountCodeData,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${Buffer.from(
            `${getApiKey}:${getApiToken}`
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
    console.log("error", error);
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

app.listen(PORT, () => {
  console.log(`Testing shop Middleware server running on port ${PORT}`);
});
