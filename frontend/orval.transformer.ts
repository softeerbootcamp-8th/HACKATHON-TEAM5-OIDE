import { defineTransformer } from 'orval';

type ApiResponse = {
  content?: Record<string, unknown>;
};

type ApiOperation = {
  responses?: Record<string, ApiResponse>;
};

type ApiPath = Record<string, ApiOperation>;

export default defineTransformer((spec) => {
  const paths = (spec as { paths?: Record<string, ApiPath> }).paths;

  for (const path of Object.values(paths ?? {})) {
    for (const operation of Object.values(path)) {
      for (const response of Object.values(operation.responses ?? {})) {
        const wildcardContent = response.content?.['*/*'];
        if (!wildcardContent) continue;

        response.content = {
          ...response.content,
          'application/json': wildcardContent,
        };
        delete response.content['*/*'];
      }
    }
  }

  return spec;
});
