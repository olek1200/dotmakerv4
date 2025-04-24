'use strict';


// `next()` means go to next policy or reach the controller's action.
module.exports = async (ctx, next) => {
  if (ctx.state.user.role.name === 'Administrator') {
    return next();
  }

  // When user is not an administrator we check to which races he has permissions.
  const assignedRaces = ctx.state.user.races.map(({ id }) => id);

  // Check which entry is trying to be deleted/updated
  const entryId = ctx.params.id;

  // 1) Get the race id to which the entry belongs
  const entryObject = await strapi.services.entry.findOne({ id: entryId });
  const raceId = entryObject.race;

  // 2) Check if user has permissions to this race
  const isAllowed = assignedRaces.find((id) => id === raceId);

  // 3) If the user has permissions to the race allow him to delete/update entry.
  if (isAllowed) {
    return next();
  }

  // If the user has no permissions to the race do not allow the user to do this action.
  return ctx.unauthorized('You\'re not allowed to perform this action!');
};
