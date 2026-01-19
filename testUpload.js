const axios = require("axios");
const fs = require("fs");

(async () => {
    try {
        const jsonData = JSON.parse(fs.readFileSync("./data/test.json", "utf-8"));
        const response = await axios.post("http://localhost:3000/api/boards", jsonData, {
            headers: { "Content-Type": "application/json" }
        });

        console.log("Response:", response.data);
    } catch (error) {
        console.error("Fehler beim Testen des Uploads:", error.response ? error.response.data : error.message);
    }
})();