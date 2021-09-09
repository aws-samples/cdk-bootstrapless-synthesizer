import * as path from 'path';
import * as cp from 'child_process';
import { DockerImageAsset } from '@aws-cdk/aws-ecr-assets';
import * as lambda from '@aws-cdk/aws-lambda';
import { App, CfnOutput, Construct, Stack, StackProps } from '@aws-cdk/core';
import { BootstraplessStackSynthesizer } from 'cdk-bootstrapless-synthesizer';


export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    const image = new DockerImageAsset(this, 'MyBuildImage', {
      directory: path.join(__dirname, '../docker'),
    });

    new CfnOutput(this, 'output', { value: image.imageUri });

    const p = path.join(__dirname, '../lambda/');

    console.log('lambda layer path', p);
    cp.execSync(`ls -al ${p}`);

    const layer = new lambda.LayerVersion(this, 'MyLayer', {
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/'), {
        bundling: {
          image: lambda.Runtime.NODEJS_12_X.bundlingImage,
          user: 'root',
          command: [
            'bash', '-xc', [
              'ls -al',
              'export npm_config_update_notifier=false',
              'export npm_config_cache=$(mktemp -d)', // https://github.com/aws/aws-cdk/issues/8707#issuecomment-757435414
              'cd $(mktemp -d)',
              'ls -al /asset-input/',
              'cp -v /asset-input/package*.json .',
              'npm i --only=prod',
              'mkdir -p /asset-output/nodejs/',
              'cp -au node_modules /asset-output/nodejs/',
            ].join('&&'),
          ],
        },
      }),
      compatibleRuntimes: [lambda.Runtime.NODEJS_12_X],
      description: 'A layer to test the L2 construct',
    });

    new lambda.Function(this, 'MyHandler', {
      runtime: lambda.Runtime.NODEJS_12_X,
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/src')),
      handler: 'index.handler',
      layers: [layer],
    });
  }
}

const app = new App();

new MyStack(app, 'my-stack-dev', {
  synthesizer: new BootstraplessStackSynthesizer({
    templateBucketName: 'cfn-template-bucket',

    fileAssetBucketName: 'file-asset-bucket-${AWS::Region}',
    fileAssetRegionSet: ['us-east-1', 'us-west-1'],
    fileAssetPrefix: 'file-asset-prefix/latest/',

    imageAssetRepositoryName: 'your-ecr-repo-name',
    imageAssetAccountId: '1234567890',
    imageAssetTag: 'latest',
  }),
});

app.synth();