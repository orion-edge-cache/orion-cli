import fs from "fs";
import { ORION_CONFIG_DIR } from "./constants";
import type { TerraformOutput } from "@orion/infra";
import type { UnwrappedTerraformOutput } from "./types";

export const ensureOrionConfigDir = () => {
  if (!fs.existsSync(ORION_CONFIG_DIR)) {
    fs.mkdirSync(ORION_CONFIG_DIR, { recursive: true });
  }
};

/**
 * Unwrap terraform output from { value: ... } format to direct values
 */
export const unwrapTerraformOutput = (
  output: TerraformOutput
): UnwrappedTerraformOutput => {
  return {
    instance_id: output.instance_id.value,
    compute_service: output.compute_service.value,
    cdn_service: output.cdn_service.value,
    configstore: output.configstore.value,
    secretstore: output.secretstore.value,
    kinesis_stream: output.kinesis_stream.value,
    s3_bucket: output.s3_bucket.value,
    iam_role: output.iam_role.value,
  };
};