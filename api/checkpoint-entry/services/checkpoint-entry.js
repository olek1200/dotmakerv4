'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-services)
 * to customize this service
 */

module.exports = {
  async bulkCreate(data) {
    const knex = strapi.connections.default;
    return knex('checkpoint_entries').insert(data);
  },
};
