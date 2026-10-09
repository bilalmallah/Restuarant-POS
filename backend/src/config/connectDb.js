import { Sequelize } from "sequelize";
import config from "./config.js";

let sequelize;

const connectDb = async () => {
  const dialectOptions = {};
  if (config.env === "production") {
    dialectOptions.ssl = {
      rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false",
    };
  }

  sequelize = new Sequelize(
    config.databaseName,
    config.databaseUser,
    config.databasePassword,
    {
      host: config.databaseHost,
      port: config.databasePort,
      dialect: "postgres",
      logging: false,
      dialectOptions,
      define: { underscored: false },
    }
  );

  try {
    await sequelize.authenticate();
    console.log(`Database ${config.databaseName} connection has been established successfully.`);
  } catch (error) {
    console.error("Unable to connect to the database:", error.message);
    process.exit(1);
  }
};

await connectDb();

export { sequelize };
