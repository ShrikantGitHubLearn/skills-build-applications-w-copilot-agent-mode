import mongoose from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

function parseObjectId(value: unknown, name: string) {
  if (typeof value !== 'string' || !mongoose.Types.ObjectId.isValid(value)) {
    throw Object.assign(new Error(`${name} must be a valid MongoDB ObjectId`), { status: 400 });
  }
  return new mongoose.Types.ObjectId(value);
}

function normalizedString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function listActivities() {
  return Activity.find().sort({ occurredAt: -1 }).lean();
}

export async function createActivity(input: unknown) {
  if (!input || typeof input !== 'object') {
    throw Object.assign(new Error('Activity payload is required'), { status: 400 });
  }

  const data = input as Record<string, unknown>;
  const userId = data.userId;
  const teamId = data.teamId;
  const type = normalizedString(data.type);
  const minutes = Number(data.minutes);

  if (!userId || !teamId || !type || !Number.isFinite(minutes) || minutes <= 0) {
    throw Object.assign(new Error('Activity requires userId, teamId, type, and a positive minutes value'), { status: 400 });
  }

  const user = await User.findById(parseObjectId(userId, 'userId'));
  const team = await Team.findById(parseObjectId(teamId, 'teamId'));

  if (!user || !team) {
    throw Object.assign(new Error('Activity references must match an existing user and team'), { status: 400 });
  }

  const points = Math.max(1, Math.round(minutes * 1.5));
  const activity = await Activity.create({
    user: user._id,
    team: team._id,
    type,
    minutes,
    points,
    occurredAt: new Date(),
  });

  return activity.toObject();
}

export async function listTeams() {
  return Team.find().sort({ name: 1 }).lean();
}

export async function createTeam(input: unknown) {
  if (!input || typeof input !== 'object') {
    throw Object.assign(new Error('Team payload is required'), { status: 400 });
  }

  const data = input as Record<string, unknown>;
  const name = normalizedString(data.name);
  const mascot = normalizedString(data.mascot);

  if (!name || !mascot) {
    throw Object.assign(new Error('Team requires a name and mascot'), { status: 400 });
  }

  const rawMembers = Array.isArray(data.members) ? data.members : [];
  const members = rawMembers.filter((member) => typeof member === 'string' && mongoose.Types.ObjectId.isValid(member));

  const team = await Team.create({ name, mascot, members });
  return team.toObject();
}

export async function getLeaderboard() {
  const leaderboard = await Activity.aggregate([
    { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    { $lookup: { from: 'teams', localField: '_id', foreignField: '_id', as: 'team' } },
    { $unwind: '$team' },
    { $project: { _id: 0, teamName: '$team.name', totalPoints: 1 } },
    { $sort: { totalPoints: -1, teamName: 1 } },
  ]);

  return leaderboard.map((entry, index) => ({
    teamName: entry.teamName,
    totalPoints: entry.totalPoints,
    rank: index + 1,
  }));
}

export async function suggestWorkouts(userEmail: string) {
  const email = normalizedString(userEmail).toLowerCase();
  if (!email) {
    throw Object.assign(new Error('A user email is required'), { status: 400 });
  }

  const user = await User.findOne({ email }).lean();
  if (!user) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }

  const recentActivities = await Activity.find({ user: user._id }).sort({ occurredAt: -1 }).limit(5).lean();
  const preferredFocus = normalizedString(user.fitnessGoal) || recentActivities[0]?.type || 'endurance';

  const workout = await Workout.findOne({
    focus: { $regex: preferredFocus.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
  }).lean();

  if (!workout) {
    const fallback = await Workout.findOne().lean();
    if (!fallback) return [];
    return [{ ...fallback, reason: `Based on your ${preferredFocus} goal and recent activity.` }];
  }

  const recentType = recentActivities[0]?.type ? recentActivities[0].type : 'activity';
  return [{
    ...workout,
    reason: `Based on your recent ${recentType} activity and ${preferredFocus} goal.`,
  }];
}

export { User };
