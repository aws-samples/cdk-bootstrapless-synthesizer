import { FileAssetPackaging, Stack } from '@aws-cdk/core';
import { BootstraplessStackSynthesizer } from '../src';


test('default manifest json', () => {
  const stack = new Stack();
  const synthesizer = new BootstraplessStackSynthesizer();
  synthesizer.bind(stack);
  const json = JSON.parse(synthesizer.dumps());

  expect(json.files).toEqual({});
  expect(json.dockerImages).toEqual({});
});


test('add addFileAsset', () => {
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

test('add addFileAsset when fileAssetsPrefix is set', () => {
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


test('add addFileAsset when fileAssetsRegionSet is set but fileAssetsBucketName doesn\'t contains ${AWS::Region}', () => {
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


test('add addFileAsset when fileAssetsRegionSet is set and fileAssetsBucketName contains ${AWS::Region}', () => {
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


test('add addFileAsset when fileAssetsBucketName contains ${AWS::Region}', () => {
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


// const CFN_CONTEXT = {
//   'AWS::Region': 'the_region',
//   'AWS::AccountId': 'the_account',
//   'AWS::URLSuffix': 'domain.aws',
// };
