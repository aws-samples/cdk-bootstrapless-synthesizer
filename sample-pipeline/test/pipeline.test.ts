import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { CDKToCloudFormationPipelineStack } from '../src/pipeline';

test('Snapshot', () => {
  const stack = new CDKToCloudFormationPipelineStack(new App(), 'test');
  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();
});