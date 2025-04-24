const { parse } = require('pg-connection-string');


module.exports = ({ env }) => {
  let defaultConnection = {
    connector: 'bookshelf',
    settings: {
      client: 'sqlite',
      filename: env('DATABASE_FILENAME', '.tmp/data.db'),
    },
    options: {
      useNullAsDefault: true,
    },
  };
  const databaseUrl = env('DATABASE_URL');
  if (databaseUrl) {
    const {
      host, port, database, user, password,
    } = parse(databaseUrl);
    defaultConnection = {
      connector: 'bookshelf',
      settings: {
        client: 'postgres',
        host,
        port,
        database,
        username: user,
        password,
        ssl: false,
      },
      options: {
        autoMigration: true,
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
      }
    };
    if (host === 'localhost') {
      defaultConnection.settings.ssl = false;
    }
  }
  return {
    defaultConnection: 'default',
    connections: {
      default: defaultConnection,
    },
  };
};
