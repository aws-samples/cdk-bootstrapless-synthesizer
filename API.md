# API Reference

**Classes**

Name|Description
----|-----------
[BootstraplessStackSynthesizer](#cdk-bootstrapless-synthesizer-bootstraplessstacksynthesizer)|A Bootstrapless stack synthesizer that is designated to generate templates that can directly used by Cloudformation.


**Structs**

Name|Description
----|-----------
[BootstraplessStackSynthesizerProps](#cdk-bootstrapless-synthesizer-bootstraplessstacksynthesizerprops)|Configuration properties for BootstraplessStackSynthesizer.



## class BootstraplessStackSynthesizer  <a id="cdk-bootstrapless-synthesizer-bootstraplessstacksynthesizer"></a>

A Bootstrapless stack synthesizer that is designated to generate templates that can directly used by Cloudformation.

__Implements__: [IStackSynthesizer](#aws-cdk-core-istacksynthesizer)
__Extends__: [StackSynthesizer](#aws-cdk-core-stacksynthesizer)

### Initializer




```ts
new BootstraplessStackSynthesizer(props?: BootstraplessStackSynthesizerProps)
```

* **props** (<code>[BootstraplessStackSynthesizerProps](#cdk-bootstrapless-synthesizer-bootstraplessstacksynthesizerprops)</code>)  *No description*
  * **fileAssetPublishingRoleArn** (<code>string</code>)  The role to use to publish file assets to the S3 bucket in this environment. __*Optional*__
  * **fileAssetsBucketName** (<code>string</code>)  Name of the S3 bucket to hold file assets. __*Optional*__
  * **fileAssetsPrefix** (<code>string</code>)  Object key prefix to use while storing S3 Assets. __*Optional*__
  * **fileAssetsRegionSet** (<code>Array<string></code>)  The regions set of file assets to be published only when fileAssetsBucketName contains `${AWS::Region}`. __*Optional*__
  * **imageAssetPublishingRoleArn** (<code>string</code>)  The role to use to publish image assets to the ECR repository in this environment. __*Optional*__
  * **imageAssetsRepositoryName** (<code>string</code>)  Name of the ECR repository to hold Docker Image assets. __*Optional*__
  * **imageAssetsTag** (<code>string</code>)  Overrider the tag of the Docker Image assets. __*Optional*__
  * **templateBucketName** (<code>string</code>)  Overrider the name of the S3 bucket to hold Cloudformation template. __*Optional*__



### Properties


Name | Type | Description 
-----|------|-------------
**stack**? | <code>[Stack](#aws-cdk-core-stack)</code> | __*Optional*__
*static* **DEFAULT_FILE_ASSET_PREFIX** | <code>string</code> | Default file asset prefix.

### Methods


#### addDockerImageAsset(asset) <a id="cdk-bootstrapless-synthesizer-bootstraplessstacksynthesizer-adddockerimageasset"></a>

Register a Docker Image Asset.

Returns the parameters that can be used to refer to the asset inside the template.

```ts
addDockerImageAsset(asset: DockerImageAssetSource): DockerImageAssetLocation
```

* **asset** (<code>[DockerImageAssetSource](#aws-cdk-core-dockerimageassetsource)</code>)  *No description*
  * **directoryName** (<code>string</code>)  The directory where the Dockerfile is stored, must be relative to the cloud assembly root. 
  * **sourceHash** (<code>string</code>)  The hash of the contents of the docker build context. 
  * **dockerBuildArgs** (<code>Map<string, string></code>)  Build args to pass to the `docker build` command. __*Default*__: no build args are passed
  * **dockerBuildTarget** (<code>string</code>)  Docker target to build to. __*Default*__: no target
  * **dockerFile** (<code>string</code>)  Path to the Dockerfile (relative to the directory). __*Default*__: no file
  * **repositoryName** (<code>string</code>)  ECR repository name. __*Default*__: automatically derived from the asset's ID.

__Returns__:
* <code>[DockerImageAssetLocation](#aws-cdk-core-dockerimageassetlocation)</code>

#### addFileAsset(asset) <a id="cdk-bootstrapless-synthesizer-bootstraplessstacksynthesizer-addfileasset"></a>

Register a File Asset.

Returns the parameters that can be used to refer to the asset inside the template.

```ts
addFileAsset(asset: FileAssetSource): FileAssetLocation
```

* **asset** (<code>[FileAssetSource](#aws-cdk-core-fileassetsource)</code>)  *No description*
  * **fileName** (<code>string</code>)  The path, relative to the root of the cloud assembly, in which this asset source resides. 
  * **packaging** (<code>[FileAssetPackaging](#aws-cdk-core-fileassetpackaging)</code>)  Which type of packaging to perform. 
  * **sourceHash** (<code>string</code>)  A hash on the content source. 

__Returns__:
* <code>[FileAssetLocation](#aws-cdk-core-fileassetlocation)</code>

#### bind(stack) <a id="cdk-bootstrapless-synthesizer-bootstraplessstacksynthesizer-bind"></a>

Bind to the stack this environment is going to be used on.

Must be called before any of the other methods are called.

```ts
bind(stack: Stack): void
```

* **stack** (<code>[Stack](#aws-cdk-core-stack)</code>)  *No description*




#### dumps() <a id="cdk-bootstrapless-synthesizer-bootstraplessstacksynthesizer-dumps"></a>

Dumps current manifest into JSON format.

```ts
dumps(): string
```


__Returns__:
* <code>string</code>

#### synthesize(session) <a id="cdk-bootstrapless-synthesizer-bootstraplessstacksynthesizer-synthesize"></a>

Synthesize the associated stack to the session.

```ts
synthesize(session: ISynthesisSession): void
```

* **session** (<code>[ISynthesisSession](#aws-cdk-core-isynthesissession)</code>)  *No description*






## struct BootstraplessStackSynthesizerProps  <a id="cdk-bootstrapless-synthesizer-bootstraplessstacksynthesizerprops"></a>


Configuration properties for BootstraplessStackSynthesizer.



Name | Type | Description 
-----|------|-------------
**fileAssetPublishingRoleArn**? | <code>string</code> | The role to use to publish file assets to the S3 bucket in this environment.<br/>__*Optional*__
**fileAssetsBucketName**? | <code>string</code> | Name of the S3 bucket to hold file assets.<br/>__*Optional*__
**fileAssetsPrefix**? | <code>string</code> | Object key prefix to use while storing S3 Assets.<br/>__*Optional*__
**fileAssetsRegionSet**? | <code>Array<string></code> | The regions set of file assets to be published only when fileAssetsBucketName contains `${AWS::Region}`.<br/>__*Optional*__
**imageAssetPublishingRoleArn**? | <code>string</code> | The role to use to publish image assets to the ECR repository in this environment.<br/>__*Optional*__
**imageAssetsRepositoryName**? | <code>string</code> | Name of the ECR repository to hold Docker Image assets.<br/>__*Optional*__
**imageAssetsTag**? | <code>string</code> | Overrider the tag of the Docker Image assets.<br/>__*Optional*__
**templateBucketName**? | <code>string</code> | Overrider the name of the S3 bucket to hold Cloudformation template.<br/>__*Optional*__



