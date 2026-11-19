import { Activity, Team, User, Workout } from '../models/index.js';

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(_input: unknown) {
  if (!_input || typeof _input !== 'object') {
    throw Object.assign(new Error('Invalid activity input'), { status: 400 });
  }

  const input = _input as Record<string, unknown>;
  const { userId, teamId, type, minutes } = input;
  const objectIdPattern = /^[a-f\d]{24}$/i;
  if (
    typeof userId !== 'string' ||
    !objectIdPattern.test(userId) ||
    typeof teamId !== 'string' ||
    !objectIdPattern.test(teamId) ||
    typeof type !== 'string' ||
    !type.trim() ||
    typeof minutes !== 'number' ||
    !Number.isFinite(minutes)
  ) {
    throw Object.assign(new Error('Invalid activity input'), { status: 400 });
  }

  const [user, team] = await Promise.all([User.findById(userId), Team.findById(teamId)]);
  if (!user || !team) {
    throw Object.assign(new Error('User or team not found'), { status: 404 });
  }

  return Activity.create({
    user: user._id,
    team: team._id,
    type,
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(_input: unknown) {
  if (!_input || typeof _input !== 'object') {
    throw Object.assign(new Error('Invalid team input'), { status: 400 });
  }

  const input = _input as Record<string, unknown>;
  const { name, mascot, members = [] } = input;
  const objectIdPattern = /^[a-f\d]{24}$/i;
  if (
    typeof name !== 'string' ||
    !name.trim() ||
    typeof mascot !== 'string' ||
    !mascot.trim() ||
    !Array.isArray(members) ||
    !members.every((member) => typeof member === 'string' && objectIdPattern.test(member))
  ) {
    throw Object.assign(new Error('Invalid team input'), { status: 400 });
  }

  const users = await User.find({ _id: { $in: members } });
  if (users.length !== new Set(members).size) {
    throw Object.assign(new Error('One or more team members were not found'), { status: 404 });
  }

  return Team.create({ name, mascot, members: users.map((user) => user._id) });
}

export async function getLeaderboard() {
  const teamsByPoints = await Activity.aggregate<{ teamName: string; totalPoints: number }>([
    { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    {
      $lookup: {
        from: Team.collection.name,
        localField: '_id',
        foreignField: '_id',
        as: 'team',
      },
    },
    { $unwind: '$team' },
    { $sort: { totalPoints: -1, 'team.name': 1 } },
    { $project: { _id: 0, teamName: '$team.name', totalPoints: 1 } },
  ]);
  return teamsByPoints.map((team, index) => ({ ...team, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail }).lean();
  if (!user) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }

  const [activities, workouts] = await Promise.all([
    Activity.find({ user: user._id }).sort({ occurredAt: -1 }).lean(),
    Workout.find().lean(),
  ]);
  const goal = user.fitnessGoal.toLowerCase();
  const workout = workouts.find(({ focus }) => focus.toLowerCase() === goal)
    ?? workouts.find(({ focus }) => activities.some(({ type }) => type.toLowerCase() === focus.toLowerCase()));

  if (!workout) {
    return [];
  }

  const latestActivity = activities[0];
  const activityContext = latestActivity ? ` and your ${latestActivity.type} activity` : '';
  return [{
    ...workout,
    reason: `Recommended for your ${workout.focus} goal${activityContext}`,
  }];
}

export { User };
