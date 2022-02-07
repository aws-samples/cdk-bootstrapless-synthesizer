import * as path from 'path';
import { HttpApi, HttpMethod, PayloadFormatVersion } from '@aws-cdk/aws-apigatewayv2-alpha';
import { HttpLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import { Stack, StackProps, CfnOutput, App, Aspects, Duration } from 'aws-cdk-lib';
import { DockerImageAsset } from 'aws-cdk-lib/aws-ecr-assets';
import { ContainerImage } from 'aws-cdk-lib/aws-ecs';
import { ApplicationLoadBalancedFargateService } from 'aws-cdk-lib/aws-ecs-patterns';
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { BootstraplessStackSynthesizer, CompositeECRRepositoryAspect } from 'cdk-bootstrapless-synthesizer';
import { Construct } from 'constructs';

export class AppStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    new ApplicationLoadBalancedFargateService(this, 'Service', {
      memoryLimitMiB: 512,
      cpu: 256,
      taskImageOptions: {
        image: ContainerImage.fromDockerImageAsset(new DockerImageAsset(this, 'BulkLoadGraphDataImage', {
          directory: path.join(__dirname, './app'),
        })),
      },
    });

    const echoFunc = new NodejsFunction(this, 'echo', {
      entry: path.join(__dirname, './lambda/index.ts'),
      handler: 'handler',
      bundling: {
        commandHooks: {
          beforeBundling(inputDir: string, outputDir: string): string[] {
            return [
              `cp ${inputDir}/src/lambda/msg.txt ${outputDir}`,
            ];
          },
          afterBundling(_inputDir: string, _outputDir: string): string[] {
            return [];
          },
          beforeInstall() {
            return [];
          },
        },
      },
      architecture: Architecture.ARM_64,
      timeout: Duration.seconds(5),
      memorySize: 128,
      runtime: Runtime.NODEJS_14_X,
    });

    const echoIntegration = new HttpLambdaIntegration('EchoIntegration', echoFunc, {
      payloadFormatVersion: PayloadFormatVersion.VERSION_1_0,
    });
    const httpApi = new HttpApi(this, 'HttpApi');
    httpApi.addRoutes({
      path: '/',
      methods: [HttpMethod.GET],
      integration: echoIntegration,
    });

    new CfnOutput(this, 'ApiUrl', {
      value: httpApi.apiEndpoint,
      description: 'url of api',
    });
  }
}

const app = new App();

new AppStack(app, 'AppStack', {
  synthesizer: synthesizer(),
});

if (process.env.USE_BSS) {
  Aspects.of(app).add(new CompositeECRRepositoryAspect());
}

function synthesizer() {
  return process.env.USE_BSS ? new BootstraplessStackSynthesizer(): undefined;
}
