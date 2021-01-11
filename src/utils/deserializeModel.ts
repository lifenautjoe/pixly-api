import { plainToClass } from 'class-transformer';

// eslint-disable-next-line @typescript-eslint/ban-types
type Constructor<T extends {} = {}> = new (...args: any[]) => T;

// Converts a model json data into its class representation
export default function deserializeModel<DataType, ModelType>(data: DataType, model: Constructor<ModelType>): ModelType {
  return plainToClass(model, data) as ModelType;
}
