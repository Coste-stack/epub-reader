import log from "loglevel";

const isDev = import.meta.env.MODE === "development";

// Create named loggers
export const AppLogger = log.getLogger("App");
export const EpubAppLogger = log.getLogger("EpubApp");
export const BookApiLogger = log.getLogger("BookApi");

// Set log level
const level = isDev ? "debug" : "warn";
AppLogger.setLevel(level);
EpubAppLogger.setLevel(level);
BookApiLogger.setLevel(level);