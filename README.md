# cdk-bootstrapless-synthesizer

[![npm version](https://img.shields.io/npm/v/cdk-bootstrapless-synthesizer)](https://www.npmjs.com/package/cdk-bootstrapless-synthesizer)
[![PyPI](https://img.shields.io/pypi/v/cdk-bootstrapless-synthesizer)](https://pypi.org/project/cdk-bootstrapless-synthesizer)
[![npm](https://img.shields.io/npm/dw/cdk-bootstrapless-synthesizer?label=npm%20downloads)](https://www.npmjs.com/package/cdk-bootstrapless-synthesizer)
[![PyPI - Downloads](https://img.shields.io/pypi/dw/cdk-bootstrapless-synthesizer?label=pypi%20downloads)](https://pypi.org/project/cdk-bootstrapless-synthesizer)

A bootstrapless stack synthesizer that is designated to generate templates that can be directly used by AWS CloudFormation.

Please use ^1.0.0 for cdk version 1.x.x, use ^2.0.0 for cdk version 2.x.x

## Usage
```ts
import { BootstraplessStackSynthesizer } from 'cdk-bootstrapless-synthesizer';
```
<small>[main.ts](sample/src/main.ts)</small>
```ts
function OverrideRepositoryAccount(scope: Construct, id: string, repo: IRepository): IRepository {
  class Import extends RepositoryBase {
    public repositoryName = repo.repositoryName;
    public repositoryArn = Repository.arnForLocalRepository(repo.repositoryName, scope, env.BSS_IMAGE_ASSET_ACCOUNT_ID);

    public addToResourcePolicy(_statement: iam.PolicyStatement): iam.AddToResourcePolicyResult {
      // dropped
      return { statementAdded: false };
    }
  }

  return new Import(scope, id);
}

function WithCrossAccount(image: DockerImageAsset): DockerImageAsset {
  image.repository = OverrideRepositoryAccount(image, 'CrossAccountRepo', image.repository);
  return image;
}


class StandardDockerImage extends DockerImage {
  private readonly allowAnyEcrImagePull: boolean;
  private readonly imageUri: string;
  private readonly repository?: IRepository;

  constructor(opts: { allowAnyEcrImagePull?: boolean; imageUri: string; repository?: IRepository }) {
    super();

    this.allowAnyEcrImagePull = !!opts.allowAnyEcrImagePull;
    this.imageUri = opts.imageUri;
    this.repository = opts.repository;
  }

  public bind(task: ISageMakerTask): DockerImageConfig {
    if (this.repository) {
      this.repository.grantPull(task);
    }
    if (this.allowAnyEcrImagePull) {
      task.grantPrincipal.addToPrincipalPolicy(new iam.PolicyStatement({
        actions: [
          'ecr:BatchCheckLayerAvailability',
          'ecr:GetDownloadUrlForLayer',
          'ecr:BatchGetImage',
        ],
        resources: ['*'],
      }));
    }
    return {
      imageUri: this.imageUri,
    };
  }
}

function fromAsset(scope: Construct, id: string, props: DockerImageAssetProps): DockerImage {
  const asset = WithCrossAccount(new DockerImageAsset(scope, id, props));
  return new StandardDockerImage({ repository: asset.repository, imageUri: asset.imageUri });
}
```
<small>[main.ts](sample/src/main.ts)</small>
```ts
const app = new App();

new MyStack(app, 'my-stack-dev', {
  synthesizer: new BootstraplessStackSynthesizer({
    templateBucketName: 'cfn-template-bucket',

    fileAssetBucketName: 'file-asset-bucket-${AWS::Region}',
    fileAssetRegionSet: ['us-west-1', 'us-west-2'],
    fileAssetPrefix: 'file-asset-prefix/latest/',

    imageAssetRepositoryName: 'your-ecr-repo-name',
    imageAssetAccountId: '1234567890',
    imageAssetTagPrefix: 'latest-',
    imageAssetRegionSet: ['us-west-1', 'us-west-2'],
  }),
});

// Or by environment variables
env.BSS_TEMPLATE_BUCKET_NAME = 'cfn-template-bucket';

env.BSS_FILE_ASSET_BUCKET_NAME = 'file-asset-bucket-\${AWS::Region}';
env.BSS_FILE_ASSET_REGION_SET = 'us-west-1,us-west-2';
env.BSS_FILE_ASSET_PREFIX = 'file-asset-prefix/latest/';

env.BSS_IMAGE_ASSET_REPOSITORY_NAME = 'your-ecr-repo-name';
env.BSS_IMAGE_ASSET_ACCOUNT_ID = '1234567890';
env.BSS_IMAGE_ASSET_TAG_PREFIX = 'latest-';
env.BSS_IMAGE_ASSET_REGION_SET = 'us-west-1,us-west-2';

new MyStack(app, 'my-stack-dev2', {
  synthesizer: new BootstraplessStackSynthesizer(),
});

// use Aspect to grant the role to pull ECR repository from account BSS_IMAGE_ASSET_ACCOUNT_ID
```
<small>[main.ts](sample/src/main.ts)</small>

Synth AWS CloudFormation templates, assets and upload them

```shell
$ cdk synth
$ npx cdk-assets publish -p cdk.out/my-stack-dev.assets.json -v
```
## Limitations
When using `BSS_IMAGE_ASSET_ACCOUNT_ID` to push ECR repository to shared account, you need use `Aspect` to grant the role with policy to pull the repository from cross account.

Currently only below scenarios are supported,

- ECS
- SageMaker training job integrated with Step Functions

For other scenarios, the feature request or pull request are welcome.
## Sample Project

See [Sample Project](./sample/README.md)

## API Reference

See [API Reference](./API.md) for API details.
