import { defineConfig } from 'orval';

const openApiSpecUrl =
  process.env.OPENAPI_SPEC_URL ?? 'http://localhost:8080/v3/api-docs';

export default defineConfig({
  oide: {
    input: {
      target: openApiSpecUrl,
      override: {
        transformer: './orval.transformer.ts',
      },
    },
    output: {
      target: './src/api/generated/client.ts',
      schemas: './src/api/generated/models',
      client: 'fetch',
      clean: true,
      baseUrl: {
        runtime: 'API_ORIGIN',
        imports: [
          {
            name: 'API_ORIGIN',
            importPath: '../apiConfig',
          },
        ],
      },
    },
  },
});
