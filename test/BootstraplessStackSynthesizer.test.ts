import * as fs from 'fs';
import * as cxschema from '@aws-cdk/cloud-assembly-schema';
import { FileAssetPackaging, Stack, App } from '@aws-cdk/core';
import * as cxapi from '@aws-cdk/cx-api';
import { BootstraplessStackSynthesizer } from '../src';


test('default manifest json', () => {
  const stack = new Stack();
  const synthesizer = new BootstraplessStackSynthesizer();
  synthesizer.bind(stack);
  const json = JSON.parse(synthesizer.dumps());

  expect(json.files).toEqual({});
  expect(json.dockerImages).toEqual({});
});


test('addFileAsset', () => {
  const stack = new Stack();
  const synthesizer = new BootstraplessStackSynthesizer({
    fileAssetsBucketName: 'test-bucket-name',
  });
  synthesizer.bind(stack);
  synthesizer.addFileAsset({
    fileName: __filename,
    packaging: FileAssetPackaging.FILE,
    sourceHash: 'abcdef',
  });
  const json = JSON.parse(synthesizer.dumps());

  expect(json.files.abcdef.source).toEqual({
    path: __filename,
    packaging: FileAssetPackaging.FILE,
  });
  expect(json.files.abcdef.destinations).toEqual({
    'current_account-current_region': {
      bucketName: 'test-bucket-name',
      objectKey: 'abcdef',
    },
  });
  expect(json.dockerImages).toEqual({});
});

test('addFileAsset when fileAssetsPrefix is set', () => {
  const stack = new Stack();
  const synthesizer = new BootstraplessStackSynthesizer({
    fileAssetsBucketName: 'test-bucket-name',
    fileAssetsPrefix: 'test-prefix/',
  });
  synthesizer.bind(stack);
  synthesizer.addFileAsset({
    fileName: __filename,
    packaging: FileAssetPackaging.FILE,
    sourceHash: 'abcdef',
  });
  const json = JSON.parse(synthesizer.dumps());

  expect(json.files.abcdef.source).toEqual({
    path: __filename,
    packaging: FileAssetPackaging.FILE,
  });
  expect(json.files.abcdef.destinations).toEqual({
    'current_account-current_region': {
      bucketName: 'test-bucket-name',
      objectKey: 'test-prefix/abcdef',
    },
  });
  expect(json.dockerImages).toEqual({});
});


test('addFileAsset when fileAssetsRegionSet is set but fileAssetsBucketName doesn\'t contains ${AWS::Region}', () => {
  const stack = new Stack();
  const synthesizer = new BootstraplessStackSynthesizer({
    fileAssetsBucketName: 'test-bucket-name',
    fileAssetsRegionSet: ['us-east-1', 'us-west-1'],
  });
  synthesizer.bind(stack);
  synthesizer.addFileAsset({
    fileName: __filename,
    packaging: FileAssetPackaging.FILE,
    sourceHash: 'abcdef',
  });
  const json = JSON.parse(synthesizer.dumps());


  expect(json.files.abcdef.source).toEqual({
    path: __filename,
    packaging: FileAssetPackaging.FILE,
  });
  expect(json.files.abcdef.destinations).toEqual({
    'current_account-current_region': {
      bucketName: 'test-bucket-name',
      objectKey: 'abcdef',
    },
  });
  expect(json.dockerImages).toEqual({});
});


test('addFileAsset when fileAssetsRegionSet is set and fileAssetsBucketName contains ${AWS::Region}', () => {
  const stack = new Stack();
  const synthesizer = new BootstraplessStackSynthesizer({
    fileAssetsBucketName: 'test-bucket-name-${AWS::Region}',
    fileAssetsRegionSet: ['us-east-1', 'us-west-1'],
  });
  synthesizer.bind(stack);
  const location = synthesizer.addFileAsset({
    fileName: __filename,
    packaging: FileAssetPackaging.FILE,
    sourceHash: 'abcdef',
  });
  const json = JSON.parse(synthesizer.dumps());


  expect(stack.resolve(location.s3ObjectUrl)).toEqual({ 'Fn::Sub': 's3://test-bucket-name-${AWS::Region}/abcdef' });
  expect(stack.resolve(location.bucketName)).toEqual({ 'Fn::Sub': 'test-bucket-name-${AWS::Region}' });
  expect(json.files.abcdef.source).toEqual({
    path: __filename,
    packaging: FileAssetPackaging.FILE,
  });
  expect(json.files.abcdef.destinations).toEqual({
    'us-east-1': {
      bucketName: 'test-bucket-name-us-east-1',
      objectKey: 'abcdef',
      region: 'us-east-1',
    },
    'us-west-1': {
      bucketName: 'test-bucket-name-us-west-1',
      objectKey: 'abcdef',
      region: 'us-west-1',
    },
  });
  expect(json.dockerImages).toEqual({});
});


test('addFileAsset when fileAssetsBucketName contains ${AWS::Region}', () => {
  const stack = new Stack();
  const synthesizer = new BootstraplessStackSynthesizer({
    fileAssetsBucketName: 'test-bucket-name-${AWS::Region}',
  });
  synthesizer.bind(stack);
  const location = synthesizer.addFileAsset({
    fileName: __filename,
    packaging: FileAssetPackaging.FILE,
    sourceHash: 'abcdef',
  });
  const json = JSON.parse(synthesizer.dumps());


  expect(stack.resolve(location.s3ObjectUrl)).toEqual({ 'Fn::Sub': 's3://test-bucket-name-${AWS::Region}/abcdef' });
  expect(stack.resolve(location.bucketName)).toEqual({ 'Fn::Sub': 'test-bucket-name-${AWS::Region}' });
  expect(json.files.abcdef.source).toEqual({
    path: __filename,
    packaging: FileAssetPackaging.FILE,
  });
  expect(json.files.abcdef.destinations).toEqual({
    'current_account-current_region': {
      bucketName: 'test-bucket-name-${AWS::Region}',
      objectKey: 'abcdef',
    },
  });
  expect(json.dockerImages).toEqual({});
});


test('addDockerImageAsset', () => {
  const stack = new Stack();
  const synthesizer = new BootstraplessStackSynthesizer({
    imageAssetsRepositoryName: 'the-repo',
  });
  synthesizer.bind(stack);
  synthesizer.addDockerImageAsset({
    directoryName: __dirname,
    sourceHash: 'abcdef',
  });
  const json = JSON.parse(synthesizer.dumps());

  expect(json.dockerImages.abcdef.source).toEqual({
    directory: __dirname,
  });
  expect(json.dockerImages.abcdef.destinations).toEqual({
    'current_account-current_region': {
      repositoryName: 'the-repo',
      imageTag: 'abcdef',
    },
  });
  expect(json.files).toEqual({});
});

test('addDockerImageAsset when imageAssetsTag is specified', () => {
  const stack = new Stack();
  const synthesizer = new BootstraplessStackSynthesizer({
    imageAssetsRepositoryName: 'the-repo',
    imageAssetsTag: 'latest',
  });
  synthesizer.bind(stack);
  synthesizer.addDockerImageAsset({
    directoryName: __dirname,
    sourceHash: 'abcdef',
  });
  const json = JSON.parse(synthesizer.dumps());

  expect(json.dockerImages.abcdef.source).toEqual({
    directory: __dirname,
  });
  expect(json.dockerImages.abcdef.destinations).toEqual({
    'current_account-current_region': {
      repositoryName: 'the-repo',
      imageTag: 'latest',
    },
  });
  expect(json.files).toEqual({});
});

test('synth', () => {
  const myapp = new App();
  const mystack = new Stack(myapp, 'mystack', {
    synthesizer: new BootstraplessStackSynthesizer({
      fileAssetsBucketName: 'file-asset-bucket',
      fileAssetPublishingRoleArn: 'file:role:arn',
      templateBucketName: 'template-bucket',

      imageAssetsRepositoryName: 'image-ecr-repository',
      imageAssetPublishingRoleArn: 'image:role:arn',
    }),
  });

  mystack.synthesizer.addFileAsset({
    fileName: __filename,
    packaging: FileAssetPackaging.FILE,
    sourceHash: 'file-asset-hash',
  });
  mystack.synthesizer.addDockerImageAsset({
    directoryName: __dirname,
    sourceHash: 'docker-asset-hash',
  });
  const asm = myapp.synth();
  const manifest = readAssetManifest(asm);

  expect(manifest?.files['mystack.template.json'].source).toEqual({
    path: 'mystack.template.json',
    packaging: 'file',
  });
  expect(manifest?.files['mystack.template.json'].destinations).toEqual({
    'current_account-current_region': {
      bucketName: 'template-bucket',
      objectKey: 'mystack.template.json',
      assumeRoleArn: 'file:role:arn',
    },
  });
  expect(manifest?.files['file-asset-hash'].source).toEqual({
    path: __filename,
    packaging: FileAssetPackaging.FILE,
  });
  expect(manifest?.files['file-asset-hash'].destinations).toEqual({
    'current_account-current_region': {
      bucketName: 'file-asset-bucket',
      objectKey: 'file-asset-hash',
      assumeRoleArn: 'file:role:arn',
    },
  });
  expect(manifest?.dockerImages['docker-asset-hash'].source).toEqual({
    directory: __dirname,
  });
  expect(manifest?.dockerImages['docker-asset-hash'].destinations).toEqual({
    'current_account-current_region': {
      repositoryName: 'image-ecr-repository',
      imageTag: 'docker-asset-hash',
      assumeRoleArn: 'image:role:arn',
    },
  });
});

// const CFN_CONTEXT = {
//   'AWS::Region': 'the_region',
//   'AWS::AccountId': 'the_account',
//   'AWS::URLSuffix': 'domain.aws',
// };


function isAssetManifest(x: cxapi.CloudArtifact): x is cxapi.AssetManifestArtifact {
  return x instanceof cxapi.AssetManifestArtifact;
}


function readAssetManifest(asm: cxapi.CloudAssembly): cxschema.AssetManifest {
  const manifestArtifact = asm.artifacts.filter(isAssetManifest)[0];
  if (!manifestArtifact) { throw new Error('no asset manifest in assembly'); }

  return JSON.parse(fs.readFileSync(manifestArtifact.file, { encoding: 'utf-8' }));
}
