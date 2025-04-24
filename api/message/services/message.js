/* eslint-disable max-len */

'use strict';

const moment = require('moment');
const { checkIfPointInCircle } = require('../../../helpers/sphericalGeometryFunctions');
const { checkpointConfirmationRadiusInMeters } = require('../../../constants/common');
const { saveMessagesWithReportCodes } = require('../../../constants/flespiConfigs');

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/concepts/services.html#core-services)
 * to customize this service
 */

module.exports = {
  /**
   * Promise to add record
   *
   * @return {Promise}
   */

  async create(data) {
    // filter only messages with specific report codes
    const filteredData = data.filter((item) => saveMessagesWithReportCodes.includes(item['report.code']));
    const allPromises = filteredData.map(async (item) => {
      const parsedData = {
        deviceId: item['device.id'],
        imei: item.ident,
        batteryLevel: item['battery.level'],
        positionLatitude: item['position.latitude'],
        positionLongitude: item['position.longitude'],
        positionSpeed: item['position.speed'],
        positionTimestamp: item['position.timestamp'] * 1000,
        timestamp: item.timestamp * 1000,
        reportCode: item['report.code'],
      };

      // Add entry and race id
      const { entry } = await strapi
        .query('tracker')
        .findOne({ imei: item.ident }) ?? {};
      if (entry) {
        const { id: entryId, race: raceId } = entry;
        parsedData.entry = entryId;
        parsedData.race = raceId;
      }

      // Changes undefined to null, postgres don't like undefined.
      Object.entries(parsedData).forEach(([key, value]) => {
        if (value === undefined || Number.isNaN(value)) {
          parsedData[key] = null;
        }
      });

      if (entry && parsedData.positionTimestamp
        && parsedData.positionLongitude && parsedData.positionLatitude) {
        const raceId = parsedData.race;
        const entryId = parsedData.entry;
        const checkpoints = await strapi.query('checkpoint').find({ 'race.id': raceId }, ['checkpoint_entries']);

        if (checkpoints.length > 0) {
          const { startDateTime } = await strapi.query('entry').findOne({ id: entryId }, []);
          const checkpointEntries = [];
          checkpoints.forEach((checkpoint) => {
            if (!checkpoint.checkpoint_entries
              .find(checkpointEntry => checkpointEntry.entry === entryId)) {
              if (checkIfPointInCircle(
                {
                  lat: parsedData.positionLatitude,
                  lng: parsedData.positionLongitude,
                },
                {
                  lat: checkpoint.latitude,
                  lng: checkpoint.longitude,
                },
                // in meters
                // todo: remove fixed checkpoint value
                checkpoint.id === 350 ? 100 : checkpointConfirmationRadiusInMeters,
              )) {
                checkpointEntries.push({
                  timeInSeconds: moment(parsedData.positionTimestamp).diff(moment(startDateTime), 'seconds'),
                  checkpoint: checkpoint.id,
                  entry: entryId,
                  crossingDateTime: moment(parsedData.positionTimestamp).format(),
                });
              }
            }
          });
          if (checkpointEntries.length > 0) {
            // eslint-disable-next-line no-console
            await strapi.services['checkpoint-entry'].bulkCreate(checkpointEntries).catch((e) => console.log(e));
          }
        }
      }
      if (parsedData.positionTimestamp) {
        const validData = await strapi.entityValidator.validateEntityCreation(
          strapi.models.message,
          parsedData,
        );
        return strapi.query('message').create(validData);
      }
      return undefined;
    });

    await Promise.all(allPromises);

    return { status: 'ok' };
  },
};
