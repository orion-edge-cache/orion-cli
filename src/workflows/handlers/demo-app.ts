/**
 * Demo App Deployment Handler
 * 
 * Handles deploying the demo GraphQL app to AWS Lambda
 * to provide users with a GraphQL endpoint for testing Orion.
 */

import { spinner, log, confirm, isCancel, select, text } from "@clack/prompts";
import {
  deployDemoApp,
  destroyDemoApp,
  getDemoAppStatus,
  checkDemoAppDeployed,
  type DemoAppConfig,
  type DemoAppOutputs,
  type ProgressEvent,
} from "@orion/demo-app";

interface AwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  useEnv: boolean;
}

/**
 * Prompt for AWS credentials (simplified version for demo app - no Fastly needed)
 */
async function promptForAwsCredentials(): Promise<AwsCredentials | null> {
  // Check for environment credentials
  const hasEnvAws = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
  const envRegion = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1";

  if (hasEnvAws) {
    const useEnv = await confirm({
      message: "AWS credentials detected in environment. Use these?",
      initialValue: true,
    });

    if (isCancel(useEnv)) return null;

    if (useEnv) {
      // Confirm region
      const useDefaultRegion = await confirm({
        message: `Use AWS region: ${envRegion}?`,
        initialValue: true,
      });

      if (isCancel(useDefaultRegion)) return null;

      let region = envRegion;
      if (!useDefaultRegion) {
        const customRegion = await text({
          message: "Enter AWS region:",
          placeholder: "us-west-2",
        });
        if (isCancel(customRegion)) return null;
        region = customRegion as string;
      }

      return {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        region,
        useEnv: true,
      };
    }
  }

  // Manual entry
  log.info("Please enter your AWS credentials:");

  const accessKeyId = await text({
    message: "AWS Access Key ID:",
    validate(value) {
      if (!value.trim()) return "Access Key ID is required";
    },
  });
  if (isCancel(accessKeyId)) return null;

  const secretAccessKey = await text({
    message: "AWS Secret Access Key:",
    validate(value) {
      if (!value.trim()) return "Secret Access Key is required";
    },
  });
  if (isCancel(secretAccessKey)) return null;

  const region = await text({
    message: "AWS Region:",
    initialValue: "us-east-1",
    validate(value) {
      if (!value.trim()) return "Region is required";
    },
  });
  if (isCancel(region)) return null;

  return {
    accessKeyId: accessKeyId as string,
    secretAccessKey: secretAccessKey as string,
    region: region as string,
    useEnv: false,
  };
}

/**
 * Handle deploying the demo app
 */
export async function handleDeployDemoApp(): Promise<DemoAppOutputs | null> {
  // Check if already deployed
  const status = await getDemoAppStatus();
  
  if (status.deployed && status.outputs) {
    log.info("Demo app is already deployed:");
    log.info(`  GraphQL Endpoint: ${status.outputs.graphqlEndpoint}`);
    log.info(`  React App: ${status.outputs.s3WebsiteUrl}`);
    
    const redeploy = await confirm({
      message: "Redeploy the demo app?",
      initialValue: false,
    });

    if (isCancel(redeploy) || !redeploy) {
      return status.outputs;
    }
  }

  // Get AWS credentials
  const awsCreds = await promptForAwsCredentials();
  if (!awsCreds) return null;

  const s = spinner();
  
  try {
    const config: DemoAppConfig = {
      aws: {
        accessKeyId: awsCreds.useEnv ? undefined : awsCreds.accessKeyId,
        secretAccessKey: awsCreds.useEnv ? undefined : awsCreds.secretAccessKey,
        region: awsCreds.region,
        useEnv: awsCreds.useEnv,
      },
    };

    s.start("Deploying demo app...");
    
    const outputs = await deployDemoApp(config, (event: ProgressEvent) => {
      s.message(`${event.message}`);
    });

    s.stop("Demo app deployed!");

    log.success("\nDemo App Deployment Complete!");
    log.info(`  GraphQL Endpoint: ${outputs.graphqlEndpoint}`);
    log.info(`  React App URL: ${outputs.s3WebsiteUrl}`);
    log.info(`  Lambda Function: ${outputs.lambdaFunctionName}`);
    log.info(`  S3 Bucket: ${outputs.clientBucket}`);
    log.info("");
    log.info("You can now create an edge cache using this GraphQL endpoint.");

    return outputs;
  } catch (error) {
    s.stop("Deployment failed");
    log.error((error as Error).message);
    return null;
  }
}

/**
 * Handle destroying the demo app
 */
export async function handleDestroyDemoApp(): Promise<boolean> {
  if (!checkDemoAppDeployed()) {
    log.info("No demo app deployment found.");
    return true;
  }

  const status = await getDemoAppStatus();
  
  if (status.outputs) {
    log.info("Current demo app deployment:");
    log.info(`  GraphQL Endpoint: ${status.outputs.graphqlEndpoint}`);
    log.info(`  React App: ${status.outputs.s3WebsiteUrl}`);
  }

  const confirmDestroy = await confirm({
    message: "Are you sure you want to destroy the demo app?",
    initialValue: false,
  });

  if (isCancel(confirmDestroy) || !confirmDestroy) {
    return false;
  }

  // Get AWS credentials for destroy
  const awsCreds = await promptForAwsCredentials();
  if (!awsCreds) return false;

  const s = spinner();
  
  try {
    const config: DemoAppConfig = {
      aws: {
        accessKeyId: awsCreds.useEnv ? undefined : awsCreds.accessKeyId,
        secretAccessKey: awsCreds.useEnv ? undefined : awsCreds.secretAccessKey,
        region: awsCreds.region,
        useEnv: awsCreds.useEnv,
      },
    };

    s.start("Destroying demo app...");
    
    await destroyDemoApp(config, (event: ProgressEvent) => {
      s.message(`${event.message}`);
    });

    s.stop("Demo app destroyed!");
    log.success("Demo app resources have been removed.");
    return true;
  } catch (error) {
    s.stop("Destroy failed");
    log.error((error as Error).message);
    return false;
  }
}
