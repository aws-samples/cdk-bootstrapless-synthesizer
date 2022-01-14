import { IAspect, Stack, Arn } from 'aws-cdk-lib';
import { TaskDefinition, CfnTaskDefinition } from 'aws-cdk-lib/aws-ecs';
import { Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { SageMakerCreateTrainingJob } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { IConstruct } from 'constructs';

const FN_SUB = 'Fn::Sub';
/**
 * Configuration properties for ECRRepositoryAspect
 */
export interface ECRRepositoryAspectProps {
  /**
   * Override the ECR repository account id of the Docker Image assets
   *
   * @default - process.env.BSS_IMAGE_ASSET_ACCOUNT_ID
   */
  readonly imageAssetAccountId?: string;
}

/**
 * Abtract aspect for ECR repository.
 *
 * You must provide the account id in props or set BSS_IMAGE_ASSET_ACCOUNT_ID in env
 */
export abstract class ECRRepositoryAspect implements IAspect {

  static readonly _repoPolicies = new Map<string, Policy>();
  readonly account: string;

  constructor(props: ECRRepositoryAspectProps = {}) {
    this.account = props.imageAssetAccountId ?? process.env.BSS_IMAGE_ASSET_ACCOUNT_ID!;
  }

  abstract visit(construct: IConstruct): void;

  protected getRepoName(imageUri: string): string | undefined {
    const matches = /\d{12}\.dkr\.ecr\..*\/(.*):.*/g.exec(imageUri);
    if (matches) {
      return matches[1];
    }
    return undefined;
  }

  protected crossAccountECRPolicy(stack: Stack, repoName: string): Policy {
    const policy = ECRRepositoryAspect._repoPolicies.get(repoName);
    if (policy) {return policy;}

    const newPolicy = new Policy(stack, `CrossAccountECR-${repoName}`, {
      statements: [
        new PolicyStatement({
          actions: [
            'ecr:BatchCheckLayerAvailability',
            'ecr:GetDownloadUrlForLayer',
            'ecr:BatchGetImage',
          ],
          resources: [
            Arn.format({
              account: this.account,
              service: 'ecr',
              resource: 'repository',
              resourceName: repoName,
            }, stack),
          ],
        }),
      ],
    });
    ECRRepositoryAspect._repoPolicies.set(repoName, newPolicy);
    return newPolicy;
  }
}

/**
 * Process the image assets in ECS task definition
 */
export class ECSTaskDefinition extends ECRRepositoryAspect {

  constructor(props: ECRRepositoryAspectProps = {}) {
    super(props);
  }

  protected hasBeReplaced(prop : CfnTaskDefinition.ContainerDefinitionProperty): string | undefined {
    if (typeof prop.image === 'object' && FN_SUB in prop.image &&
      (prop.image[FN_SUB] as string).indexOf(this.account) > -1) {
      return prop.image[FN_SUB];
    } else if (prop.image && (prop.image as string) && prop.image.indexOf(this.account) > -1) {return prop.image;}
    return undefined;
  }

  public visit(construct: IConstruct): void {
    if (construct instanceof TaskDefinition) {
      const containers = construct.stack.resolve((construct.node.defaultChild as CfnTaskDefinition).containerDefinitions);
      let imageUri = undefined;
      if (containers instanceof Array) {
        for (const container of containers) {
          if (container as CfnTaskDefinition.ContainerDefinitionProperty) {
            imageUri = this.hasBeReplaced(container);
            if (imageUri) {break;}
          }
        }
      } else if (containers as CfnTaskDefinition.ContainerDefinitionProperty) {
        imageUri = this.hasBeReplaced(containers);
      }

      if (imageUri) {
        const repoName = this.getRepoName(imageUri);
        if (repoName) {
          construct.executionRole!.attachInlinePolicy(this.crossAccountECRPolicy(construct.stack, repoName));
        }
      }
    }
  }
}

/**
 * Process the image assets in SageMaker training job in Step Functions
 */
export class StepFunctionsSageMakerTrainingJob extends ECRRepositoryAspect {
  constructor(props: ECRRepositoryAspectProps = {}) {
    super(props);
  }

  public visit(construct: IConstruct): void {
    if (construct instanceof SageMakerCreateTrainingJob) {
      const stack = Stack.of(construct);
      const state = construct.toStateJson() as {Parameters: {AlgorithmSpecification: {TrainingImage: any}}};
      const image = stack.resolve(state.Parameters.AlgorithmSpecification.TrainingImage);
      if (FN_SUB in image) {
        const repoName = this.getRepoName(image[FN_SUB]);
        if (repoName) {
          construct.role.attachInlinePolicy(this.crossAccountECRPolicy(stack, repoName));
        }
      }
    }
  }
}

/**
 * Default ECR asset aspect, support using ECR assets in below services,
 *
 * - ECS task definition
 * - SageMaker training job in Step Functions
 */
export class CompositeECRRepositoryAspect extends ECRRepositoryAspect {

  readonly _aspects: ECRRepositoryAspect[];

  constructor(props: ECRRepositoryAspectProps = {}) {
    super(props);
    this._aspects = [
      new ECSTaskDefinition(props),
      new StepFunctionsSageMakerTrainingJob(props),
    ];
  }

  visit(construct: IConstruct): void {
    for (const _aspect of this._aspects) {
      _aspect.visit(construct);
    }
  }
}