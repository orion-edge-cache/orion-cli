import { confirm, isCancel, select, spinner } from "@clack/prompts";
import { displayHeader } from "../../ui/display";
import { purgeCDNCache } from "@orion/infra";

export const handleCachePurge = async () => {
  displayHeader("Purge Cache");
  const confirmPurge = await confirm({
    message: "Confirm purge all cache?",
  });

  if (confirmPurge) {
    displayHeader("Purge Cache");
    const s = spinner();
    s.start("Purging CDN cache");
    purgeCDNCache();
    s.stop("✓ Cache purged successfully");
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