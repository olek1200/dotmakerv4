module.exports = ({ env }) => ({
  email: {
    provider: 'mailjet',
    providerOptions: {
      publicApiKey: env('MAILJET_PUBLIC'),
      secretApiKey: env('MAILJET_SECRET'),
    },
    settings: {
      defaultFrom: env('DEFAULT_FROM'),
      defaultFromName: env('DEFAULT_FROM_NAME'),
      defaultTo: env('DEFAULT_TO'),
      defaultToName: env('DEFAULT_TO_NAME'),
    },
  },
  'migrations': {
    enabled: true,
    config: {
      autoStart: true,
      migrationFolderPath : 'migrations'
    },
  },
});
