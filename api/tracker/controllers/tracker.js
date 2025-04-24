'use strict';

const { parseMultipartData, sanitizeEntity } = require('strapi-utils');


function handleError(ctx, entity) {
  if (entity.isError) {
    ctx.throw(entity.status, entity.statusText, {
      data: {
        errorSource: entity.errorSource,
        errors: entity.errors,
      },
    });
  }
}

module.exports = {
  /**
   * Create a record.
   *
   * @return {Object}
   */

  async create(ctx) {
    let entity;
    if (ctx.is('multipart')) {
      const { data, files } = parseMultipartData(ctx);
      entity = await strapi.services.tracker.create(data, { files });
    } else {
      entity = await strapi.services.tracker.create(ctx.request.body);
    }
    handleError(ctx, entity);
    return sanitizeEntity(entity, { model: strapi.models.tracker });
  },

  /**
   * Retrieve a record.
   *
   * @return {Object}
   */

  async findOne(ctx) {
    const { imei, trackerNumber } = ctx.query;
    let entity;

    if (imei && !trackerNumber) {
      entity = await strapi.services.tracker.findOne({ imei });
    } else if (!imei && trackerNumber) {
      entity = await strapi.services.tracker.findOne({ trackerNumber });
    } else {
      entity = await strapi.services.tracker.findOne(ctx.query);
    }

    return sanitizeEntity(entity, { model: strapi.models.tracker });
  },

  /**
   * Update a record.
   *
   * @return {Object}
   */

  async update(ctx) {
    const {
      imei, trackerNumber, id, ...body
    } = ctx.request.body;
    let entity;

    if (id) {
      entity = await strapi.services.tracker.update({ id }, { trackerNumber });
    } else if (imei && trackerNumber) {
      entity = await strapi.services.tracker.update({ trackerNumber, imei }, body);
    } else if (!trackerNumber) {
      entity = await strapi.services.tracker.update({ imei }, body);
    } else if (!imei) {
      entity = await strapi.services.tracker.update({ trackerNumber }, body);
    } else if (!imei && !trackerNumber && !id) {
      handleError(ctx, {
        status: 500,
        statusText: 'Internal Server Error',
        errorSource: 'strapi',
        errors: { message: 'No tracker number, IMEI or id was provided' },
      });
    }
    return sanitizeEntity(entity, { model: strapi.models.tracker });
  },

  /**
   * Delete a record.
   *
   * @return {Object}
   */

  async delete(ctx) {
    const entity = await strapi.services.tracker.delete(ctx.query);
    handleError(ctx, entity);
    return sanitizeEntity(entity, { model: strapi.models.tracker });
  },
};
