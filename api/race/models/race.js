/* eslint-disable no-param-reassign */

'use strict';

const slugify = require('slugify');

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#lifecycle-hooks)
 * to customize this model
 */

const calcCrow = (item1, item2) => {
  const toRad = (val) =>
  {
    return val * Math.PI / 180;
  }

  const R = 6371; // km
  const dLat = toRad(item2.latitude-item1.latitude);
  const dLon = toRad(item2.longitude-item1.longitude);
  const lat1 = toRad(item1.latitude);
  const lat2 = toRad(item2.latitude);

  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

const calculateDistances = (routes) => {
  const response = [];
  routes?.forEach((item, idx, array) => {
    if (idx < 1) {
      item.distanceFromStart = 0;
      item.distanceFromPrevious = 0;
      response.push({...item});
      return;
    }
    let prev = array[idx - 1];
    let distance = calcCrow(prev, item);
    item.distanceFromPrevious = distance;
    item.distanceFromStart = prev.distanceFromStart + distance;
    response.push({...item});
  })

  return response;
}

module.exports = {
  /**
   * Triggered before user creation.
   */
  lifecycles: {
    async beforeCreate(data) {
      if (!data.slug) {
        data.slug = slugify(data.name, { lower: true });
      }

      data.route = calculateDistances(data.route);
    },
    async beforeUpdate(params, data) {
      if (data.slug === null) {
        try {
          data.slug = slugify(data.name, { lower: true });
        } catch (e) {
          throw new Error('slug can\'t be null');
        }
      }
      data.route = calculateDistances(data.route);
    },
  },
};
