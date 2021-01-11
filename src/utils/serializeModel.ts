import { classToPlain } from 'class-transformer';

// Converts a model into its json data representation
export default function serializeModel<ModelType, DataType>(instance: ModelType): DataType {
  return classToPlain(instance) as DataType;
}
