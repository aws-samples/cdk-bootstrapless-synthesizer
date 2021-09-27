const { JsiiProject, AwsCdkTypeScriptApp, github } = require('projen');

const project = new JsiiProject({
  description: 'Generate directly usable AWS CloudFormation template.',
  author: 'wchaws',
  authorOrganization: true,
  repository: 'https://github.com/aws-samples/cdk-bootstrapless-synthesizer.git',
  name: 'cdk-bootstrapless-synthesizer',
  codeCov: true,
  gitignore: [
    'cdk.out/',
    '/sample/lib',
    '!/sample/tsconfig.json',
  ],
  npmignore: [
    'sample/',
  ],
  releaseEveryCommit: true,
  defaultReleaseBranch: 'main',
  deps: [
    '@aws-cdk/cloud-assembly-schema',
    '@aws-cdk/cx-api',
    '@aws-cdk/core',
  ],
  peerDeps: [
    '@aws-cdk/cloud-assembly-schema',
    '@aws-cdk/cx-api',
    '@aws-cdk/core',
  ],
  publishToPypi: {
    distName: 'cdk-bootstrapless-synthesizer',
    module: 'cdk_bootstrapless_synthesizer',
  },
  jestOptions: {
    jestConfig: {
      testPathIgnorePatterns: [
        'sample/', // https://github.com/projen/projen/issues/1059
      ],
    },
  },
});

const sampleProject = new AwsCdkTypeScriptApp({
  parent: project,
  outdir: 'sample',
  cdkVersion: '1.124.0',
  defaultReleaseBranch: 'main',
  name: 'sample',
  licensed: false,
  github: false,

  cdkDependencies: [
    '@aws-cdk/aws-s3',
    '@aws-cdk/aws-lambda',
    '@aws-cdk/aws-apigateway',
    '@aws-cdk/aws-ecr-assets',
  ], /* Which AWS CDK modules (those that start with "@aws-cdk/") this app uses. */
  deps: [
    'cdk-bootstrapless-synthesizer',
  ], /* Runtime dependencies of this module. */
  // description: undefined,      /* The description is just a string that helps people understand the purpose of the package. */
  // devDeps: [],                 /* Build dependencies for this module. */
  // packageName: undefined,      /* The "name" in package.json. */
  // release: undefined,          /* Add release management to this project. */
});

const gh = new github.GitHub(project);
const wf = gh.addWorkflow('build-sample');
wf.on({
  pull_request: {},
  workflow_dispatch: {},
});
wf.addJobs({
  'build-sample': {
    runsOn: 'ubuntu-latest',
    permissions: {
      contents: 'read',
    },
    steps: [
      { uses: 'actions/checkout@v2' },
      {
        uses: 'actions/setup-node@v1',
        with: {
          'node-version': '12',
        },
      },
      { run: 'cd sample && yarn && yarn test' },
    ],
  },
});


project.package.addField('resolutions', {
  'trim-newlines': '3.0.1',
});

project.synth();
