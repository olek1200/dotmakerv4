module.exports = ({ env }) => {
  return {
    settings: {
      logger: {
        level: 'error',
      },
      cache: {
        enabled: false,
        type: 'redis',
        models: [
          {
            model: 'races',
            routes: [
              '/races/:id/points-paging'
            ]
          },
        ],
        redisConfig: {
          host: env('REDIS_HOST'),
          port: env('REDIS_PORT')
        }
      },
      parser: {
        jsonLimit: "20mb",
        formLimit: "20mb",
        textLimit: "20mb",
        formidable: {
          maxFileSize: 20 * 1024 * 1024,
        }
      }
    }
  }
};
