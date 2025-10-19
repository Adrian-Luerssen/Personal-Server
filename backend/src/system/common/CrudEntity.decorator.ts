import { CrudOptions } from "@nestjsx/crud/lib/interfaces";
import { Crud, CrudAuth } from "@nestjsx/crud";
import { all } from "deepmerge";
import { applyDecorators } from "@nestjs/common";
import { Account } from "../accounts/account.entity";

const CrudFactory = (commonOptions: CrudOptions) => (options: CrudOptions) => {
  return Crud(all<CrudOptions>([commonOptions, options]));
};
export const CrudEntity = CrudFactory({
  model: undefined, // required by interface, will be override
  params: {
    id: {
      type: "uuid",
      primary: true,
      field: "id",
    },
  },
});
const accountOwnedCrudOptions: () => CrudOptions = () => ({
  model: undefined, // required by interface, will be override
  params: {
    id: {
      type: "uuid",
      primary: true,
      field: "id",
    },
  },
  query: {
    join: {
      account: {
        required: true,
        eager: true,
      },
    },
  },
});
export const CrudAccountAuth = () => {
  return CrudAuth({
    property: "account",
    filter: (account: Account) => {
      return { "account.id": account.id };
    },
  });
};

export const CrudAccountOwnedEntity = (commonOptions: CrudOptions) => {
  return applyDecorators(
    Crud(
      all<CrudOptions>([accountOwnedCrudOptions(), commonOptions])
    ) as ClassDecorator,
    CrudAuth({
      property: "account",
      filter: (account: Account) => {
        return { "account.id": account.id };
      },
    }) as ClassDecorator
  );
};
