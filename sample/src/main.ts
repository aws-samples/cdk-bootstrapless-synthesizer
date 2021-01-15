import { App } from '@aws-cdk/core';
import { BootstraplessStackSynthesizer } from 'cdk-bootstrapless-synthesizer';
import { MyStack } from './stack';

const app = new App();

new MyStack(app, 'MyStack', {
  synthesizer: new BootstraplessStackSynthesizer({
    templateBucketName: 'cfn-template-bucket',

    fileAssetBucketName: 'file-asset-bucket-${AWS::Region}',
    fileAssetRegionSet: ['us-east-1', 'us-west-1'],
    fileAssetPrefix: 'file-asset-prefix/latest/'
  }),
});

app.synth();
