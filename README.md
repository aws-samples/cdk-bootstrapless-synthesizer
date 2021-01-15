![Release](https://github.com/wchaws/cdk-bootstrapless-synthesizer/workflows/Release/badge.svg)
[![npm version](https://img.shields.io/npm/v/cdk-bootstrapless-synthesizer)](https://www.npmjs.com/package/cdk-bootstrapless-synthesizer)
[![downloads](https://img.shields.io/npm/dw/cdk-bootstrapless-synthesizer)](https://www.npmjs.com/package/cdk-bootstrapless-synthesizer)
[![codecov](https://codecov.io/gh/wchaws/cdk-bootstrapless-synthesizer/branch/main/graph/badge.svg?token=08UOSTIYLZ)](https://codecov.io/gh/wchaws/cdk-bootstrapless-synthesizer)

# cdk-bootstrapless-synthesizer

A Bootstrapless stack synthesizer that is designated to generate templates that can be directly used by Cloudformation

## Usage

In cdk source code

```ts
import { BootstraplessStackSynthesizer } from 'cdk-bootstrapless-synthesizer';

// ...
const app = new cdk.App();
new MyWidgetServiceStack(app, 'MyWidgetServiceStack', {
  synthesizer: new BootstraplessStackSynthesizer({
    templateBucketName: 'cfn-template-bucket',
    imageAssetRepositoryName: 'ecr-repo-name',

    fileAssetBucketName: 'file-asset-bucket-${AWS::Region}',
    fileAssetRegionSet: ['us-east-1'],
    fileAssetPrefix: 'file-asset-prefix/latest/',

    imageAssetTag: 'docker-image-tag',
    imageAssetRegion: 'us-east-1',
    imageAssetAccountId: '1234567890',
  })
});
```

Synth cloudformation templates, assets and upload them

```shell
$ cdk synth
$ npx cdk-assets publish -p cdk.out/MyWidgetServiceStack.assets.json -v
```

## Sample Project

See [Sample Project](./sample/README.md)

## API Reference

See [API Reference](./API.md) for API details.