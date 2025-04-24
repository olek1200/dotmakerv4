module.exports = async () => {
  const knex = strapi.connections.default;
  let table;
  console.log('Starting...');
  await knex.schema.table('messages', (t) => {
    console.log('Table...');

    table = t;
    table.index(['deviceId'], 'idx_device_id');
  });

  await knex.raw(
    'CREATE INDEX IF NOT EXISTS idx_race_position_timestamp ON public.messages USING btree ' +
    '(race ASC NULLS LAST, "positionTimestamp" DESC NULLS LAST) TABLESPACE pg_default'
  );

  if (!table) {
    throw Error('Failed');
  }
  console.log('End...');
};
