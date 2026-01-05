export interface Domain {
  url: string;
  protocol: string;
  port: number;
  hostOverride: string;
}

// Unwrapped TerraformOutput for easier CLI use
// The raw terraform output JSON wraps each value in { value: ... }
// This interface represents the unwrapped version for display and logic
export interface UnwrappedTerraformOutput {
  instance_id: string;
  compute_service: {
    domain_name: string;
    id: string;
    name: string;
    backend_domain: string;
    backend_port: number;
    backend_protocol: string;
    backend_host_override: string;
  };
  cdn_service: {
    domain_name: string;
    id: string;
    name: string;
  };
  configstore: {
    name: string;
    id: string;
  };
  secretstore: {
    name: string;
    id: string;
  };
  kinesis_stream: {
    name: string;
    arn: string;
  };
  s3_bucket: {
    arn: string;
    name: string;
    bucket_domain_name: string;
  };
  iam_role: {
    arn: string;
    name: string;
  };
}