import { Logger, type ILogObj } from "tslog";

export const EpubViewerLog = new Logger<ILogObj>({
  name: "EpubApp",
  minLevel: import.meta.env.MODE === "development" ? 2 : 4,
  type: "hidden"
});