module.exports = ({ env }) => {
  const defaultConnection = {
    connector: 'bookshelf',
    settings: {
      client: 'sqlite',
      filename: env('DATABASE_FILENAME', '.tmp/data.db'),
    },
    options: {
      debug: env.bool('DB_DEBUG', false),
      useNullAsDefault: true,
      autoMigration: true,
    },
  };
  return {
    defaultConnection: 'default',
    connections: {
      default: defaultConnection,
    },
  };
};
