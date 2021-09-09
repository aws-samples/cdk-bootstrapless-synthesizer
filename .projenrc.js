const { JsiiProject, github } = require('projen');

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
});

const gh = new github.GitHub(project);
const wf = gh.addWorkflow('build-sample');
wf.on({
  pull_request: {},
  workflow_dispatch: {},
});
wf.addJobs({
  'build-sample': {
    'runs-on': 'ubuntu-latest',
    'permissions': {
      contents: 'read',
    },
    'steps': [
      { uses: 'actions/checkout@v2' },
      {
        uses: 'actions/setup-node@v1',
        with: {
          'node-version': '12',
        },
      },
      { run: 'cd sample && yarn && yarn synth' },
    ],
  },
});

project.package.addField('resolutions', {
  'trim-newlines': '3.0.1',
});

project.synth();
