const { parse } = require('pg-connection-string');


module.exports = ({ env }) => {
  const {
    host, port, database, user, password,
  } = parse(env('DATABASE_URL'));

  return {
    defaultConnection: 'default',
    connections: {
      default: {
        connector: 'bookshelf',
        settings: {
          client: 'postgres',
          host: `/cloudsql/${env('INSTANCE_CONNECTION_NAME')}`,
          database,
          username: user,
          password,
        },
        options: {
          debug: false,
          acquireConnectionTimeout: 300000,
          pool: {
            min: 1,
            max: 20,
            acquireTimeoutMillis: 300000,
            createTimeoutMillis: 300000,
            idleTimeoutMillis: 300000,
            reapIntervalMillis: 10000,
            createRetryIntervalMillis: 2000,
          },
        },
      },
    },
  };
};
