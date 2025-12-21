export const preview = {
  previewTime: {
    actions: {
      previewrequest: ({ detail }: Pick<CustomEvent<any>, 'detail'> = { detail: 0 }): number => +detail,
    },
  },
};
