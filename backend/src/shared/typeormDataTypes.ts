import { ColumnOptions, ValueTransformer } from 'typeorm';

const bigintTransformer: ValueTransformer = {
  to: (entityValue: number) => entityValue,
  from: (databaseValue: string): number | null => {
    if (databaseValue === null) {
      return null;
    }
    return parseFloat(databaseValue);
  },
};

export const bigInt: (c?: ColumnOptions) => ColumnOptions = (c) => ({
  type: 'decimal',
  transformer: bigintTransformer,
  ...(c ? c : {}),
});
