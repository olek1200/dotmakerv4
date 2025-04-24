'use strict';

const moment = require('moment');
/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-services)
 * to customize this service
 */


async function askDbForPoints(id) {
  const knex = strapi.connections.default;
  // const result = await knex.raw(
  // eslint-disable-next-line max-len
  // 'SELECT messages.id, messages."batteryLevel", messages."positionSpeed", messages.entry, messages."positionLatitude", messages."positionLongitude", messages."positionTimestamp"'
  // + 'FROM messages'
  // + '  INNER JOIN (SELECT entry, MAX("positionTimestamp") AS "maxTimestamp"'
  // + '    FROM messages'
  // + '    WHERE "positionLatitude" IS NOT NULL'
  // + '    AND race = ?'
  // + '    GROUP BY entry)'
  // + '    AS "innerMessages"'
  // + '  ON "innerMessages".entry = messages.entry'
  // + '  AND "innerMessages"."maxTimestamp" = messages."positionTimestamp"'
  // + '  AND "positionLatitude" IS NOT NULL'
  // + '  AND race = ?;',
  // [id, id]
  // );
  // return lodash.groupBy(result.rows, 'entry');

  const result = await knex.raw(
    'SELECT messages.id, messages."batteryLevel", messages."positionSpeed", messages.entry, messages."positionLatitude", messages."positionLongitude", messages."positionTimestamp"'
    + '  FROM messages'
    + '  WHERE "positionLatitude" IS NOT NULL'
    + '  AND race = ?'
    + '  ORDER BY entry, "positionTimestamp" DESC;',
    id
  );
  const latestElements = {};
  result.rows.forEach((row) => {
    // elements are sorted, so we take the first entry will be the correct one
    if (!(row.entry in latestElements)) {
      latestElements[row.entry] = [row];
    }
  });
  return latestElements;
}

const pointsCache = {};

const checkpointsCache = {};

const entriesCache = {};

const replayInfoCache = {};

module.exports = {
  async getPoints({ id }) {
    if (pointsCache[id] === undefined) {
      pointsCache[id] = {
        updateStartTime: moment(),
        lastUpdatedTime: moment(),
        data: {},
      };
    } else if (moment().diff(pointsCache[id].lastUpdatedTime, 'seconds') > 150) {
      if (moment().diff(pointsCache[id].updateStartTime, 'seconds') > 150) {
        const updateStartTime = moment();
        pointsCache[id].updateStartTime = updateStartTime;
        const pointsData = await askDbForPoints(id);
        pointsCache[id] = {
          updateStartTime,
          lastUpdatedTime: moment(),
          data: pointsData,
        };
      }
    }
    return pointsCache[id].data;
  },

  async getReplayInfo({ id }) {
    if (replayInfoCache[id] === undefined || moment().diff(replayInfoCache[id].lastUpdatedTime, 'seconds') > 30) {
      const points = await strapi.query('message').count({
        'race.id': id,
        positionTimestamp_null: false,
        positionLatitude_null: false,
      });
      const { startDateTime, finishDateTime } = await strapi.query('race').findOne({ id });
      const lastPoint = await strapi.query('message').findOne({
        'race.id': id,
        positionTimestamp_null: false,
        positionLatitude_null: false,
        _sort: 'positionTimestamp:desc',
      }, []);
      replayInfoCache[id] = {
        lastUpdatedTime: moment(),
        data: {
          numberOfPoints: points,
          firstPointDate: startDateTime,
          lastPointDate: finishDateTime || lastPoint?.positionTimestamp,
        },
      };
    }
    return replayInfoCache[id].data;
  },

  async getCheckpoints({ id }) {
    if (checkpointsCache[id] === undefined || moment().diff(checkpointsCache[id].lastUpdatedTime, 'seconds') > 300) {
      const checkpointsData = await strapi.query('checkpoint').find({ 'race.id': id }, ['checkpoint_entries']);
      checkpointsCache[id] = {
        lastUpdatedTime: moment(),
        data: checkpointsData,
      };
    }
    return checkpointsCache[id].data;
  },

  async getEntries({ id }) {
    if (entriesCache[id] === undefined || moment().diff(entriesCache[id].lastUpdatedTime, 'seconds') > 150) {
      const raceEntries = await strapi.query('entry').find({ 'race.id': id, _limit: -1 }, []);
      entriesCache[id] = {
        lastUpdatedTime: moment(),
        data: raceEntries,
      };
    }
    return entriesCache[id].data;
  },
};
