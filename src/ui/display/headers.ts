import { C1, C2 } from "../colors";

export const clearScreen = () => {
  console.clear();
};

export const displayHeader = (title?: string) => {
  console.clear();
  const header = C1("ORION") + (title ? C2(" › ") + title : "");
  console.log("\n  " + header + "\n");
};