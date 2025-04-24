'use strict';


const { sanitizeEntity } = require('strapi-utils');


/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  async find(ctx) {
    let entities;

    if (ctx.query._q) { // eslint-disable-line no-underscore-dangle
      entities = await strapi.services.entry.search(ctx.query, ['category']);
    } else {
      entities = await strapi.services.entry.find(ctx.query, ['category']);
    }

    return entities.map(
      entity => sanitizeEntity(entity, { model: strapi.models.entry })
    );
  },

  async loadCsv(ctx) {
    const { body } = ctx.request;

    return strapi.services.entry.bulkCreate(body.entries);
  },
};
