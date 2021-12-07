const { JsiiProject, AwsCdkTypeScriptApp, github } = require('projen');

const project = new JsiiProject({
  description: 'Generate directly usable AWS CloudFormation template.',
  author: 'wchaws',
  authorOrganization: true,
  repository: 'https://github.com/aws-samples/cdk-bootstrapless-synthesizer.git',
  keywords: ['cdk', 'cloudformation', 'aws', 'synthesizer'],
  name: 'cdk-bootstrapless-synthesizer',
  codeCov: true,
  autoApproveOptions: {
    secret: 'GITHUB_TOKEN',
    allowedUsernames: ['dependabot[bot]'],
  },
  autoApproveUpgrades: true,
  depsUpgrade: true,
  gitignore: [
    'cdk.out/',
    '/sample/lib',
    '!/sample/tsconfig.json',
  ],
  npmignore: [
    'sample/',
    'scripts/',
  ],
  releaseEveryCommit: true,
  defaultReleaseBranch: 'main',
  majorVersion: 2,
  deps: [
    'aws-cdk-lib@2.0.0',
  ],
  peerDeps: [
    'aws-cdk-lib@2.0.0',
    'constructs@^10.0.5',
  ],
  devDeps: [
    'ansi-regex@6.0.1',
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
  minNodeVersion: '14.17.0',
});

const sampleProject = new AwsCdkTypeScriptApp({
  parent: project,
  outdir: 'sample',
  cdkVersion: '1.124.0',
  cdkVersionPinning: true,
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
    'cdk-bootstrapless-synthesizer@^0.9.0',
  ], /* Runtime dependencies of this module. */
  // description: undefined,      /* The description is just a string that helps people understand the purpose of the package. */
  devDeps: [
    'ansi-regex@6.0.1',
  ], /* Build dependencies for this module. */
  // packageName: undefined,      /* The "name" in package.json. */
  // release: undefined,          /* Add release management to this project. */
});

const gh = new github.GitHub(project, {
  pullRequestLint: false,
});
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


const readme = project.addTask('readme');
readme.exec('./scripts/extractdoc.py "sample/src/*.ts" README.md');
project.postCompileTask.spawn(readme);

project.synth();
