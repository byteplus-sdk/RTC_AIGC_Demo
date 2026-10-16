# API Server

The Koa server generates RTC room tokens, injects provider credentials and calls BytePlus OpenAPI.

Configure the root `.env.local` following the [project README](../README.md#setup-and-configuration).

Start both services from the repository root:

```shell
npm run dev
```

For Flexible mode:

```shell
npm run dev:flexible
```

To start the API server separately:

```shell
npm run dev:server
```

The API server loads the root `.env.local` and listens on port `3001` by default.
