import { OpenFgaClient } from "@openfga/sdk";
import fs from "node:fs";

const fgaClient = new OpenFgaClient({
  apiUrl: "http://localhost:8080",
});

const { id: storeId } = await fgaClient.createStore({
  name: "My Logistics App Store",
});

fs.writeFileSync(".env", `STORE_ID=${storeId}\n`);
