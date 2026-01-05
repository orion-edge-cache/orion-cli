import chalk from "chalk";

const colors = {
  lightBlue: [71, 190, 204] as const,
  darkBlue: [21, 42, 74] as const,
  neonBlue: [22, 161, 233] as const,
  neonGreen: [55, 252, 17] as const,
  blue: [29, 68, 109] as const,
};

export const C1 = chalk.rgb(...colors.neonBlue);
export const C2 = chalk.rgb(...colors.neonGreen);

export const applyAsciiColors = (ascii: string) => {
  let currentColor = chalk.reset;

  let result = "";
  for (let i = 0; i < ascii.length; i++) {
    const ch = ascii[i];

    if (ch === "1") {
      currentColor = C1;
      continue;
    }

    if (ch === "2") {
      currentColor = C2;
      continue;
    }

    result += currentColor(ch);
  }

  return result;
};