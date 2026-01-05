import { spinner, select, isCancel } from "@clack/prompts";
import { askForDomain } from "../../ui/prompts";
import {
  getTerraformOutput,
  buildTerraform,
  initTerraform,
} from "@orion/infra";
import {
  buildCompute,
  processComputeTemplates,
  deployCompute,
} from "@orion/infra";
import { displayHeader, displayLogo, displayOutput } from "../../ui/display";
import { handleExistingState } from "./existing-deployment";
import type { Domain } from "../../shared";

export const handleNewState = async (): Promise<boolean> => {
  const domain: Domain | false = await askForDomain();

  if (!domain) return false;

  let s = spinner();
  s.start("Initializing Terraform");
  initTerraform();
  s.stop("✓ Terraform initialized");

  s = spinner();
  s.start("Creating infrastructure");
  buildTerraform(domain);
  s.stop("✓ Infrastructure created");

  const output = getTerraformOutput();
  processComputeTemplates(output);

  s = spinner();
  s.start("Building Fastly Compute service");
  buildCompute();
  s.stop("✓ Fastly Compute service built");

  s = spinner();
  s.start("Deploying Fastly Compute service");
  deployCompute();
  s.stop("✓ Fastly Compute service deployed");

  displayLogo();
  const viewCacheChoice = (await select({
    message: "Deployment complete",
    options: [{ value: "view", label: "View Current Cache" }],
  })) as string;

  if (!isCancel(viewCacheChoice)) {
    displayHeader("Deployed");
    displayOutput(output);

    const back = (await select({
      message: "Return to Menu",
      options: [{ value: "back", label: "Enter" }],
    })) as string;

    if (!isCancel(back)) {
      return await handleExistingState();
    }
  }

  return true;
};