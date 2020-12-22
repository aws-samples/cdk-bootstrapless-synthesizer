# my project

sample

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