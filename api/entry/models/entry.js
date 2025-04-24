'use strict';


const { sanitizeEntity } = require('strapi-utils');

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#lifecycle-hooks)
 * to customize this model
 */

module.exports = {

  /**
   * Retrieve records.
   *
   * @return {Array}
   */

  async find(ctx) {
    let entities;
    if (ctx.query._q) { // eslint-disable-line no-underscore-dangle
      entities = await strapi.services.entry.search(ctx.query, ['category']);
    } else {
      entities = await strapi.services.entry.find(ctx.query, ['category']);
    }

    return entities.map(entity => sanitizeEntity(entity, { model: strapi.models.entry }));
  },

  /**
   * Retrieve a record.
   *
   * @return {Object}
   */

  async findOne(ctx) {
    const { id } = ctx.params;

    const entity = await strapi.services.entry.findOne({ id }, ['category']);
    return sanitizeEntity(entity, { model: strapi.models.entry });
  },
};
