import { defineCloudflareConfig } from "@opennextjs/cloudflare/config";
import cache from "@opennextjs/cloudflare/overrides/incremental-cache/no-cache";

export default defineCloudflareConfig({
  incrementalCache: cache,
});