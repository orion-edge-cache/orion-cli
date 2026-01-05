import { confirm, isCancel, spinner } from "@clack/prompts";
import { destroyTerraform, deleteTfState } from "@orion/infra";

export const handleDestroy = async (): Promise<boolean> => {
  const confirmDestroy = await confirm({
    message: "Confirm destroy infrastructure?",
  });

  if (confirmDestroy) {
    const resources = destroyTerraform();

    resources.forEach((resource: string) => {
      const s = spinner();
      s.start(`Destroying ${resource}`);
      s.stop(`✓ ${resource} destroyed`);
    });
    deleteTfState();
    return false;
  }

  if (isCancel(confirmDestroy)) {
    return true;
  }

  return true;
};