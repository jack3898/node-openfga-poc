import { OpenFgaClient } from "@openfga/sdk";
import env from "./env.ts";

export const fgaClient = new OpenFgaClient({
  apiUrl: "http://localhost:8080",
  storeId: env.STORE_ID,
});
