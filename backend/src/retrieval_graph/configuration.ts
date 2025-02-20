import { Annotation } from '@langchain/langgraph';
import { RunnableConfig } from '@langchain/core/runnables';
import {
  BaseConfigurationAnnotation,
  ensureBaseConfiguration,
} from '../shared/configuration.js';

/**
 * The configuration for the agent.
 */
export const AgentConfigurationAnnotation = Annotation.Root({
  ...BaseConfigurationAnnotation.spec,

  // models
  /**
   * The language model used for processing and refining queries.
   * Should be in the form: provider/model-name.
   */
  queryModel: Annotation<string>,
});

/**
 * Create a typeof ConfigurationAnnotation.State instance from a RunnableConfig object.
 *
 * @param config - The configuration object to use.
 * @returns An instance of typeof ConfigurationAnnotation.State with the specified configuration.
 */
export function ensureAgentConfiguration(
  config: RunnableConfig,
): typeof AgentConfigurationAnnotation.State {
  const configurable = (config?.configurable || {}) as Partial<
    typeof AgentConfigurationAnnotation.State
  >;
  const baseConfig = ensureBaseConfiguration(config);
  return {
    ...baseConfig,
    queryModel: configurable.queryModel || 'openai/gpt-4o',
  };
}
