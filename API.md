# API Reference <a name="API Reference" id="api-reference"></a>


## Structs <a name="Structs" id="structs"></a>

### BootstraplessStackSynthesizerProps <a name="cdk-bootstrapless-synthesizer.BootstraplessStackSynthesizerProps" id="cdkbootstraplesssynthesizerbootstraplessstacksynthesizerprops"></a>

Configuration properties for BootstraplessStackSynthesizer.

#### Initializer <a name="[object Object].Initializer" id="object-objectinitializer"></a>

```typescript
import { BootstraplessStackSynthesizerProps } from 'cdk-bootstrapless-synthesizer'

const bootstraplessStackSynthesizerProps: BootstraplessStackSynthesizerProps = { ... }
```

#### Properties <a name="Properties" id="properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| [`fileAssetBucketName`](#cdkbootstraplesssynthesizerbootstraplessstacksynthesizerpropspropertyfileassetbucketname) | `string` | Name of the S3 bucket to hold file assets. |
| [`fileAssetPrefix`](#cdkbootstraplesssynthesizerbootstraplessstacksynthesizerpropspropertyfileassetprefix) | `string` | Object key prefix to use while storing S3 Assets. |
| [`fileAssetPublishingRoleArn`](#cdkbootstraplesssynthesizerbootstraplessstacksynthesizerpropspropertyfileassetpublishingrolearn) | `string` | The role to use to publish file assets to the S3 bucket in this environment. |
| [`fileAssetRegionSet`](#cdkbootstraplesssynthesizerbootstraplessstacksynthesizerpropspropertyfileassetregionset) | `string`[] | The regions set of file assets to be published only when `fileAssetBucketName` contains `${AWS::Region}`. |
| [`imageAssetAccountId`](#cdkbootstraplesssynthesizerbootstraplessstacksynthesizerpropspropertyimageassetaccountid) | `string` | Override the ECR repository account id of the Docker Image assets. |
| [`imageAssetPublishingRoleArn`](#cdkbootstraplesssynthesizerbootstraplessstacksynthesizerpropspropertyimageassetpublishingrolearn) | `string` | The role to use to publish image assets to the ECR repository in this environment. |
| [`imageAssetRegionSet`](#cdkbootstraplesssynthesizerbootstraplessstacksynthesizerpropspropertyimageassetregionset) | `string`[] | Override the ECR repository region of the Docker Image assets. |
| [`imageAssetRepositoryName`](#cdkbootstraplesssynthesizerbootstraplessstacksynthesizerpropspropertyimageassetrepositoryname) | `string` | Name of the ECR repository to hold Docker Image assets. |
| [`imageAssetTagPrefix`](#cdkbootstraplesssynthesizerbootstraplessstacksynthesizerpropspropertyimageassettagprefix) | `string` | Override the tag of the Docker Image assets. |
| [`templateBucketName`](#cdkbootstraplesssynthesizerbootstraplessstacksynthesizerpropspropertytemplatebucketname) | `string` | Override the name of the S3 bucket to hold Cloudformation template. |

---

##### `fileAssetBucketName`<sup>Optional</sup> <a name="cdk-bootstrapless-synthesizer.BootstraplessStackSynthesizerProps.property.fileAssetBucketName" id="cdkbootstraplesssynthesizerbootstraplessstacksynthesizerpropspropertyfileassetbucketname"></a>

```typescript
public readonly fileAssetBucketName: string;
```

- *Type:* `string`
- *Default:* process.env.BSS_FILE_ASSET_BUCKET_NAME

Name of the S3 bucket to hold file assets.

You must supply this if you have given a non-standard name to the staging bucket.  The placeholders `${AWS::AccountId}` and `${AWS::Region}` will be replaced with the values of qualifier and the stack's account and region, respectively.

---

##### `fileAssetPrefix`<sup>Optional</sup> <a name="cdk-bootstrapless-synthesizer.BootstraplessStackSynthesizerProps.property.fileAssetPrefix" id="cdkbootstraplesssynthesizerbootstraplessstacksynthesizerpropspropertyfileassetprefix"></a>

```typescript
public readonly fileAssetPrefix: string;
```

- *Type:* `string`
- *Default:* process.env.BSS_FILE_ASSET_PREFIX

Object key prefix to use while storing S3 Assets.

---

##### `fileAssetPublishingRoleArn`<sup>Optional</sup> <a name="cdk-bootstrapless-synthesizer.BootstraplessStackSynthesizerProps.property.fileAssetPublishingRoleArn" id="cdkbootstraplesssynthesizerbootstraplessstacksynthesizerpropspropertyfileassetpublishingrolearn"></a>

```typescript
public readonly fileAssetPublishingRoleArn: string;
```

- *Type:* `string`
- *Default:* process.env.BSS_FILE_ASSET_PUBLISHING_ROLE_ARN

The role to use to publish file assets to the S3 bucket in this environment.

You must supply this if you have given a non-standard name to the publishing role.  The placeholders `${AWS::AccountId}` and `${AWS::Region}` will be replaced with the values of qualifier and the stack's account and region, respectively.

---

##### `fileAssetRegionSet`<sup>Optional</sup> <a name="cdk-bootstrapless-synthesizer.BootstraplessStackSynthesizerProps.property.fileAssetRegionSet" id="cdkbootstraplesssynthesizerbootstraplessstacksynthesizerpropspropertyfileassetregionset"></a>

```typescript
public readonly fileAssetRegionSet: string[];
```

- *Type:* `string`[]
- *Default:* process.env.BSS_FILE_ASSET_REGION_SET // comma delimited list

The regions set of file assets to be published only when `fileAssetBucketName` contains `${AWS::Region}`.

For examples: `['us-east-1', 'us-west-1']`

---

##### `imageAssetAccountId`<sup>Optional</sup> <a name="cdk-bootstrapless-synthesizer.BootstraplessStackSynthesizerProps.property.imageAssetAccountId" id="cdkbootstraplesssynthesizerbootstraplessstacksynthesizerpropspropertyimageassetaccountid"></a>

```typescript
public readonly imageAssetAccountId: string;
```

- *Type:* `string`
- *Default:* process.env.BSS_IMAGE_ASSET_ACCOUNT_ID

Override the ECR repository account id of the Docker Image assets.

---

##### `imageAssetPublishingRoleArn`<sup>Optional</sup> <a name="cdk-bootstrapless-synthesizer.BootstraplessStackSynthesizerProps.property.imageAssetPublishingRoleArn" id="cdkbootstraplesssynthesizerbootstraplessstacksynthesizerpropspropertyimageassetpublishingrolearn"></a>

```typescript
public readonly imageAssetPublishingRoleArn: string;
```

- *Type:* `string`
- *Default:* process.env.BSS_IMAGE_ASSET_PUBLISHING_ROLE_ARN

The role to use to publish image assets to the ECR repository in this environment.

You must supply this if you have given a non-standard name to the publishing role.  The placeholders `${AWS::AccountId}` and `${AWS::Region}` will be replaced with the values of qualifier and the stack's account and region, respectively.

---

##### `imageAssetRegionSet`<sup>Optional</sup> <a name="cdk-bootstrapless-synthesizer.BootstraplessStackSynthesizerProps.property.imageAssetRegionSet" id="cdkbootstraplesssynthesizerbootstraplessstacksynthesizerpropspropertyimageassetregionset"></a>

```typescript
public readonly imageAssetRegionSet: string[];
```

- *Type:* `string`[]
- *Default:* process.env.BSS_IMAGE_ASSET_REGION_SET // comma delimited list

Override the ECR repository region of the Docker Image assets.

For examples: `['us-east-1', 'us-west-1']`

---

##### `imageAssetRepositoryName`<sup>Optional</sup> <a name="cdk-bootstrapless-synthesizer.BootstraplessStackSynthesizerProps.property.imageAssetRepositoryName" id="cdkbootstraplesssynthesizerbootstraplessstacksynthesizerpropspropertyimageassetrepositoryname"></a>

```typescript
public readonly imageAssetRepositoryName: string;
```

- *Type:* `string`
- *Default:* process.env.BSS_IMAGE_ASSET_REPOSITORY_NAME

Name of the ECR repository to hold Docker Image assets.

You must supply this if you have given a non-standard name to the ECR repository.  The placeholders `${AWS::AccountId}` and `${AWS::Region}` will be replaced with the values of qualifier and the stack's account and region, respectively.

---

##### `imageAssetTagPrefix`<sup>Optional</sup> <a name="cdk-bootstrapless-synthesizer.BootstraplessStackSynthesizerProps.property.imageAssetTagPrefix" id="cdkbootstraplesssynthesizerbootstraplessstacksynthesizerpropspropertyimageassettagprefix"></a>

```typescript
public readonly imageAssetTagPrefix: string;
```

- *Type:* `string`
- *Default:* process.env.BSS_IMAGE_ASSET_TAG_PREFIX

Override the tag of the Docker Image assets.

---

##### `templateBucketName`<sup>Optional</sup> <a name="cdk-bootstrapless-synthesizer.BootstraplessStackSynthesizerProps.property.templateBucketName" id="cdkbootstraplesssynthesizerbootstraplessstacksynthesizerpropspropertytemplatebucketname"></a>

```typescript
public readonly templateBucketName: string;
```

- *Type:* `string`
- *Default:* process.env.BSS_TEMPLATE_BUCKET_NAME

Override the name of the S3 bucket to hold Cloudformation template.

---

## Classes <a name="Classes" id="classes"></a>

### BootstraplessStackSynthesizer <a name="cdk-bootstrapless-synthesizer.BootstraplessStackSynthesizer" id="cdkbootstraplesssynthesizerbootstraplessstacksynthesizer"></a>

A Bootstrapless stack synthesizer that is designated to generate templates that can be directly used by Cloudformation.

#### Initializers <a name="cdk-bootstrapless-synthesizer.BootstraplessStackSynthesizer.Initializer" id="cdkbootstraplesssynthesizerbootstraplessstacksynthesizerinitializer"></a>

```typescript
import { BootstraplessStackSynthesizer } from 'cdk-bootstrapless-synthesizer'

new BootstraplessStackSynthesizer(props?: BootstraplessStackSynthesizerProps)
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| [`props`](#cdkbootstraplesssynthesizerbootstraplessstacksynthesizerparameterprops) | [`cdk-bootstrapless-synthesizer.BootstraplessStackSynthesizerProps`](#cdk-bootstrapless-synthesizer.BootstraplessStackSynthesizerProps) | *No description.* |

---

##### `props`<sup>Optional</sup> <a name="cdk-bootstrapless-synthesizer.BootstraplessStackSynthesizer.parameter.props" id="cdkbootstraplesssynthesizerbootstraplessstacksynthesizerparameterprops"></a>

- *Type:* [`cdk-bootstrapless-synthesizer.BootstraplessStackSynthesizerProps`](#cdk-bootstrapless-synthesizer.BootstraplessStackSynthesizerProps)

---

#### Methods <a name="Methods" id="methods"></a>

| **Name** | **Description** |
| --- | --- |
| [`addDockerImageAsset`](#cdkbootstraplesssynthesizerbootstraplessstacksynthesizeradddockerimageasset) | Register a Docker Image Asset. |
| [`addFileAsset`](#cdkbootstraplesssynthesizerbootstraplessstacksynthesizeraddfileasset) | Register a File Asset. |
| [`bind`](#cdkbootstraplesssynthesizerbootstraplessstacksynthesizerbind) | Bind to the stack this environment is going to be used on. |
| [`dumps`](#cdkbootstraplesssynthesizerbootstraplessstacksynthesizerdumps) | Dumps current manifest into JSON format. |
| [`synthesize`](#cdkbootstraplesssynthesizerbootstraplessstacksynthesizersynthesize) | Synthesize the associated stack to the session. |

---

##### `addDockerImageAsset` <a name="cdk-bootstrapless-synthesizer.BootstraplessStackSynthesizer.addDockerImageAsset" id="cdkbootstraplesssynthesizerbootstraplessstacksynthesizeradddockerimageasset"></a>

```typescript
public addDockerImageAsset(asset: DockerImageAssetSource)
```

###### `asset`<sup>Required</sup> <a name="cdk-bootstrapless-synthesizer.BootstraplessStackSynthesizer.parameter.asset" id="cdkbootstraplesssynthesizerbootstraplessstacksynthesizerparameterasset"></a>

- *Type:* [`aws-cdk-lib.DockerImageAssetSource`](#aws-cdk-lib.DockerImageAssetSource)

---

##### `addFileAsset` <a name="cdk-bootstrapless-synthesizer.BootstraplessStackSynthesizer.addFileAsset" id="cdkbootstraplesssynthesizerbootstraplessstacksynthesizeraddfileasset"></a>

```typescript
public addFileAsset(asset: FileAssetSource)
```

###### `asset`<sup>Required</sup> <a name="cdk-bootstrapless-synthesizer.BootstraplessStackSynthesizer.parameter.asset" id="cdkbootstraplesssynthesizerbootstraplessstacksynthesizerparameterasset"></a>

- *Type:* [`aws-cdk-lib.FileAssetSource`](#aws-cdk-lib.FileAssetSource)

---

##### `bind` <a name="cdk-bootstrapless-synthesizer.BootstraplessStackSynthesizer.bind" id="cdkbootstraplesssynthesizerbootstraplessstacksynthesizerbind"></a>

```typescript
public bind(stack: Stack)
```

###### `stack`<sup>Required</sup> <a name="cdk-bootstrapless-synthesizer.BootstraplessStackSynthesizer.parameter.stack" id="cdkbootstraplesssynthesizerbootstraplessstacksynthesizerparameterstack"></a>

- *Type:* [`aws-cdk-lib.Stack`](#aws-cdk-lib.Stack)

---

##### `dumps` <a name="cdk-bootstrapless-synthesizer.BootstraplessStackSynthesizer.dumps" id="cdkbootstraplesssynthesizerbootstraplessstacksynthesizerdumps"></a>

```typescript
public dumps()
```

##### `synthesize` <a name="cdk-bootstrapless-synthesizer.BootstraplessStackSynthesizer.synthesize" id="cdkbootstraplesssynthesizerbootstraplessstacksynthesizersynthesize"></a>

```typescript
public synthesize(session: ISynthesisSession)
```

###### `session`<sup>Required</sup> <a name="cdk-bootstrapless-synthesizer.BootstraplessStackSynthesizer.parameter.session" id="cdkbootstraplesssynthesizerbootstraplessstacksynthesizerparametersession"></a>

- *Type:* [`aws-cdk-lib.ISynthesisSession`](#aws-cdk-lib.ISynthesisSession)

---





