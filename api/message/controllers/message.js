'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/concepts/controllers.html#core-controllers)
 * to customize this controller
 */
const { parseMultipartData, sanitizeEntity } = require('strapi-utils');


module.exports = {
  async create(ctx) {
    const apiKey = ctx.get('x-api-key');
    if (process.env.FLESPI_AUTHORIZATION_KEY === apiKey) {
      let entity;
      if (ctx.is('multipart')) {
        const { data, files } = parseMultipartData(ctx);
        entity = await strapi.services.message.create(data, { files });
      } else {
        entity = await strapi.services.message.create(ctx.request.body);
      }
      return sanitizeEntity(entity, { model: strapi.models.message });
    }
    return ctx.response.unauthorized('Invalid token.');
  },
};
