import { Stack, StackProps, App, RemovalPolicy, Arn, Aws, Annotations, SecretValue } from 'aws-cdk-lib';
import { PipelineProject, BuildSpec, LinuxBuildImage, ComputeType, BuildEnvironmentVariableType } from 'aws-cdk-lib/aws-codebuild';
import { Pipeline, Artifact } from 'aws-cdk-lib/aws-codepipeline';
import { CodeBuildAction, GitHubSourceAction } from 'aws-cdk-lib/aws-codepipeline-actions';
import { Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

/**
 * Stack to hold the pipeline
 */
export class CDKToCloudFormationPipelineStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    var githubToken = this.node.tryGetContext('GithubToken');
    if (!githubToken) {
      Annotations.of(this).addWarning(`GithubToken is not specified, 
      use github-token as default, pls make sure the token is saved as plaintext.      
      `);
      githubToken = 'github-token';
    }

    const publishAccountId = this.node.tryGetContext('PublishAccountId') ?? Aws.ACCOUNT_ID;

    const assetBucket = new Bucket(this, 'AssetsBucket', {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const appName = 'myapp';
    const fileAssetsPrefix = `${appName}/`;
    const regionSet: string = this.node.tryGetContext('RegionSet') ?? 'ap-southeast-1,ap-northeast-1,us-east-1,us-west-2';

    const assetOutputPath = 'assets-output/';

    const sourceOutput = new Artifact();
    const buildOutput = new Artifact();
    const publishCodeBuildProject = new PipelineProject(this, 'PublishCloudFormation', {
      environment: {
        buildImage: LinuxBuildImage.STANDARD_5_0,
        computeType: ComputeType.SMALL,
        privileged: true,
      },
      buildSpec: BuildSpec.fromObjectToYaml({
        version: '0.2',
        env: {
          shell: 'bash',
          variables: {
            BSS_TEMPLATE_BUCKET_NAME: assetBucket.bucketName,
            BSS_IMAGE_ASSET_REPOSITORY_NAME: appName,
            FILE_ASSET_PREFIX: fileAssetsPrefix,
            REGIONS: regionSet,
          },
        },
        phases: {
          install: {
            'on-failure': 'ABORT',
            'runtime-versions': {
              nodejs: '14',
            },
            'commands': [
              'npm install -g cdk-assets',
            ],
          },
          pre_build: {
            'on-failure': 'ABORT',
            'commands': [
              'export BSS_FILE_ASSET_PREFIX="${FILE_ASSET_PREFIX}${BUILD_VERSION}/"',
              `
              #!/bin/bash
              set -euxo
              
              create_repo() {
                local name=$1
                local region=$2
              
                # create ecr repo
                aws ecr create-repository --region $region --repository-name "$name" --image-tag-mutability IMMUTABLE --image-scanning-configuration scanOnPush=true --encryption-configuration encryptionType=KMS 2>/dev/null
              
              set +e
              # set repo permission
              read -r -d '' POLICY_TEXT << EOM
{
  "Version": "2008-10-17",
  "Statement": [
  	{
  	  "Sid": "public statement",
  	  "Effect": "Allow",
  	  "Principal": "*",
  	  "Action": [
  	    "ecr:BatchCheckLayerAvailability",
  	    "ecr:BatchGetImage",
        "ecr:GetDownloadUrlForLayer"
  	  ]
  	}
  ]
}
EOM
              set -e
              
                aws ecr set-repository-policy --region $region --repository-name "$name" --policy-text "$POLICY_TEXT" 2>/dev/null
              }
              
              create_s3_bucket() {
                  local name=$1
                  local region=$2
                  
                  EXIT_CODE=0
                  aws s3 ls s3://$name --region $region || EXIT_CODE=$?
                  if [[ $EXIT_CODE -eq 0 ]]; then
                    echo "The bucket with name '$name' already exists."
                  else
                    aws s3 mb "s3://$name" --region $region
              	    echo "The bucket with name '$name' is created in region '$region'."
                  fi
              }
              
              create_s3_bucket "$BSS_TEMPLATE_BUCKET_NAME" "us-east-1"
              
              for i in \${REGIONS//,/ }
              do
                  echo "Prepase S3 resource in region '$i'"
                  create_s3_bucket "$BSS_TEMPLATE_BUCKET_NAME-$i" "$i"
              done
              
              for i in \${REGIONS//,/ }
              do
                  echo "Initial ECR repo in region '$i'"
                  
                  EXISTINGREPO=$(aws ecr describe-repositories --region $i --repository-names $BSS_IMAGE_ASSET_REPOSITORY_NAME --query 'repositories[].repositoryName' 2>/dev/null|jq '.[]'|jq '.')
                  if [[ -z $EXISTINGREPO ]]
                  then
              	    create_repo "$BSS_IMAGE_ASSET_REPOSITORY_NAME" "$i"
              	    echo "The repo with name '$BSS_IMAGE_ASSET_REPOSITORY_NAME' is created in region '$i'."
                  else
              	    echo "The repo with name '$BSS_IMAGE_ASSET_REPOSITORY_NAME' already exists in region '$i'."
                  fi
              done
              `,
            ],
          },
          build: {
            'on-failure': 'ABORT',
            'commands': [
              `
              #!/bin/bash
              set -euxo pipefail
              
              cdk_assets_publish() {
                local assetsPath=$1
                echo "publish assets in '$assetsPath'"

                for path in \`ls "$assetsPath"*.assets.json\`
                do
                  echo "publish assets defined in file '$path'"
                  cdk-assets publish -p "$path" -v
                done
              }
              
              cdk_assets_publish ${assetOutputPath}
              `,
            ],
          },
          post_build: {
            'on-failure': 'ABORT',
            'commands': [
              `
              #!/bin/bash
              set -euxo pipefail
              
              publish_s3_assets() {
                local name=$1
                local prefix=$2
                local region=$3

                KEY=\`aws s3api list-objects-v2 --bucket "$name" --prefix "$prefix" --max-item 1 --region $region | jq -r '.Contents[0].Key'\`
                if [ ! -z "$KEY" ]; then
                  aws s3 ls s3://$name/$prefix --recursive --region $region | awk '{print $4}' | xargs -I {} -n 1 aws s3api put-object-acl --region $region --acl public-read --bucket $name --key {}
                fi
              }

              
              publish_s3_assets "$BSS_TEMPLATE_BUCKET_NAME" "$BSS_FILE_ASSET_PREFIX" us-east-1
              
              for i in \${REGIONS//,/ }
              do
                  echo "Publish S3 resource in bucket '"$BSS_TEMPLATE_BUCKET_NAME-$i"'"
                  publish_s3_assets "$BSS_TEMPLATE_BUCKET_NAME-$i" "$BSS_FILE_ASSET_PREFIX" "$i"
              done
              `,
              `
              echo '======CloudFormation Url======'
              ls ${assetOutputPath}*.template.json | grep -v nested | sed 's/${assetOutputPath}/g' | cut -c 2- | xargs -I {} echo "https://${assetBucket.bucketName}.s3.${Aws.URL_SUFFIX}/\$BSS_FILE_ASSET_PREFIX{}"
              `,
            ],
          },
        },

      }),
    });
    publishCodeBuildProject.role!.attachInlinePolicy(new Policy(this, 'PublishPolicy', {
      statements: [
        new PolicyStatement({
          sid: 'ecr1',
          actions: [
            'ecr:GetAuthorizationToken',
          ],
          resources: [
            '*',
          ],
        }),
        new PolicyStatement({
          sid: 'ecr2',
          actions: [
            'ecr:ListImages',
            'ecr:BatchCheckLayerAvailability',
            'ecr:GetDownloadUrlForLayer',
            'ecr:GetRepositoryPolicy',
            'ecr:DescribeRepositories',
            'ecr:ListImages',
            'ecr:DescribeImages',
            'ecr:BatchGetImage',
            'ecr:InitiateLayerUpload',
            'ecr:UploadLayerPart',
            'ecr:CompleteLayerUpload',
            'ecr:PutImage',
            'ecr:CreateRepository',
            'ecr:SetRepositoryPolicy',
          ],
          resources: regionSet.split(',').map(r => Arn.format({
            service: 'ecr',
            region: r,
            resource: 'repository',
            resourceName: appName,
          }, Stack.of(this))),
        }),
        new PolicyStatement({
          sid: 's31',
          actions: [
            's3:ListBucket',
            's3:CreateBucket',
          ],
          resources: [
            ...regionSet.split(',').map(r => Arn.format({
              service: 's3',
              region: '',
              account: '',
              resource: `${assetBucket.bucketName}-${r}`,
            }, Stack.of(this))),
            assetBucket.bucketArn,
          ],
        }),
        new PolicyStatement({
          sid: 's32',
          actions: [
            's3:GetBucketAcl',
            's3:GetBucketLocation',
            's3:GetEncryptionConfiguration',
          ],
          resources: [
            ...regionSet.split(',').map(r => Arn.format({
              service: 's3',
              region: '',
              account: '',
              resource: `${assetBucket.bucketName}-${r}`,
            }, Stack.of(this))),
            assetBucket.bucketArn,
          ],
        }),
        new PolicyStatement({
          sid: 's33',
          actions: [
            's3:PutObject',
            's3:PutObjectAcl',
          ],
          resources: [
            ...regionSet.split(',').map(r => Arn.format({
              service: 's3',
              region: '',
              account: '',
              resource: `${assetBucket.bucketName}-${r}`,
              resourceName: `${fileAssetsPrefix}*`,
            }, Stack.of(this))),
            assetBucket.arnForObjects(`${fileAssetsPrefix}*`),
          ],
        }),
      ],
    }));
    new Pipeline(this, 'CDKToCloudFormationPublishPipeline', {
      stages: [
        {
          stageName: 'Source',
          actions: [
            new GitHubSourceAction({
              actionName: 'GitHub_Source',
              owner: 'aws-samples',
              repo: 'cdk-bootstrapless-synthesizer',
              branch: 'main',
              oauthToken: SecretValue.secretsManager(githubToken),
              output: sourceOutput,
            }),
          ],
        },
        {
          stageName: 'Build',
          actions: [
            new CodeBuildAction({
              actionName: 'CodeBuild',
              variablesNamespace: 'build',
              project: new PipelineProject(this, 'BuildApp', {
                environment: {
                  buildImage: LinuxBuildImage.STANDARD_5_0,
                  computeType: ComputeType.SMALL,
                  privileged: true,
                },
                buildSpec: BuildSpec.fromObjectToYaml({
                  version: '0.2',
                  env: {
                    'shell': 'bash',
                    'exported-variables': [
                      'BUILD_VERSION',
                    ],
                    'variables': {
                      USE_BSS: 'true',
                      BSS_TEMPLATE_BUCKET_NAME: assetBucket.bucketName,
                      BSS_FILE_ASSET_BUCKET_NAME: `${assetBucket.bucketName}-\${AWS::Region}`,
                      BSS_FILE_ASSET_REGION_SET: regionSet,
                      FILE_ASSET_PREFIX: fileAssetsPrefix,
                      BSS_IMAGE_ASSET_REPOSITORY_NAME: appName,
                      BSS_IMAGE_ASSET_ACCOUNT_ID: publishAccountId,
                      BSS_IMAGE_ASSET_REGION_SET: regionSet,
                    },
                  },
                  phases: {
                    install: {
                      'runtime-versions': {
                        nodejs: '14',
                      },
                      'commands': [
                        'yarn install --check-files --frozen-lockfile',
                        'npx projen',
                      ],
                    },
                    pre_build: {
                      commands: [
                        'export BUILD_VERSION="v1.$(date +"%Y%m%d%H%M")"',
                        'export BSS_FILE_ASSET_PREFIX="${FILE_ASSET_PREFIX}${BUILD_VERSION}/"',
                      ],
                    },
                    build: {
                      commands: [
                        `cd sample-pipeline; npx cdk synth AppStack --app "npx ts-node -P tsconfig.json --prefer-ts-exts src/app.ts" --json --output ${assetOutputPath} -q 2>/dev/null`,
                      ],
                    },
                  },
                  artifacts: {
                    'files': [
                      `${assetOutputPath}**/*`,
                    ],
                    'base-directory': 'sample-pipeline',
                  },
                }),
              }),
              input: sourceOutput,
              outputs: [
                buildOutput,
              ],
            }),
          ],
        },
        {
          stageName: 'Publish',
          actions: [
            new CodeBuildAction({
              actionName: 'CodeBuild',
              project: publishCodeBuildProject,
              environmentVariables: {
                BUILD_VERSION: {
                  type: BuildEnvironmentVariableType.PLAINTEXT,
                  value: '#{build.BUILD_VERSION}',
                },
              },
              input: buildOutput,
            }),
          ],
        },
      ],
    });

  }
}

const app = new App();
new CDKToCloudFormationPipelineStack(app, 'PipelineStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});