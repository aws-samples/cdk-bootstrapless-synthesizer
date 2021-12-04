import * as fs from 'fs';
import * as cxschema from '@aws-cdk/cloud-assembly-schema';
import { FileAssetPackaging, Stack, App } from '@aws-cdk/core';
import * as cxapi from '@aws-cdk/cx-api';
import { BootstraplessStackSynthesizer, BootstraplessStackSynthesizerProps } from '../src';

beforeEach(() => {
  delete process.env.BSS_FILE_ASSET_BUCKET_NAME;
  delete process.env.BSS_IMAGE_ASSET_REPOSITORY_NAME;
  delete process.env.BSS_FILE_ASSET_PUBLISHING_ROLE_ARN;
  delete process.env.BSS_IMAGE_ASSET_PUBLISHING_ROLE_ARN;
  delete process.env.BSS_FILE_ASSET_PREFIX;
  delete process.env.BSS_FILE_ASSET_REGION_SET;
  delete process.env.BSS_TEMPLATE_BUCKET_NAME;
  delete process.env.BSS_IMAGE_ASSET_TAG_PREFIX;
  delete process.env.BSS_IMAGE_ASSET_REGION_SET;
  delete process.env.BSS_IMAGE_ASSET_ACCOUNT_ID;
});

test('default manifest json', () => {
  const stack = new Stack();
  const synthesizer = new BootstraplessStackSynthesizer();
  synthesizer.bind(stack);
  const json = JSON.parse(synthesizer.dumps());

  expect(json.files).toEqual({});
  expect(json.dockerImages).toEqual({});
});

test('assertBound for stack', () => {
  const synthesizer = new BootstraplessStackSynthesizer();

  expect(() => {
    synthesizer.addFileAsset({
      fileName: __filename,
      packaging: FileAssetPackaging.FILE,
      sourceHash: 'abcdef',
    });
  }).toThrow('You must call bind');
});

test('assertBound for bucketName and repositoryName', () => {
  const stack = new Stack();
  const synthesizer = new BootstraplessStackSynthesizer();
  synthesizer.bind(stack);

  expect(() => {
    synthesizer.addFileAsset({
      fileName: __filename,
      packaging: FileAssetPackaging.FILE,
      sourceHash: 'abcdef',
    });
  }).toThrow('The bucketName is null');

  expect(() => {
    synthesizer.addDockerImageAsset({
      directoryName: __dirname,
      sourceHash: 'abcdef',
    });
  }).toThrow('The repositoryName is null');
});


test('addFileAsset', () => {
  const stack = new Stack();
  const synthesizer = new BootstraplessStackSynthesizer({
    fileAssetBucketName: 'test-bucket-name',
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

test.each([
  () => mksynthzer({ fileAssetBucketName: 'test-bucket-name', fileAssetPrefix: 'test-prefix/' }),
  () => mksynthzer({ fileAssetBucketName: 'test-bucket-name' }, { BSS_FILE_ASSET_PREFIX: 'test-prefix/' }),
])('#%# addFileAsset when fileAssetsPrefix is set', (mksynthzerFn) => {
  const stack = new Stack();
  const synthesizer = mksynthzerFn();
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


test.each([
  () => mksynthzer({ fileAssetBucketName: 'test-bucket-name', fileAssetRegionSet: ['us-east-1', 'us-west-1', '', ' '] }),
  () => mksynthzer({ fileAssetBucketName: 'test-bucket-name' }, { BSS_FILE_ASSET_REGION_SET: 'us-east-1, us-west-1, , ,' }),
])('#%# addFileAsset when fileAssetsRegionSet is set but fileAssetsBucketName doesn\'t contains ${AWS::Region}', (mksynthzerFn) => {
  const stack = new Stack();
  const synthesizer = mksynthzerFn();
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

test.each([
  () => mksynthzer({ fileAssetBucketName: 'test-bucket-name-${AWS::Region}', fileAssetRegionSet: ['us-east-1', 'us-west-1', '', ' '] }),
  () => mksynthzer({ fileAssetBucketName: 'test-bucket-name-${AWS::Region}' }, { BSS_FILE_ASSET_REGION_SET: 'us-east-1, us-west-1, , ,' }),
])('#%# addFileAsset when fileAssetsRegionSet is set and fileAssetsBucketName contains ${AWS::Region}', (mksynthzerFn) => {
  const stack = new Stack();
  const synthesizer = mksynthzerFn();
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


test.each([
  () => mksynthzer({ fileAssetBucketName: 'test-bucket-name-${AWS::Region}' }),
  () => mksynthzer({}, { BSS_FILE_ASSET_BUCKET_NAME: 'test-bucket-name-${AWS::Region}' }),
])('#%# addFileAsset when fileAssetsBucketName contains ${AWS::Region}', (mksynthzerFn) => {
  const stack = new Stack();
  const synthesizer = mksynthzerFn();
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


test.each([
  () => mksynthzer({ imageAssetRepositoryName: 'the-repo' }),
  () => mksynthzer({}, { BSS_IMAGE_ASSET_REPOSITORY_NAME: 'the-repo' }),
])('#%# addDockerImageAsset', (mksynthzerFn) => {
  const stack = new Stack();
  const synthesizer = mksynthzerFn();
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


test.each([
  () => mksynthzer({ imageAssetRepositoryName: 'the-repo', imageAssetTagPrefix: 'latest-' }),
  () => mksynthzer({}, { BSS_IMAGE_ASSET_REPOSITORY_NAME: 'the-repo', BSS_IMAGE_ASSET_TAG_PREFIX: 'latest-' }),
])('#%# addDockerImageAsset when imageAssetTagPrefix is specified', (mksynthzerFn) => {
  const stack = new Stack();
  const synthesizer = mksynthzerFn();
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
      imageTag: 'latest-abcdef',
    },
  });
  expect(json.files).toEqual({});
});


test.each([
  () => mksynthzer({ imageAssetRepositoryName: 'the-repo', imageAssetRegionSet: ['us-west-1'] }),
  () => mksynthzer({}, { BSS_IMAGE_ASSET_REPOSITORY_NAME: 'the-repo', BSS_IMAGE_ASSET_REGION_SET: 'us-west-1' }),
])('#%# addDockerImageAsset when imageAssetsRegionSet is specified', (mksynthzerFn) => {
  const stack = new Stack();
  const synthesizer = mksynthzerFn();
  synthesizer.bind(stack);
  const location = synthesizer.addDockerImageAsset({
    directoryName: __dirname,
    sourceHash: 'abcdef',
  });
  const json = JSON.parse(synthesizer.dumps());

  expect(stack.resolve(location.imageUri)).toEqual({
    'Fn::Sub': '${AWS::AccountId}.dkr.ecr.${AWS::Region}.${AWS::URLSuffix}/the-repo:abcdef',
  });
  expect(json.dockerImages.abcdef.source).toEqual({
    directory: __dirname,
  });
  expect(json.dockerImages.abcdef.destinations).toEqual({
    'us-west-1': {
      repositoryName: 'the-repo',
      imageTag: 'abcdef',
      region: 'us-west-1',
    },
  });
  expect(json.files).toEqual({});
});

test.each([
  () => mksynthzer({ imageAssetRepositoryName: 'the-repo', imageAssetAccountId: '1234567890' }),
  () => mksynthzer({}, { BSS_IMAGE_ASSET_REPOSITORY_NAME: 'the-repo', BSS_IMAGE_ASSET_ACCOUNT_ID: '1234567890' }),
])('#%# addDockerImageAsset when imageAssetsAccountId is specified', (mksynthzerFn) => {
  const stack = new Stack();
  const synthesizer = mksynthzerFn();
  synthesizer.bind(stack);
  const location = synthesizer.addDockerImageAsset({
    directoryName: __dirname,
    sourceHash: 'abcdef',
  });
  const json = JSON.parse(synthesizer.dumps());

  expect(stack.resolve(location.imageUri)).toEqual({
    'Fn::Sub': '1234567890.dkr.ecr.${AWS::Region}.${AWS::URLSuffix}/the-repo:abcdef',
  });
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

test('synth', () => {
  const myapp = new App();
  const mystack = new Stack(myapp, 'mystack', {
    synthesizer: new BootstraplessStackSynthesizer({
      fileAssetBucketName: 'file-asset-bucket',
      fileAssetPublishingRoleArn: 'file:role:arn',
      templateBucketName: 'template-bucket',

      imageAssetRepositoryName: 'image-ecr-repository',
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

  expect(manifest.files?.['mystack.template.json']?.source).toEqual({
    path: 'mystack.template.json',
    packaging: 'file',
  });
  expect(manifest.files?.['mystack.template.json']?.destinations).toEqual({
    'current_account-current_region': {
      bucketName: 'template-bucket',
      objectKey: 'mystack.template.json',
      assumeRoleArn: 'file:role:arn',
    },
  });
  expect(manifest.files?.['file-asset-hash']?.source).toEqual({
    path: __filename,
    packaging: FileAssetPackaging.FILE,
  });
  expect(manifest.files?.['file-asset-hash']?.destinations).toEqual({
    'current_account-current_region': {
      bucketName: 'file-asset-bucket',
      objectKey: 'file-asset-hash',
      assumeRoleArn: 'file:role:arn',
    },
  });
  expect(manifest.dockerImages?.['docker-asset-hash']?.source).toEqual({
    directory: __dirname,
  });
  expect(manifest.dockerImages?.['docker-asset-hash']?.destinations).toEqual({
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

function mksynthzer(props: BootstraplessStackSynthesizerProps, env?: {[key: string]: string}): BootstraplessStackSynthesizer {
  if (env) {
    for (const key in env) {
      process.env[key] = env[key];
    }
  }
  return new BootstraplessStackSynthesizer(props);
}
