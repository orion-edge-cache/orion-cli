import type { TerraformOutput } from "../../shared";

export const displayOutput = (output: TerraformOutput) => {
  const compute: Array<[string, string]> = [];
  const cdn: Array<[string, string]> = [];
  const configstore: Array<[string, string]> = [];
  const secretstore: Array<[string, string]> = [];
  const aws: Array<[string, string]> = [];

  compute.push(["Domain", output.compute_service.domain_name]);
  compute.push(["ID", output.compute_service.id]);
  compute.push(["Name", output.compute_service.name]);
  compute.push(["Backend Domain", output.compute_service.backend_domain]);
  compute.push(["Backend Port", String(output.compute_service.backend_port)]);
  compute.push(["Backend Protocol", output.compute_service.backend_protocol]);
  compute.push([
    "Backend Host Override",
    output.compute_service.backend_host_override,
  ]);

  cdn.push(["Domain", output.cdn_service.domain_name]);
  cdn.push(["ID", output.cdn_service.id]);
  cdn.push(["Name", output.cdn_service.name]);

  configstore.push(["Name", output.configstore.name]);
  configstore.push(["ID", output.configstore.id]);

  secretstore.push(["Name", output.secretstore.name]);
  secretstore.push(["ID", output.secretstore.id]);

  aws.push(["Kinesis Stream Name", output.kinesis_stream.name]);
  aws.push(["Kinesis Stream ARN", output.kinesis_stream.arn]);
  aws.push(["S3 Bucket Name", output.s3_bucket.name]);
  aws.push(["S3 Bucket ARN", output.s3_bucket.arn]);
  aws.push(["S3 Domain Name", output.s3_bucket.bucket_domain_name]);
  aws.push(["IAM Role Name", output.iam_role.name]);
  aws.push(["IAM Role ARN", output.iam_role.arn]);

  const services: Record<string, Array<[string, string]>> = {
    Compute: compute,
    CDN: cdn,
    Configstore: configstore,
    Secretstore: secretstore,
    AWS: aws,
  };

  const borderChar = "═";
  const maxWidth = 90;
  const topBorder = "╔" + borderChar.repeat(maxWidth - 2) + "╗";
  const bottomBorder = "╚" + borderChar.repeat(maxWidth - 2) + "╝";
  const sideBorder = "║";

  console.log(topBorder);

  const instanceIdHeading = ` Instance ID: ${output.instance_id} `;
  const instanceIdPadded = instanceIdHeading
    .padEnd(maxWidth - 2)
    .padStart(Math.floor((maxWidth - 2 + instanceIdHeading.length) / 2));
  console.log(sideBorder + instanceIdPadded + sideBorder);
  console.log(sideBorder + "─".repeat(maxWidth - 2) + sideBorder);

  Object.entries(services).forEach(([serviceName, values], index) => {
    if (values.length > 0) {
      const heading = ` ${serviceName} `;
      const headingPadded = heading
        .padEnd(maxWidth - 2)
        .padStart(Math.floor((maxWidth - 2 + heading.length) / 2));
      console.log(sideBorder + headingPadded + sideBorder);
      console.log(sideBorder + "─".repeat(maxWidth - 2) + sideBorder);

      values.forEach(([key, value]) => {
        const line = `  ${key}: ${value}`;
        const padding = maxWidth - 2 - line.length;
        console.log(
          sideBorder + line + " ".repeat(Math.max(0, padding)) + sideBorder,
        );
      });

      if (index < Object.keys(services).length - 1) {
        console.log(sideBorder + "─".repeat(maxWidth - 2) + sideBorder);
      }
    }
  });

  console.log(bottomBorder);
};