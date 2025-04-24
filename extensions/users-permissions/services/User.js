'use strict';

module.exports = {
  /**
   * This function is there to populate field 'races'.
   * Promise to fetch authenticated user.
   * @return {Promise}
   */
  fetchAuthenticatedUser(id) {
    return strapi.query('user', 'users-permissions').findOne({ id }, ['role', 'races']);
  },
};
