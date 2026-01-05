import { execSync } from "child_process";
import { getTerraformOutput } from "../terraform";

export const tailKinesisStream = async () => {
  let shouldStop = false;

  const handleInterrupt = () => {
    shouldStop = true;
  };

  process.on("SIGINT", handleInterrupt);

  try {
    const output = getTerraformOutput();
    const kinesisStreamName = output.kinesis_stream?.name;

    if (!kinesisStreamName) {
      console.error("Kinesis stream name not found in Terraform output");
      process.exit(1);
    }

    console.log(`\nTailing Kinesis stream: ${kinesisStreamName}`);
    console.log("Press Ctrl+C to stop.\n");

    const pollStream = async () => {
      try {
        const shardCommand = `aws kinesis describe-stream --stream-name ${kinesisStreamName} --query 'StreamDescription.Shards[0].ShardId' --output text`;
        const shardId = execSync(shardCommand, { encoding: "utf-8" }).trim();

        let shardIteratorCommand = `aws kinesis get-shard-iterator --stream-name ${kinesisStreamName} --shard-id ${shardId} --shard-iterator-type LATEST --query 'ShardIterator' --output text`;
        let shardIterator = execSync(shardIteratorCommand, {
          encoding: "utf-8",
        }).trim();

        while (!shouldStop) {
          const recordsCommand = `aws kinesis get-records --shard-iterator ${shardIterator}`;
          const recordsOutput = JSON.parse(
            execSync(recordsCommand, { encoding: "utf-8" }),
          );

          if (recordsOutput.Records && recordsOutput.Records.length > 0) {
            recordsOutput.Records.forEach((record: any) => {
              const data = Buffer.from(record.Data, "base64").toString("utf-8");

              try {
                const jsonData = JSON.parse(data);
                const subroutine = jsonData.Subroutine;
                const title = jsonData.title;

                const cleanValue = (value: any): any => {
                  if (
                    typeof value === "string" &&
                    value.startsWith('"') &&
                    value.endsWith('"')
                  ) {
                    try {
                      const unquoted = value.slice(1, -1);
                      const unescaped = JSON.parse(
                        `"${unquoted.replace(/"/g, '\\"')}"`,
                      );
                      return cleanValue(JSON.parse(unescaped));
                    } catch {
                      return value;
                    }
                  }
                  return value;
                };

                if (subroutine) {
                  console.log(`\x1b[33m${subroutine}\x1b[0m`);

                  const remaining = { ...jsonData };
                  delete remaining.Subroutine;

                  Object.entries(remaining).forEach(([key, value]) => {
                    const cleaned = cleanValue(value);
                    console.log(
                      `  ${key}: ${JSON.stringify(cleaned, null, 2).split("\n").join("\n  ")}`,
                    );
                  });
                } else {
                  const header = title || "Log Entry";
                  console.log(`\x1b[33m${header}\x1b[0m`);

                  const remaining = { ...jsonData };
                  if (title) delete remaining.title;

                  Object.entries(remaining).forEach(([key, value]) => {
                    const cleaned = cleanValue(value);
                    console.log(
                      `  ${key}: ${JSON.stringify(cleaned, null, 2).split("\n").join("\n  ")}`,
                    );
                  });
                }

                console.log();
              } catch {
                console.log(data);
                console.log();
              }
            });
          }

          shardIterator = recordsOutput.NextShardIterator;

          if (!shardIterator) {
            break;
          }

          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch {
        return;
      }
    };

    await pollStream();
  } finally {
    process.removeListener("SIGINT", handleInterrupt);
  }
};