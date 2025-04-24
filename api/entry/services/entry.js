'use strict';


/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-services)
 * to customize this service
 */

module.exports = {
  async bulkCreate(data) {
    const knex = strapi.connections.default;
    return knex('entries').insert(data);
  },
  /**
   * Promise to fetch all records
   *
   * @return {Promise}
   */
  async find(params, populate) {
    /* eslint-disable no-underscore-dangle */
    const knex = strapi.connections.default;
    let results;

    /* If you are not connected to PostgreSQL development database, function below will
    not work which will result in incorrect sorting of startingNumber field in admin panel. */
    if (process.env.DATABASE_URL) {
      /* This code implements custom sorting of the startingNumber variable.
      This sorting is needed to properly sort numbers stored in string format.
      Few words for the code in orderByRaw:
      Here is the link for the whole case: https://stackoverflow.com/a/8502570.
      In a nutshell - regexp_replace() replace all non-digits with null, so only
      digits remain.
      This is done in order to avoid exceptions, while casting on integer later.
      Then everything is cast into integer and sorted in order set by 'order' variable.
      Then the second sorting criteria is just "startingNumber" which sorts fields with
      strings only, in order set by 'order' variable. */
      const sortingRule = params._sort;
      if (sortingRule && sortingRule.includes('startingNumber')) {
        const offset = params._start;
        const limit = params._limit;
        const order = sortingRule.includes('ASC') === true ? 'ASC' : 'DESC';
        const filters = [];

        params._where.map((array) => Object.entries(array).forEach(([key, value]) => {
          const newKey = key.split('_')[0];
          filters.push([newKey, value]);
        }));

        /* We join entries and categories table in order to simulate the behaviour
        of populating tables, in standard strapi query, into our custom query made with knex */
        results = await knex('entries')
          .select(
            'entries.*',
            'categories.name',
            'categories.color',
            'categories.shortName',
          )
          .join('categories', { 'categories.id': 'entries.category' })
          .modify((queryBuilder) => {
            if (limit && offset) {
              queryBuilder.limit(limit).offset(offset);
            }
          })
          .where((builder) => {
            filters.forEach(([key, value]) => {
              if (key === 'race') {
                builder.where(`entries.${key}`, value);
              } else if (key === 'category') {
                builder.where(`categories.${key}`, value);
              } else {
                builder.where(key, 'ilike', `%${value}%`);
              }
            });
          })
          .orderByRaw(`
        NULLIF(regexp_replace("startingNumber", '\\D', '', 'g'), '')::int ${order}, "startingNumber" ${order}`);

        /* We parse results in order to make the data structure fetched with our custom query
        similar to data fetched with standard strapi query */
        const parsedResults = results.map(({
          category, name, color, shortName, ...restOfEntry
        }) => ({
          ...restOfEntry,
          category: {
            id: category,
            name,
            color,
            shortName,
          },
        }));

        return parsedResults;
      }
    }
    /* eslint-enable no-underscore-dangle */
    return strapi.query('entry').find(params, populate);
  },
};
