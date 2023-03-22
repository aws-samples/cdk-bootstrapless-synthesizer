import * as fs from 'fs';
import * as path from 'path';
import { DockerImageAssetLocation, DockerImageAssetSource, FileAssetLocation, FileAssetPackaging, FileAssetSource, Fn, ISynthesisSession, Stack, StackSynthesizer, Token } from 'aws-cdk-lib';
import * as cxschema from 'aws-cdk-lib/cloud-assembly-schema';
import * as cxapi from 'aws-cdk-lib/cx-api';
export * from './aspect';


const REGION_PLACEHOLDER = '${AWS::Region}';
const ERR_MSG_CALL_BIND_FIRST = 'You must call bind() first';

export enum ImageAssetTagSuffixType {
  NONE = 'NONE',
  HASH = 'HASH',
}

/**
 * Configuration properties for BootstraplessStackSynthesizer
 */
export interface BootstraplessStackSynthesizerProps {
  /**
   * Name of the S3 bucket to hold file assets
   *
   * You must supply this if you have given a non-standard name to the staging bucket.
   *
   * The placeholders `${AWS::AccountId}` and `${AWS::Region}` will
   * be replaced with the values of qualifier and the stack's account and region,
   * respectively.
   *
   * @required if you have file assets
   * @default - process.env.BSS_FILE_ASSET_BUCKET_NAME
   */
  readonly fileAssetBucketName?: string;

  /**
   * Name of the ECR repository to hold Docker Image assets
   *
   * You must supply this if you have given a non-standard name to the ECR repository.
   *
   * The placeholders `${AWS::AccountId}` and `${AWS::Region}` will
   * be replaced with the values of qualifier and the stack's account and region,
   * respectively.
   *
   * @required if you have docker image assets
   * @default - process.env.BSS_IMAGE_ASSET_REPOSITORY_NAME
   */
  readonly imageAssetRepositoryName?: string;

  /**
   * The role to use to publish file assets to the S3 bucket in this environment
   *
   * You must supply this if you have given a non-standard name to the publishing role.
   *
   * The placeholders `${AWS::AccountId}` and `${AWS::Region}` will
   * be replaced with the values of qualifier and the stack's account and region,
   * respectively.
   *
   * @default - process.env.BSS_FILE_ASSET_PUBLISHING_ROLE_ARN
   */
  readonly fileAssetPublishingRoleArn?: string;

  /**
   * The role to use to publish image assets to the ECR repository in this environment
   *
   * You must supply this if you have given a non-standard name to the publishing role.
   *
   * The placeholders `${AWS::AccountId}` and `${AWS::Region}` will
   * be replaced with the values of qualifier and the stack's account and region,
   * respectively.
   *
   * @default - process.env.BSS_IMAGE_ASSET_PUBLISHING_ROLE_ARN
   */
  readonly imageAssetPublishingRoleArn?: string;

  /**
   * Object key prefix to use while storing S3 Assets
   *
   * @default - process.env.BSS_FILE_ASSET_PREFIX
   */
  readonly fileAssetPrefix?: string;

  /**
   * The regions set of file assets to be published only when `fileAssetBucketName` contains `${AWS::Region}`
   *
   * For examples:
   * `['us-east-1', 'us-west-1']`
   *
   * @default - process.env.BSS_FILE_ASSET_REGION_SET // comma delimited list
   */
  readonly fileAssetRegionSet?: string[];

  /**
   * Override the name of the S3 bucket to hold Cloudformation template
   *
   * @default - process.env.BSS_TEMPLATE_BUCKET_NAME
   */
  readonly templateBucketName?: string;

  /**
   * Override the tag prefix of the Docker Image assets
   *
   * @default - process.env.BSS_IMAGE_ASSET_TAG_PREFIX
   */
  readonly imageAssetTagPrefix?: string;

  /**
   * Override the tag suffix of the Docker Image assets
   *
   * @default - HASH or process.env.BSS_IMAGE_ASSET_TAG_SUFFIX_TYPE
   */
  readonly imageAssetTagSuffixType?: ImageAssetTagSuffixType;

  /**
   * Override the ECR repository region of the Docker Image assets
   *
   * For examples:
   * `['us-east-1', 'us-west-1']`
   *
   * @default - process.env.BSS_IMAGE_ASSET_REGION_SET // comma delimited list
   */
  readonly imageAssetRegionSet?: string[];

  /**
   * Override the ECR repository account id of the Docker Image assets
   *
   * @default - process.env.BSS_IMAGE_ASSET_ACCOUNT_ID
   */
  readonly imageAssetAccountId?: string;
}

/**
 * A Bootstrapless stack synthesizer that is designated to generate templates
 * that can be directly used by Cloudformation
 */
export class BootstraplessStackSynthesizer extends StackSynthesizer {
  private _stack?: Stack;
  private bucketName?: string;
  private repositoryName?: string;
  private fileAssetPublishingRoleArn?: string;
  private imageAssetPublishingRoleArn?: string;
  private fileAssetPrefix?: string;
  private fileAssetRegionSet?: string[];
  private templateBucketName?: string;
  private imageAssetTagPrefix: string;
  private imageAssetTagSuffixType: ImageAssetTagSuffixType;
  private imageAssetRegionSet?: string[];
  private imageAssetAccountId?: string;


  private readonly files: NonNullable<cxschema.AssetManifest['files']> = {};
  private readonly dockerImages: NonNullable<cxschema.AssetManifest['dockerImages']> = {};

  constructor(props: BootstraplessStackSynthesizerProps = {}) {
    super();
    const {
      BSS_FILE_ASSET_BUCKET_NAME,
      BSS_IMAGE_ASSET_REPOSITORY_NAME,

      BSS_FILE_ASSET_PUBLISHING_ROLE_ARN,
      BSS_IMAGE_ASSET_PUBLISHING_ROLE_ARN,

      BSS_FILE_ASSET_PREFIX,
      BSS_FILE_ASSET_REGION_SET,

      BSS_TEMPLATE_BUCKET_NAME,
      BSS_IMAGE_ASSET_TAG_PREFIX,
      BSS_IMAGE_ASSET_TAG_SUFFIX_TYPE,
      BSS_IMAGE_ASSET_REGION_SET,
      BSS_IMAGE_ASSET_ACCOUNT_ID,
    } = process.env;
    /* eslint-disable max-len */
    this.bucketName = props.fileAssetBucketName ?? BSS_FILE_ASSET_BUCKET_NAME;
    this.repositoryName = props.imageAssetRepositoryName ?? BSS_IMAGE_ASSET_REPOSITORY_NAME;
    this.fileAssetPublishingRoleArn = props.fileAssetPublishingRoleArn ?? BSS_FILE_ASSET_PUBLISHING_ROLE_ARN;
    this.imageAssetPublishingRoleArn = props.imageAssetPublishingRoleArn ?? BSS_IMAGE_ASSET_PUBLISHING_ROLE_ARN;
    this.fileAssetPrefix = props.fileAssetPrefix ?? BSS_FILE_ASSET_PREFIX;
    this.fileAssetRegionSet = props.fileAssetRegionSet ?? commaSplit(BSS_FILE_ASSET_REGION_SET);
    this.templateBucketName = props.templateBucketName ?? BSS_TEMPLATE_BUCKET_NAME;
    this.imageAssetTagPrefix = (props.imageAssetTagPrefix ?? BSS_IMAGE_ASSET_TAG_PREFIX) ?? '';
    this.imageAssetTagSuffixType = validateImageAssetTagSuffixType((props.imageAssetTagSuffixType ?? BSS_IMAGE_ASSET_TAG_SUFFIX_TYPE) ?? ImageAssetTagSuffixType.HASH);
    this.imageAssetRegionSet = props.imageAssetRegionSet ?? commaSplit(BSS_IMAGE_ASSET_REGION_SET);
    this.imageAssetAccountId = props.imageAssetAccountId ?? BSS_IMAGE_ASSET_ACCOUNT_ID;
    /* eslint-enable max-len */
  }

  public bind(stack: Stack): void {
    if (this._stack !== undefined) {
      throw new Error('A StackSynthesizer can only be used for one Stack: create a new instance to use with a different Stack');
    }

    this._stack = stack;

    // Function to replace placeholders in the input string as much as possible
    //
    // We replace:
    // - ${AWS::AccountId}, ${AWS::Region}: only if we have the actual values available
    // - ${AWS::Partition}: never, since we never have the actual partition value.
    const specialize = (s: string | undefined) => {
      if (s === undefined) {
        return undefined;
      }
      return cxapi.EnvironmentPlaceholders.replace(s, {
        region: resolvedOr(stack.region, cxapi.EnvironmentPlaceholders.CURRENT_REGION),
        accountId: resolvedOr(stack.account, cxapi.EnvironmentPlaceholders.CURRENT_ACCOUNT),
        partition: cxapi.EnvironmentPlaceholders.CURRENT_PARTITION,
      });
    };

    /* eslint-disable max-len */
    this.bucketName = specialize(this.bucketName);
    this.repositoryName = specialize(this.repositoryName);
    this.fileAssetPublishingRoleArn = specialize(this.fileAssetPublishingRoleArn);
    this.imageAssetPublishingRoleArn = specialize(this.imageAssetPublishingRoleArn);
    this.fileAssetPrefix = specialize(this.fileAssetPrefix ?? '');
    /* eslint-enable max-len */
  }

  public addFileAsset(asset: FileAssetSource): FileAssetLocation {
    return this._addFileAsset(asset);
  }

  private _addFileAsset(asset: FileAssetSource, overrideBucketname?: string): FileAssetLocation {
    assertNotNull(this.stack, ERR_MSG_CALL_BIND_FIRST);
    assertNotNull(this.bucketName, 'The bucketName is null');
    validateFileAssetSource(asset);

    const bucketName = overrideBucketname ?? this.bucketName;
    const objectKey = this.fileAssetPrefix + asset.sourceHash + (asset.packaging === FileAssetPackaging.ZIP_DIRECTORY ? '.zip' : '');
    const destinations: { [id: string]: cxschema.FileDestination } = {};

    if (this.fileAssetRegionSet?.length && bucketName.includes(REGION_PLACEHOLDER)) {
      for (const region of this.fileAssetRegionSet.map(r => r.trim())) {
        if (!region) { continue; }
        destinations[region] = {
          bucketName: replaceAll(bucketName, REGION_PLACEHOLDER, region),
          objectKey,
          region,
          assumeRoleArn: this.fileAssetPublishingRoleArn,
        };
      }
    } else {
      destinations[this.manifestEnvName] = {
        bucketName,
        objectKey,
        region: resolvedOr(this.stack.region, trim(head(this.fileAssetRegionSet))),
        assumeRoleArn: this.fileAssetPublishingRoleArn,
      };
    }

    // Add to manifest
    this.files[asset.sourceHash] = {
      source: {
        path: asset.fileName,
        packaging: asset.packaging,
      },
      destinations,
    };

    const { region, urlSuffix } = stackLocationOrInstrinsics(this.stack);
    const httpUrl = cfnify(`https://s3.${region}.${urlSuffix}/${bucketName}/${objectKey}`);
    const s3ObjectUrl = cfnify(`s3://${bucketName}/${objectKey}`);

    // Return CFN expression
    return {
      bucketName: cfnify(bucketName),
      objectKey,
      httpUrl,
      s3ObjectUrl,
    };
  }

  public addDockerImageAsset(asset: DockerImageAssetSource): DockerImageAssetLocation {
    assertNotNull(this.stack, ERR_MSG_CALL_BIND_FIRST);
    assertNotNull(this.repositoryName, 'The repositoryName is null');
    validateDockerImageAssetSource(asset);

    let imageTag = this.imageAssetTagPrefix;
    if (this.imageAssetTagSuffixType === ImageAssetTagSuffixType.HASH) {
      imageTag = this.imageAssetTagPrefix + asset.sourceHash;
    }

    const destinations: { [id: string]: cxschema.DockerImageDestination } = {};

    if (this.imageAssetRegionSet?.length) {
      for (const region of this.imageAssetRegionSet.map(r => r.trim())) {
        if (!region) { continue; }
        destinations[region] = {
          repositoryName: this.repositoryName,
          imageTag,
          region,
          assumeRoleArn: this.fileAssetPublishingRoleArn,
        };
      }
    } else {
      destinations[this.manifestEnvName] = {
        repositoryName: this.repositoryName,
        imageTag,
        region: resolvedOr(this.stack.region, undefined),
        assumeRoleArn: this.imageAssetPublishingRoleArn,
      };
    }

    // Add to manifest
    this.dockerImages[asset.sourceHash] = {
      source: {
        directory: asset.directoryName,
        dockerBuildArgs: asset.dockerBuildArgs,
        dockerBuildTarget: asset.dockerBuildTarget,
        dockerFile: asset.dockerFile,
      },
      destinations,
    };

    let { account, urlSuffix } = stackLocationOrInstrinsics(this.stack);
    account = this.imageAssetAccountId ?? account;

    return {
      repositoryName: cfnify(this.repositoryName),
      imageUri: cfnify(`${account}.dkr.ecr.${REGION_PLACEHOLDER}.${urlSuffix}/${this.repositoryName}:${imageTag}`),
    };
  }

  /**
   * Dumps current manifest into JSON format
   */
  public dumps(): string {
    const manifest: cxschema.AssetManifest = {
      version: cxschema.Manifest.version(),
      files: this.files,
      dockerImages: this.dockerImages,
    };
    return JSON.stringify(manifest, undefined, 2);
  }

  /**
   * Synthesize the associated stack to the session
   */
  public synthesize(session: ISynthesisSession): void {
    assertNotNull(this.stack, ERR_MSG_CALL_BIND_FIRST);

    this.synthesizeStackTemplate(this.stack, session);

    // Add the stack's template to the artifact manifest
    const templateManifestUrl = this.addStackTemplateToAssetManifest(session);

    const artifactId = this.writeAssetManifest(session);

    this.emitStackArtifact(this.stack, session, {
      stackTemplateAssetObjectUrl: templateManifestUrl,
      additionalDependencies: [artifactId],
    });
  }

  protected get stack(): Stack | undefined {
    return this._stack;
  }

  /**
   * Add the stack's template as one of the manifest assets
   *
   * This will make it get uploaded to S3 automatically by S3-assets. Return
   * the manifest URL.
   *
   * (We can't return the location returned from `addFileAsset`, as that
   * contains CloudFormation intrinsics which can't go into the manifest).
   */
  private addStackTemplateToAssetManifest(_: ISynthesisSession) {
    assertNotNull(this.stack, ERR_MSG_CALL_BIND_FIRST);

    const sourceHash = this.stack.templateFile;

    this._addFileAsset({
      fileName: this.stack.templateFile,
      packaging: FileAssetPackaging.FILE,
      sourceHash,
    }, this.templateBucketName);

    // We should technically return an 'https://s3.REGION.amazonaws.com[.cn]/name/hash' URL here,
    // because that is what CloudFormation expects to see.
    //
    // However, there's no way for us to actually know the UrlSuffix a priori, so we can't construct it here.
    //
    // Instead, we'll have a protocol with the CLI that we put an 's3://.../...' URL here, and the CLI
    // is going to resolve it to the correct 'https://.../' URL before it gives it to CloudFormation.
    return `s3://${this.bucketName}/${sourceHash}`;
  }

  /**
   * Write an asset manifest to the Cloud Assembly, return the artifact IDs written
   */
  private writeAssetManifest(session: ISynthesisSession): string {
    assertNotNull(this.stack, ERR_MSG_CALL_BIND_FIRST);

    const artifactId = `${this.stack.artifactId}.assets`;
    const manifestFile = `${artifactId}.json`;
    const outPath = path.join(session.assembly.outdir, manifestFile);

    fs.writeFileSync(outPath, this.dumps());
    session.assembly.addArtifact(artifactId, {
      type: cxschema.ArtifactType.ASSET_MANIFEST,
      properties: {
        file: manifestFile,
      },
    });

    return artifactId;
  }

  private get manifestEnvName(): string {
    assertNotNull(this.stack, ERR_MSG_CALL_BIND_FIRST);

    return [
      resolvedOr(this.stack.account, 'current_account'),
      resolvedOr(this.stack.region, 'current_region'),
    ].join('-');
  }
}

/**
 * Return the given value if resolved or fall back to a default
 */
function resolvedOr<A>(x: string, def: A): string | A {
  return Token.isUnresolved(x) ? def : x;
}

/**
 * A "replace-all" function that doesn't require us escaping a literal string to a regex
 */
function replaceAll(s: string, search: string, replace: string) {
  return s.split(search).join(replace);
}

/**
 * If the string still contains placeholders, wrap it in a Fn::Sub so they will be substituted at CFN deployment time
 *
 * (This happens to work because the placeholders we picked map directly onto CFN
 * placeholders. If they didn't we'd have to do a transformation here).
 */
function cfnify(s: string): string {
  return s.indexOf('${') > -1 ? Fn.sub(s) : s;
}

/**
 * Return the stack locations if they're concrete, or the original CFN intrisics otherwise
 *
 * We need to return these instead of the tokenized versions of the strings,
 * since we must accept those same ${AWS::AccountId}/${AWS::Region} placeholders
 * in bucket names and role names (in order to allow environment-agnostic stacks).
 *
 * We'll wrap a single {Fn::Sub} around the final string in order to replace everything,
 * but we can't have the token system render part of the string to {Fn::Join} because
 * the CFN specification doesn't allow the {Fn::Sub} template string to be an arbitrary
 * expression--it must be a string literal.
 */
function stackLocationOrInstrinsics(stack: Stack) {
  return {
    account: resolvedOr(stack.account, '${AWS::AccountId}'),
    region: resolvedOr(stack.region, '${AWS::Region}'),
    urlSuffix: resolvedOr(stack.urlSuffix, '${AWS::URLSuffix}'),
  };
}


// function range(startIncl: number, endExcl: number) {
//     const ret = new Array<number>();
//     for (let i = startIncl; i < endExcl; i++) {
//     ret.push(i);
//     }
//     return ret;
// }


function assertNotNull<A>(x: A | undefined, msg: string = 'Null value error'): asserts x is NonNullable<A> {
  if (x === null || x === undefined) {
    throw new Error(msg);
  }
}

function commaSplit(v?: string): string[] | undefined {
  if (v) {
    return v.split(',');
  }
  return undefined;
}

function validateImageAssetTagSuffixType(s: string): ImageAssetTagSuffixType {
  if (!Object.values(ImageAssetTagSuffixType).includes(s as ImageAssetTagSuffixType)) {
    throw new Error(`Invalid ImageAssetTagSuffixType: ${s}, must be in ${Object.values(ImageAssetTagSuffixType)}`);
  }
  return s as ImageAssetTagSuffixType;
}

function validateFileAssetSource(asset: FileAssetSource) {
  if (!!asset.executable === !!asset.fileName) {
    throw new Error(`Exactly one of 'fileName' or 'executable' is required, got: ${JSON.stringify(asset)}`);
  }

  if (!!asset.packaging !== !!asset.fileName) {
    throw new Error(`'packaging' is expected in combination with 'fileName', got: ${JSON.stringify(asset)}`);
  }
}

function validateDockerImageAssetSource(asset: DockerImageAssetSource) {
  if (!!asset.executable === !!asset.directoryName) {
    throw new Error(`Exactly one of 'directoryName' or 'executable' is required, got: ${JSON.stringify(asset)}`);
  }

  check('dockerBuildArgs');
  check('dockerBuildTarget');
  check('dockerFile');

  function check<K extends keyof DockerImageAssetSource>(key: K) {
    if (asset[key] && !asset.directoryName) {
      throw new Error(`'${key}' is only allowed in combination with 'directoryName', got: ${JSON.stringify(asset)}`);
    }
  }
}

function head(ss?: string[]): string | undefined {
  if (ss && ss.length > 0) {
    return ss[0];
  }
  return undefined;
}

function trim(s?: string): string | undefined {
  if (s) {
    return s.trim();
  }
  return undefined;
}