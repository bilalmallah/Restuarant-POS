import pg from "pg";
import config from "../src/config/config.js";

const { Client } = pg;

const createDatabase = async () => {
  const client = new Client({
    user: config.databaseUser,
    host: config.databaseHost,
    database: "postgres",
    password: config.databasePassword,
    port: Number(config.databasePort),
  });

  try {
    await client.connect();

    const existing = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [
      config.databaseName,
    ]);

    if (existing.rows.length) {
      console.log(`Database ${config.databaseName} already exists`);
    } else {
      // template0 avoids the collation mismatch that template1 inherits on
      // Windows installs of Postgres.
      await client.query(`CREATE DATABASE "${config.databaseName}" WITH TEMPLATE template0;`);
      console.log(`Database ${config.databaseName} created`);
    }
  } catch (error) {
    console.error("Error creating database:", error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
};

await createDatabase();
