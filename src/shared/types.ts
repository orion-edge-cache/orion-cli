export interface Domain {
  url: string;
  protocol: string;
  port: number;
  hostOverride: string;
}

export interface TerraformOutput {
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
    arn: string;
    name: string;
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