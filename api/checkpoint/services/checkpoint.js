'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-services)
 * to customize this service
 */

module.exports = {
  /**
   * Promise to delete a record
   *
   * @return {Promise}
   */

  async delete(params) {
    await strapi.services['checkpoint-entry'].delete({ checkpoint: params });
    return strapi.query('checkpoint').delete({ id: params });
  },
};
