import { writeFileSync } from "node:fs";
import yaml from "js-yaml";
import { swaggerSpec } from "../src/routes/swagger";

writeFileSync("dist/openapi.yaml", yaml.dump(swaggerSpec));
console.log("dist/openapi.yaml exported");
