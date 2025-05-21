import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Coral API",
      version: "1.0.0",
      description: "Coral API documentation",
    },
  },
  apis: ["./src/routes/*.ts", "./src/models/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);
export { swaggerUi };
