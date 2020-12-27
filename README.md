![Release](https://github.com/wchaws/cdk-bootstrapless-synthesizer/workflows/Release/badge.svg)
[![npm version](https://img.shields.io/npm/v/cdk-bootstrapless-synthesizer)](https://www.npmjs.com/package/cdk-bootstrapless-synthesizer)
[![downloads](https://img.shields.io/npm/dw/cdk-bootstrapless-synthesizer)](https://www.npmjs.com/package/cdk-bootstrapless-synthesizer)

# cdk-bootstrapless-synthesizer

```ts
new MyWidgetServiceStack(app, 'MyWidgetServiceStack', {
  synthesizer: new BootstraplessStackSynthesizer({
    templateBucketName: 'prod-bucketname',
    imageAssetsRepositoryName: 'bootstrapless-synth',
    fileAssetsBucketName: 'prod-bucketname-${AWS::Region}',
    fileAssetsRegionSet: ['us-east-1'],
    fileAssetsPrefix: 'repo-name/latest/',
  })
});
```

## API Reference

See [API Reference](./API.md) for API details.