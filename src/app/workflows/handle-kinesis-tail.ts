import { tailKinesisStream } from "../../services/aws";

export const handleKinesisTail = async () => {
  process.removeAllListeners("SIGINT");
  const noopHandler = () => {};
  process.on("SIGINT", noopHandler);
  try {
    await tailKinesisStream();
  } finally {
    process.removeAllListeners("SIGINT");
  }
};