![Release](https://github.com/wchaws/cdk-bootstrapless-synthesizer/workflows/Release/badge.svg)

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