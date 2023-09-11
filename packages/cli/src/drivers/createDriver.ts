import { GlobalOptions } from "./DriverAbstract";
import MysqlDriver from "./MysqlDriver";
import PostgresDriver from "./PostgresDriver";

export function createDriver(
  name: "mysql" | "postgres",
  globalOptions: GlobalOptions,
) {
  if (name === "mysql") {
    return new MysqlDriver(globalOptions);
  } else if (name === "postgres") {
    return new PostgresDriver(globalOptions);
  } else {
    throw new Error(`Invalid driver name: ${name}`);
  }
}
