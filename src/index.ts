import * as fs from 'fs';
import * as path from 'path';
// import * as crypto from 'crypto';
import * as cxschema from '@aws-cdk/cloud-assembly-schema';
import { DockerImageAssetLocation, DockerImageAssetSource, FileAssetLocation, FileAssetPackaging, FileAssetSource, Fn, ISynthesisSession, Stack, StackSynthesizer, Token } from '@aws-cdk/core';
import * as cxapi from '@aws-cdk/cx-api';


const REGION_PLACEHOLDER = '${AWS::Region}';

export interface BootstraplessStackSynthesizerProps {
  readonly fileAssetsBucketName?: string;
  readonly imageAssetsRepositoryName?: string;

  readonly fileAssetPublishingRoleArn?: string;
  readonly imageAssetPublishingRoleArn?: string;

  readonly fileAssetsPrefix?: string;
  readonly fileAssetsRegionSet?: string[];
  readonly templateBucketName?: string;
}

export class BootstraplessStackSynthesizer extends StackSynthesizer {
  /**
   * Default file asset prefix
   */
  public static readonly DEFAULT_FILE_ASSET_PREFIX = '';

  private _stack?: Stack;
  private bucketName: string = '';
  private repositoryName: string = '';
  private fileAssetPublishingRoleArn?: string;
  private imageAssetPublishingRoleArn?: string;
  private fileAssetsPrefix?: string

  private readonly files: NonNullable<cxschema.AssetManifest['files']> = {};
  private readonly dockerImages: NonNullable<cxschema.AssetManifest['dockerImages']> = {};

  constructor(private readonly props: BootstraplessStackSynthesizerProps = {}) {
    super();
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
    const specialize = (s: string) => {
      return cxapi.EnvironmentPlaceholders.replace(s, {
        region: resolvedOr(stack.region, cxapi.EnvironmentPlaceholders.CURRENT_REGION),
        accountId: resolvedOr(stack.account, cxapi.EnvironmentPlaceholders.CURRENT_ACCOUNT),
        partition: cxapi.EnvironmentPlaceholders.CURRENT_PARTITION,
      });
    };

    /* eslint-disable max-len */
    this.bucketName = specialize(this.props.fileAssetsBucketName ?? '');
    this.repositoryName = specialize(this.props.imageAssetsRepositoryName ?? '');
    this.fileAssetPublishingRoleArn = this.props.fileAssetPublishingRoleArn ? specialize(this.props.fileAssetPublishingRoleArn) : undefined;
    this.imageAssetPublishingRoleArn = this.props.imageAssetPublishingRoleArn ? specialize(this.props.imageAssetPublishingRoleArn) : undefined;
    this.fileAssetsPrefix = specialize(this.props.fileAssetsPrefix ?? BootstraplessStackSynthesizer.DEFAULT_FILE_ASSET_PREFIX);
    /* eslint-enable max-len */
  }

  public addFileAsset(asset: FileAssetSource): FileAssetLocation {
    return this._addFileAsset(asset);
  }

  private _addFileAsset(asset: FileAssetSource, overrideBucketname?: string): FileAssetLocation {
    assertBound(this.stack);
    assertBound(this.bucketName);

    const bucketName = overrideBucketname ?? this.bucketName;
    const objectKey = this.fileAssetsPrefix + asset.sourceHash + (asset.packaging === FileAssetPackaging.ZIP_DIRECTORY ? '.zip' : '');
    const destinations: { [id: string]: cxschema.FileDestination } = {};

    if (this.props.fileAssetsRegionSet?.length && bucketName.includes(REGION_PLACEHOLDER)) {
      for (let region of this.props.fileAssetsRegionSet) {
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
        region: resolvedOr(this.stack.region, undefined),
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
      s3Url: httpUrl,
    };
  }

  public addDockerImageAsset(asset: DockerImageAssetSource): DockerImageAssetLocation {
    assertBound(this.stack);
    assertBound(this.repositoryName);

    const imageTag = asset.sourceHash;

    // Add to manifest
    this.dockerImages[asset.sourceHash] = {
      source: {
        directory: asset.directoryName,
        dockerBuildArgs: asset.dockerBuildArgs,
        dockerBuildTarget: asset.dockerBuildTarget,
        dockerFile: asset.dockerFile,
      },
      destinations: {
        [this.manifestEnvName]: {
          repositoryName: this.repositoryName,
          imageTag,
          region: resolvedOr(this.stack.region, undefined),
          assumeRoleArn: this.imageAssetPublishingRoleArn,
        },
      },
    };

    const { account, region, urlSuffix } = stackLocationOrInstrinsics(this.stack);

    // Return CFN expression
    return {
      repositoryName: cfnify(this.repositoryName),
      imageUri: cfnify(`${account}.dkr.ecr.${region}.${urlSuffix}/${this.repositoryName}:${imageTag}`),
    };
  }

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
    assertBound(this.stack);

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
    assertBound(this.stack);

    const sourceHash = this.stack.templateFile;

    this._addFileAsset({
      fileName: this.stack.templateFile,
      packaging: FileAssetPackaging.FILE,
      sourceHash,
    }, this.props.templateBucketName);

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
    assertBound(this.stack);

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
    assertBound(this.stack);

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


function assertBound<A>(x: A | undefined): asserts x is NonNullable<A> {
  if (x === null && x === undefined) {
    throw new Error('You must call bindStack() first');
  }
}

// function contentHash(content: string) {
//   return crypto.createHash('sha256').update(content).digest('hex');
// }