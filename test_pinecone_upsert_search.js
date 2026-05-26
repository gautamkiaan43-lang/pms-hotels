require("dotenv").config({ path: require("path").resolve(__dirname, ".env") });
const pineconeService = require("./src/services/qdrantService");

(async () => {
  try {
    const VECTOR_SIZE = 1024;
    const vec = Array.from({ length: VECTOR_SIZE }, () => Math.random() * 0.01);
    const point = {
      id: `test-point-${Date.now()}`,
      vector: vec,
      text: "upsert-search-test",
      source: "local-test",
      docType: "test",
      chunkIndex: 0,
      hotelId: "local-test-hotel",
    };

    console.log("Upserting point...");
    const upsertRes = await pineconeService.upsertPoints([point]);
    console.log("Upsert response:", upsertRes);

    console.log("Searching for the point...");
    const results = await pineconeService.search(vec, 5);
    console.log("Search results:", results);
  } catch (err) {
    console.error("Test failed:", err.message || err);
    if (err.response) {
      console.error("HTTP status:", err.response.status);
      console.error("Response data:", err.response.data);
    }
    process.exit(1);
  }
})();
