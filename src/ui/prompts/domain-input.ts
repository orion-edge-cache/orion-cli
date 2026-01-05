import { intro, cancel, isCancel, text, confirm } from "@clack/prompts";
import type { Domain } from "../../shared";
import { displayHeader } from "../display";

export const askForDomain = async (): Promise<Domain | false> => {
  displayHeader("Setup");
  let hostname = "";
  let protocol = "";
  let port = 80;
  let hostOverride = "";
  let confirmed: boolean = false;

  intro("Fastly Cache Setup");

  while (!confirmed) {
    const input = (await text({
      message: "What is your GraphQL server URL (e.g., http://example.com:4000):",
      validate(value) {
        try {
          if (value.includes("://")) {
            new URL(value);
            return;
          }
          if (value.trim().length === 0) return "Please enter a URL";
        } catch {
          return "Not a valid URL";
        }
      },
    })) as string;

    if (isCancel(input)) {
      cancel("Operation cancelled.");
      return false;
    }

    try {
      let urlToParse = input;
      if (!input.includes("://")) {
        urlToParse = `http://${input}`;
      }

      const parsed = new URL(urlToParse);
      hostname = parsed.hostname;
      protocol = parsed.protocol.replace(":", "");
      port = parsed.port ? parseInt(parsed.port, 10) : protocol === "https" ? 443 : 80;
    } catch {
      hostname = input;
      protocol = "http";
      port = 80;
    }

    const confirmHostOverride = (await confirm({
      message: "Do you want to override the Host header sent to the GraphQL Server?",
      initialValue: false,
    })) as boolean;

    if (isCancel(confirmHostOverride)) {
      cancel("Operation cancelled.");
      return false;
    }

    if (confirmHostOverride) {
      hostOverride = (await text({
        message: "What hostname do you want to use as the Host header override:",
        validate(value) {
          if (value.trim().length === 0) return "Please enter a hostname";
        },
      })) as string;

      if (isCancel(hostOverride)) {
        cancel("Operation cancelled.");
        return false;
      }
    } else {
      hostOverride = hostname;
    }

    confirmed = (await confirm({
      message: `Deploy cache for:
        Backend: ${protocol}://${hostname}:${port}
        Host Header: ${hostOverride}
        Continue?`,
    })) as boolean;

    if (isCancel(confirmed)) {
      cancel("Operation cancelled.");
      return false;
    }

    if (!confirmed) {
      displayHeader("Setup");
      intro("Fastly Cache Setup");
    }
  }

  return { url: hostname, protocol, port, hostOverride };
};