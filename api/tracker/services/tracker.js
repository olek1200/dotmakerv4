'use strict';

const {
  createDevice,
  addDeviceToChanel,
  configureTracking,
  deleteDevice,
} = require('../../../flespiApi');


module.exports = {
  /**

   * Promise to add record
   *
   * @return {Promise}
   */

  async create(data) {
    let deviceId;
    if (!data.imei || !data.trackerNumber || !data.phoneNumber) {
      return {
        status: 500,
        statusText: 'Internal Server Error',
        errorSource: 'flespi',
        errors: { message: 'At least one of these three parameters: tracker number, IMEI or phone number is not provided' },
      };
    }
    try {
      const flespiResponse = await createDevice(data);
      deviceId = flespiResponse.data.result[0].id;
      await addDeviceToChanel(deviceId);
      await configureTracking(deviceId);
    } catch (error) {
      return {
        isError: true,
        status: error.response.status,
        statusText: error.response.statusText,
        errorSource: 'flespi',
        errors: error.response.data.errors,
      };
    }

    const enhancedData = {
      ...data,
      deviceId,
    };
    try {
      const validData = await strapi.entityValidator.validateEntityCreation(
        strapi.models.tracker,
        enhancedData,
      );
      const entry = await strapi.query('tracker').create(validData);
      return entry;
    } catch (error) {
      return {
        isError: true,
        status: 500,
        statusText: error.response.statusText,
        errorSource: 'strapi',
        errors: { message: error.message },
      };
    }
  },


  /**
   * Promise to edit record
   *
   * @return {Promise}
   */

  async update(params, data) {
    const validData = await strapi.entityValidator.validateEntityUpdate(
      strapi.models.tracker,
      data
    );

    const entry = await strapi.query('tracker').update(params, validData);
    return entry;
  },

  /**
   * Promise to delete a record
   *
   * @return {Promise}
   */

  async delete(params) {
    try {
      await deleteDevice(params.deviceId);
    } catch (error) {
      return {
        isError: true,
        status: error.response.status,
        statusText: error.response.statusText,
        errorSource: 'flespi',
        errors: error.response.data.errors,
      };
    }
    return strapi.query('tracker').delete({ id: params.id });
  },
};
