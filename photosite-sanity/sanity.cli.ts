import { defineCliConfig } from "sanity/cli";

export default defineCliConfig({
  api: { projectId: "serh8kfd", dataset: "production" },
  studioHost: "danagill-photosite",
  deployment: { autoUpdates: true },
});
