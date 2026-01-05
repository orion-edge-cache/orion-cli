import { confirm, isCancel, select, spinner } from "@clack/prompts";
import { execSync } from "child_process";
import { displayHeader } from "../ui/display";
import { getTerraformOutputs } from "@orion/infra";
import { unwrapTerraformOutput } from "../shared";

const purgeCDNCache = (s: ReturnType<typeof spinner>) => {
  const output = unwrapTerraformOutput(
    getTerraformOutputs(() => {
      s.message("Initializing Terraform...");
    })
  );
  const cdnServiceId = output.cdn_service.id;
  const fastlyToken = process.env.FASTLY_API_KEY || process.env.FASTLY_API_TOKEN;

  if (!fastlyToken) {
    throw new Error("FASTLY_API_KEY or FASTLY_API_TOKEN environment variable is required");
  }

  s.message("Purging CDN cache...");
  execSync(
    `curl -X POST "https://api.fastly.com/service/${cdnServiceId}/purge_all" -H "Fastly-Key: ${fastlyToken}"`,
    { stdio: "pipe" }
  );
};

export const handleCachePurge = async () => {
  displayHeader("Purge Cache");
  const confirmPurge = await confirm({
    message: "Confirm purge all cache?",
  });

  if (confirmPurge) {
    displayHeader("Purge Cache");
    const s = spinner();
    s.start("Purging CDN cache");
    purgeCDNCache(s);
    s.stop("Cache purged successfully");
    const back = (await select({
      message: "Return to Menu",
      options: [{ value: "back", label: "Enter" }],
    })) as string;
    if (isCancel(back)) {
      return;
    }
  }

  if (isCancel(confirmPurge)) {
    return;
  }
};
