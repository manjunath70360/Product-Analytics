const bcrypt = require("bcrypt");
const express = require("express");
const axios = require("axios");
const app = express();
app.use(express.json());

const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

const cors = require("cors");
const path = require("path");

app.use(
  cors({
    origin: "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  })
);

const dbPath = path.join(__dirname, "database.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database, // Change this to sqlite3.Database
    });
    app.listen(9000, () => {
      console.log("Server Running on Port 6000");
    });
  } catch (err) {
    console.log(`DB Error: ${err.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

const formateData = async (element) => {
  try {
    const query = `INSERT INTO product(id, title, price, description, category, image, sold, dateOfSale) 
                   VALUES(${element.id}, "${element.title}", ${element.price}, "${element.description}", 
                   "${element.category}", "${element.image}", ${element.sold}, "${element.dateOfSale}");`;

    const result = await db.run(query);
    console.log("Database insert result:", result);
  } catch (error) {
    console.error("Error inserting data into database:", error);
  }
};

const GetTheDataFromTheApi = async () => {
  try {
    console.log("Fetching data from API...");
    const response = await axios.get(
      "https://s3.amazonaws.com/roxiler.com/product_transaction.json"
    );
    const data = response.data;
    console.log("Retrieved data:", data);

    await db.run("DELETE FROM product");

    for (const eachProduct of data) {
      await formateData(eachProduct);
    }
    console.log({ result: "Data formatted and inserted successfully." });
  } catch (error) {
    console.error("Error fetching or processing data:", error);
  }
};

GetTheDataFromTheApi();

app.get("/", async (req, res) => {
  const query = "SELECT * FROM product";
  const response = await db.all(query);
  res.send(response);
});

app.get("/combined-api/", async (req, res) => {
  const month = req.query.month;

  try {
    // Fetch data from the three APIs
    const priceRangesResponse = await fetchPriceRanges(month);
    const staticsResponse = await fetchStatics(month);
    const pieChartDataResponse = await fetchPieChartData(month);

    // Combine the responses into a single object
    const combinedResponse = {
      priceRanges: priceRangesResponse,
      statics: staticsResponse,
      pieChartData: pieChartDataResponse,
    };

    res.json(combinedResponse);
  } catch (error) {
    console.error("Error:", error);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
});

async function fetchPriceRanges(month) {
  const query =
    "SELECT * FROM product WHERE CAST(strftime('%m', dateOfSale) AS INT) = ?;";

  const response = await db.all(query, [month]);

  const priceRangeCounts = {};
  response.forEach((item) => {
    const range = getPriceRange(item.price);

    if (priceRangeCounts.hasOwnProperty(range)) {
      priceRangeCounts[range]++;
    } else {
      priceRangeCounts[range] = 1;
    }
  });

  const transformedList = Object.entries(
    priceRangeCounts
  ).map(([range, count]) => ({ range, count }));

  return transformedList;
}

function getPriceRange(price) {
  const lowerBound = Math.floor(price / 100) * 100;
  const upperBound = lowerBound + 100;
  const range = upperBound > 900 ? "900-above" : `${lowerBound}-${upperBound}`;
  return range;
}

async function fetchStatics(month) {
  const query =
    "SELECT * FROM product WHERE CAST(strftime('%m', dateOfSale) AS INT) = ?;";

  const response = await db.all(query, [month]);

  const totalSale = response
    .filter((eachProduct) => eachProduct.sold === "1")
    .reduce((acc, eachProduct) => acc + eachProduct.price, 0)
    .toFixed(2);

  const totalSoldItem = response.filter(
    (eachProduct) => eachProduct.sold === "1"
  ).length;

  const totalNotSoldItem = response.filter(
    (eachProduct) => eachProduct.sold === "0"
  ).length;

  return {
    totalSale: totalSale,
    totalSoldItem: totalSoldItem,
    totalNotSoldItem: totalNotSoldItem,
  };
}

async function fetchPieChartData(month) {
  const query = `
      SELECT category, COUNT(*) AS itemCount
      FROM product
      WHERE CAST(strftime('%m', dateOfSale) as INT) = ?
      GROUP BY category;
    `;
  const response = await db.all(query, [month]);

  return response;
}

module.exports = app;
