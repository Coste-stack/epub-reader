import log from "loglevel";

const isDev = import.meta.env.MODE === "development";

// Create named loggers
export const EpubAppLog = log.getLogger("EpubApp");
export const BookApiLog = log.getLogger("BookApi");

// Set log level
const level = isDev ? "debug" : "warn";
EpubAppLog.setLevel(level);
BookApiLog.setLevel(level);