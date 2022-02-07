# Pipeline Example for CDK bootstrapless synthesizer

It's an example AWS CodePipeline to publish a CDK application with ECS container and API Gateway/Lambda 
to **one-click deployable** CloudForamtion templates.

## Prerequisites

- AWS Account with **disable** [Blocking public access to S3 objects][blocking-s3-public-access]
- Store your [Github token in secret manager][github-token] named `github-token` or any custom name

## Deploy pipeline

```bash
yarn install --check-files --frozen-lockfile
npx cdk deploy
# specify the custom secret name of your github token
npx cdk deploy -c GithubToken=<my-github-token>
```

## Release one-clickable CloudFormation for your CDK application

Release the pipeline name starting with `PipelineStack-CDKToCloudFormationPublishPipeline` in AWS CodePipeline.

[blocking-s3-public-access]: https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html
[github-token]: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_codepipeline_actions-readme.html#github