'use strict';

const { sanitizeEntity } = require('strapi-utils');
const moment = require('moment');
const fs = require('fs');
const { checkIfLineIntersectsCircle } = require('../../../helpers/sphericalGeometryFunctions');
const {
  checkpointConfirmationRadiusInMeters,
  recalculateCheckpointsMessageRowCount,
  fallbackPlaybackPagingIntervalInHours,
} = require('../../../constants/common');

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

const categorizeEntries = async (raceId) => {
  let entries = await strapi.services.race.getEntries({ id: raceId });
  entries = entries.sort((a, b) => {
    if (!a.finishDateTime || !a.startDateTime) {
      return 1;
    }
    if (!b.finishDateTime || !b.startDateTime) {
      return -1;
    }
    const aTime = moment(a.finishDateTime).diff(moment(a.startDateTime));
    const bTime = moment(b.finishDateTime).diff(moment(b.startDateTime));
    return aTime - bTime;
  });
  entries = entries.reduce((object, entry) => {
    const { category } = entry;
    if (object[category]) {
      return { ...object, [category]: [...object[category], entry] };
    }
    return { ...object, [category]: [entry] };
  }, {});
  Object.keys(entries).forEach(category => {
    entries[category] = entries[category].map((entry, i) => ({
      place: entry.finishDateTime ? i + 1 : null,
      ...entry,
    }));
  });
  return entries;
};

const categorizedEntries = {};

const categorizedEntriesForCheckpointsCache = {};

module.exports = {
  async points(ctx) {
    const { id } = ctx.params;

    return strapi.services.race.getPoints({ id });
  },

  async getReplayInfo(ctx) {
    const { id } = ctx.params;
    return strapi.services.race.getReplayInfo({ id });
  },

  async deleteRaceCache(ctx) {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { id } = ctx.params;
    try {
      fs.rmSync(`databaseCache/pointsPaging/${id}`, { recursive: true, force: true });
      return true;
    } catch (err) {
      return err;
    }
  },

  async getAllPointsWithPaging(ctx) {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { id } = ctx.params;

    const getPage = async (race, start, end, fetchLastPoints) => {
      try {
        const knex = strapi.connections.default;
        const query = 'SELECT ' +
        (fetchLastPoints ? 'DISTINCT on (messages."entry") ': '') +
        'messages."entry", messages."batteryLevel",  messages."positionTimestamp", messages."positionLatitude", messages."positionLongitude", messages."positionSpeed" ' +
        'FROM messages ' +
        'WHERE "positionLatitude" is not null and "positionLongitude" is not null and "positionTimestamp" >= to_timestamp(\'' + start +'\', \'YYYY-MM-DD HH24:MI:SS\') ' +
        (fetchLastPoints ? '' : ('and "positionTimestamp" <= to_timestamp(\''+ end +'\', \'YYYY-MM-DD HH24:MI:SS\') ')) +
        'and "race" = ' + race + ' ' +
        'ORDER BY messages.' +
        (fetchLastPoints ? '"entry"' : '"deviceId"') +
          ', messages."positionTimestamp" DESC';
        const res = await knex.raw(query);
        return res.rows;

      } catch (e){
        strapi.log.debug('error', e);
        return [];

      }
    };
    const format = 'YYYY-MM-DD HH:mm:ss';

    try {
      const timePage = ctx.request.url.split('?')[1].split('&')
        .find(param => param.includes('timePage'))?.split('=')[1];
      const isLive = ctx.request.url.split('?')[1].split('&')
        .find(param => param.includes('isLive'))?.split('=')[1];
      const interval = ctx.request.url.split('?')[1].split('&')
        .find(param => param.includes('interval'))?.split('=')[1] ?? fallbackPlaybackPagingIntervalInHours;
      const replayInfo = await strapi.services.race.getReplayInfo({ id });
      const raceStartTime = replayInfo.firstPointDate;
      const currentPageStartTime = moment(raceStartTime).add(interval * timePage, 'hours');

      const fetchLastPoints = isNaN(parseInt(timePage)) && isLive === 'true';
      // when asking about the future page return no data

      return await getPage(id, currentPageStartTime.format(format), currentPageStartTime.add(interval, 'hours').format(format), fetchLastPoints);
    } catch (err) {
      return ctx.response.badImplementation(err);
    }
  },

  async checkpoints(ctx) {
    const { id } = ctx.params;
    return strapi.services.race.getCheckpoints({ id });
  },

  async categorizedEntriesForCheckpoints(ctx) {
    const { id } = ctx.params;
    if (!categorizedEntriesForCheckpointsCache[id] || moment().diff(categorizedEntriesForCheckpointsCache[id].lastUpdatedTime, 'seconds') > 300) {
      const entries = await strapi.services.race.getEntries({ id });
      const checkpoints = await strapi.services.race.getCheckpoints({ id });

      const dataWithTimes = checkpoints.map((checkpoint) => entries
        .filter(entry => checkpoint.checkpoint_entries
          ?.map((checkpointEntry) => checkpointEntry.entry)
          .includes(entry.id))
        .map(entry => ({
          ...entry,
          time: checkpoint.checkpoint_entries
            .find(checkpointEntry => checkpointEntry.entry === entry.id)?.timeInSeconds ?? 0,
          crossingDateTime: checkpoint.checkpoint_entries
            .find(checkpointEntry => checkpointEntry.entry === entry.id)?.crossingDateTime ?? 0,
        })));

      const categorizedEntriesCheckpoints = dataWithTimes
        .map(checkpoint => checkpoint.reduce((object, entry) => {
          const { category } = entry;
          if (object[category]) {
            return { ...object, [category]: [...object[category], entry] };
          }
          return { ...object, [category]: [entry] };
        }, {}));

      categorizedEntriesCheckpoints.map((checkpoint, i) => Object.keys(checkpoint)
        .forEach(category => {
          categorizedEntriesCheckpoints[i][category] = categorizedEntriesCheckpoints[i][category]
            .sort((a, b) => {
              if (a.time && b.time) {
                return a.time - b.time;
              }
              if (a.time) {
                return -1;
              }
              if (b.time) {
                return 1;
              }
              return 0;
            }).map((entry, index) => {
              const {
                time, firstName, lastName, team, startingNumber, crossingDateTime,
              } = entry;
              return {
                firstName,
                lastName,
                team,
                startingNumber,
                crossingDateTime,
                timeAfterStart: time,
                place: entry.time ? index + 1 : undefined,
              };
            });
        }));

      const checkpointsWithEntries = checkpoints.map((checkpoint, i) => ({
        ...checkpoint,
        categorizedEntries: categorizedEntriesCheckpoints[i],
      }));

      categorizedEntriesForCheckpointsCache[id] = {
        lastUpdatedTime: moment(),
        data: checkpointsWithEntries,
      };

      return checkpointsWithEntries;
    }

    return categorizedEntriesForCheckpointsCache[id].data;
  },

  async deleteEntries(ctx) {
    const { id } = ctx.params;
    const knex = strapi.connections.default;
    return knex('entries').where('race', id).del();
  },

  async categorizedEntries(ctx) {
    const { id } = ctx.params;
    if (!categorizedEntries[id] || moment().diff(categorizedEntries[id].lastUpdatedTime, 'seconds') > 300) {
      const entries = await categorizeEntries(id);
      categorizedEntries[id] = {
        lastUpdatedTime: moment(),
        data: entries,
      };
      return entries;
    }

    return categorizedEntries[id].data;
  },

  /**
   * Retrieve records.
   *
   * @return {Array}
   */

  async find(ctx) {
    let entities;
    if (ctx.query._q) { // eslint-disable-line no-underscore-dangle
      entities = await strapi.services.race.search(ctx.query, ['logo', 'sponsorsLogo']);
    } else {
      entities = await strapi.services.race.find(ctx.query, ['logo', 'sponsorsLogo']);
    }

    return entities.map(entity => sanitizeEntity(entity, { model: strapi.models.race }));
  },

  /**
   * Retrieve a record.
   *
   * @return {Object}
   */

  async findOne(ctx) {
    const { id } = ctx.params;

    const entity = await strapi.services.race.findOne({ id }, ['logo', 'sponsorsLogo']);
    return sanitizeEntity(entity, { model: strapi.models.race });
  },

  async recalculateCheckpoints(ctx) {
    const knex = strapi.connections.default;
    const raceId = ctx.params.id;
    const checkpoints = await strapi.query('checkpoint').find({ 'race.id': raceId }, ['checkpoint_entries']);
    strapi.query('checkpoint-entry').delete({ 'checkpoint.id_in': checkpoints.map(checkpoint => checkpoint.id) });
    let startDates = await knex.select('id', 'startDateTime').from('entries').where('race', raceId);
    startDates = startDates.reduce((object, entry) => {
      const { id, startDateTime } = entry;
      return { ...object, [id]: startDateTime };
    }, {});
    const pointCount = await strapi.query('message').count({
      'race.id': raceId,
      positionTimestamp_null: false,
      positionLatitude_null: false,
    });
    let pointsObject = {};
    const checkpointEntries = [];
    const foundCheckpoints = {};
    for (let i = 0; i < pointCount / recalculateCheckpointsMessageRowCount; i += 1) {
      // await in loop to reduce database load
      // eslint-disable-next-line no-await-in-loop
      let points = await strapi.query('message').find({
        'race.id': raceId,
        positionTimestamp_null: false,
        positionLatitude_null: false,
        _limit: recalculateCheckpointsMessageRowCount,
        _sort: 'positionTimestamp:asc',
        _start: i * recalculateCheckpointsMessageRowCount,
      }, []);
      points = points.reduce((object, point) => {
        const { entry, ...newPoint } = point;
        if (entry && object[entry]) {
          return { ...object, [entry]: [...object[entry], newPoint] };
        }
        return { ...object, [entry]: [newPoint] };
      }, {});
      // eslint-disable-next-line @typescript-eslint/no-loop-func
      Object.keys(pointsObject).forEach((key) => {
        pointsObject[key] = [pointsObject[key][pointsObject[key].length - 1]];
      });
      pointsObject = { ...pointsObject, ...points };
      Object.keys(pointsObject).forEach((key) => {
        if (!foundCheckpoints[key]) {
          foundCheckpoints[key] = [];
        }
      });
      // eslint-disable-next-line @typescript-eslint/no-loop-func
      Object.keys(pointsObject).forEach(key => {
        if (foundCheckpoints[key]?.length !== checkpoints.length) {
          for (let pointIndex = 0; pointIndex < pointsObject[key].length; pointIndex += 1) {
            if (pointIndex !== 0) {
              const point = pointsObject[key][pointIndex];
              const previousPoint = pointsObject[key][pointIndex - 1];
              checkpoints.forEach((checkpoint, checkpointIndex) => {
                if (!foundCheckpoints[key].includes(checkpointIndex)) {
                  if (checkIfLineIntersectsCircle(
                    {
                      lat: previousPoint.positionLatitude,
                      lng: previousPoint.positionLongitude,
                    },
                    {
                      lat: point.positionLatitude,
                      lng: point.positionLongitude,
                    },
                    {
                      lat: checkpoint.latitude,
                      lng: checkpoint.longitude,
                    },
                    // in meters
                    checkpointConfirmationRadiusInMeters,
                  )) {
                    foundCheckpoints[key].push(checkpointIndex);
                    const time = moment(point.positionTimestamp).diff(moment(startDates[key]), 'seconds');
                    checkpointEntries.push({
                      timeInSeconds: !isNaN(time) ? time : 0,
                      crossingDateTime: !isNaN(point.positionTimestamp) ? point.positionTimestamp : null,
                      checkpoint: !isNaN(checkpoint.id) ? checkpoint.id : null,
                      entry: !isNaN(key) ? key : null,
                    });
                  }
                }
              });
            }
          }
        }
      });
    }
    return strapi.services['checkpoint-entry'].bulkCreate(checkpointEntries);
  },

  async deleteCheckpoints(ctx) {
    const { id } = ctx.params;
    const knex = strapi.connections.default;
    const checkpoints = await knex.select('id').from('checkpoints').where('race', id);
    return Promise.allSettled(checkpoints
      .map(checkpoint => strapi.services.checkpoint.delete(checkpoint.id)));
  },
};
