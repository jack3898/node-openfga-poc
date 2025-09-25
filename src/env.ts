import { object, string } from "@zod/mini";

const EnvSchema = object({
  STORE_ID: string(),
});

export default EnvSchema.parse(process.env);
