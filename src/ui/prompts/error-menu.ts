import { select, log, isCancel } from "@clack/prompts";

export type ErrorAction = "view-logs" | "retry" | "exit";
export type LogAction = "back" | "exit";

export async function showErrorMenu(error: Error): Promise<ErrorAction> {
  const choice = await select({
    message: "Operation failed. What would you like to do?",
    options: [
      { value: "view-logs", label: "View detailed error logs" },
      { value: "retry", label: "Retry" },
      { value: "exit", label: "Exit" },
    ],
  });

  if (isCancel(choice)) return "exit";
  return choice as ErrorAction;
}

export async function showDetailedLogs(error: Error): Promise<LogAction> {
  log.error("--- Detailed Error Log ---");
  log.message(error.message);
  if (error.stack) {
    log.message("\nStack trace:");
    log.message(error.stack);
  }
  log.error("--- End of Log ---");

  const choice = await select({
    message: "What would you like to do?",
    options: [
      { value: "back", label: "Return to previous menu" },
      { value: "exit", label: "Exit" },
    ],
  });

  if (isCancel(choice)) return "exit";
  return choice as LogAction;
}
