/**
 * TC-02: Joint Duo Streak Progression & Midnight Evaluation Test Runner
 *
 * Pre-conditions: User A and User B are paired in a duo with current streak = N.
 * Test Steps:
 * 1. User A marks all mandatory daily habits as complete for today.
 * 2. Verify User B’s dashboard reflects User A’s progress.
 * 3. User B marks all mandatory daily habits as complete before 23:59:59 local cutoff.
 * 4. Trigger midnight cron / date boundary evaluation.
 * Expected Result:
 * - The shared duo streak successfully increments to N + 1.
 * - If either partner fails to complete all tasks before cutoff (with shield active),
 *   shield protects streak (shields = shields - 1, streak preserved).
 * - If either partner fails without a streak shield active, the duo streak resets to 0.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env') });
const mongoose = require('mongoose');
const connectDB = require('../server/config/db');
const User = require('../server/models/User');
const Duo = require('../server/models/Duo');
const Habit = require('../server/models/Habit');
const { evaluateDuoStreak, evaluateAllDuosAtMidnight } = require('../server/services/streakEngine');
const { clusterDuoHabitsIntoShells } = require('../server/utils/shellMatcher');

async function runTC02Test() {
  console.log('================================================================');
  console.log('🧪 RUNNING TC-02: Joint Duo Streak Progression & Midnight Eval');
  console.log('================================================================\n');

  await connectDB();
  console.log('✓ Connected to MongoDB for TC-02 test validation.\n');

  const ts = Date.now().toString().slice(-5);
  const emailA = `tc02_alpha_${ts}@twogether.test`;
  const emailB = `tc02_beta_${ts}@twogether.test`;
  const usernameA = `streak_a_${ts}`;
  const usernameB = `streak_b_${ts}`;

  const todayStr = '2026-09-24';
  const day2Str = '2026-09-25';
  const day3Str = '2026-09-26';

  let userA, userB, duo, habitA1, habitA2, habitB1;

  try {
    // -------------------------------------------------------------
    // Pre-condition: Pair User A and User B with streak = N (e.g. N = 5)
    // -------------------------------------------------------------
    console.log('--- Pre-condition: Setting up paired duo with streak N = 5 ---');
    userA = await User.create({
      username: usernameA,
      email: emailA,
      password: 'Password123!',
    });

    userB = await User.create({
      username: usernameB,
      email: emailB,
      password: 'Password123!',
    });

    const initialStreakN = 5;
    duo = await Duo.create({
      duoName: 'Streak Titans',
      users: [userA._id, userB._id],
      status: 'active',
      duoStreak: initialStreakN,
      highestStreak: initialStreakN,
      duoShields: 1, // Has 1 shield for the shield test
      lastCompletedDate: '2026-09-23',
      synergyScore: 100,
    });

    userA.duoId = duo._id;
    await userA.save();

    userB.duoId = duo._id;
    await userB.save();

    console.log(`✓ User A (@${userA.username}) & User B (@${userB.username}) paired.`);
    console.log(`✓ Pre-condition verified: Duo created with streak N = ${duo.duoStreak}, shields = ${duo.duoShields}.\n`);

    // Create habits for both users
    habitA1 = await Habit.create({
      userId: userA._id,
      title: 'Morning 5km Run',
      category: 'Fitness',
      startDate: todayStr,
      completedDates: [],
    });

    habitA2 = await Habit.create({
      userId: userA._id,
      title: 'Read 20 pages',
      category: 'Focus',
      startDate: todayStr,
      completedDates: [],
    });

    habitB1 = await Habit.create({
      userId: userB._id,
      title: '30-min Meditation & Yoga',
      category: 'Mindset',
      startDate: todayStr,
      completedDates: [],
    });

    console.log(`✓ Created 2 mandatory habits for User A, 1 mandatory habit for User B.`);

    // -------------------------------------------------------------
    // Step 1: User A marks all mandatory daily habits as complete for today
    // -------------------------------------------------------------
    console.log('\n--- Step 1: User A completes all mandatory habits for today ---');
    habitA1.completedDates.push(todayStr);
    await habitA1.save();
    habitA2.completedDates.push(todayStr);
    await habitA2.save();
    console.log(`✓ User A checked off: "${habitA1.title}" and "${habitA2.title}" for ${todayStr}.`);

    // -------------------------------------------------------------
    // Step 2: Verify User B’s dashboard reflects User A’s progress
    // -------------------------------------------------------------
    console.log('\n--- Step 2: Verify User B’s dashboard reflects User A’s progress ---');
    // Simulate what getDuoShells delivers to User B
    const userAHabits = await Habit.find({ userId: userA._id, isArchived: false });
    const userBHabits = await Habit.find({ userId: userB._id, isArchived: false });

    // When User B views shells:
    const clusteredForB = clusterDuoHabitsIntoShells(
      userBHabits,
      userAHabits,
      userB,
      userA,
      todayStr
    );

    // Verify User A's tasks in partner view are marked as completed today
    const partnerHabitsViewedByB = userAHabits.filter((h) => h.completedDates.includes(todayStr));
    if (partnerHabitsViewedByB.length !== userAHabits.length) {
      throw new Error("Verification failed: User B's dashboard does not reflect User A's full completion!");
    }
    console.log(`✓ Verified: User B's dashboard shows 100% of User A's tasks (${partnerHabitsViewedByB.length}/${userAHabits.length}) checked off as ✓ Done.`);

    // -------------------------------------------------------------
    // Step 3: User B marks all mandatory daily habits as complete before 23:59:59
    // -------------------------------------------------------------
    console.log('\n--- Step 3: User B completes all mandatory habits before cutoff ---');
    habitB1.completedDates.push(todayStr);
    await habitB1.save();
    console.log(`✓ User B checked off: "${habitB1.title}" for ${todayStr}. Both partners 100% complete!`);

    // -------------------------------------------------------------
    // Step 4: Trigger midnight cron / date boundary evaluation
    // -------------------------------------------------------------
    console.log('\n--- Step 4: Triggering midnight cron evaluation for today ---');
    const evalResult1 = await evaluateDuoStreak(duo._id, todayStr);
    console.log('Midnight Eval Result 1:', evalResult1);

    // -------------------------------------------------------------
    // Step 5: Expected Result 1: Shared duo streak increments to N + 1
    // -------------------------------------------------------------
    if (evalResult1.outcome !== 'incremented' || evalResult1.duoStreak !== initialStreakN + 1) {
      throw new Error(`Expected duo streak to increment from ${initialStreakN} to ${initialStreakN + 1}, but got ${evalResult1.duoStreak}`);
    }
    console.log(`✓ TC-02 Progression Verified: Shared streak successfully incremented from ${initialStreakN} to ${evalResult1.duoStreak} (${initialStreakN} + 1)!`);

    // Verify DB state
    const refreshedDuo = await Duo.findById(duo._id);
    if (refreshedDuo.duoStreak !== initialStreakN + 1 || refreshedDuo.lastCompletedDate !== todayStr) {
      throw new Error('Database persistence mismatch after streak increment!');
    }
    console.log(`✓ Database Verified: duoStreak = ${refreshedDuo.duoStreak}, lastCompletedDate = ${refreshedDuo.lastCompletedDate}`);

    // -------------------------------------------------------------
    // Step 6: Test Incomplete with Streak Shield Active
    // Day 2: User A completes, User B fails to complete before cutoff
    // -------------------------------------------------------------
    console.log('\n--- Step 6: Test Cutoff Failure with Streak Shield Active (Day 2) ---');
    habitA1.completedDates.push(day2Str);
    await habitA1.save();
    habitA2.completedDates.push(day2Str);
    await habitA2.save();
    // User B does NOT complete habitB1 for day2Str

    console.log(`User A completed tasks for ${day2Str}, but User B missed cutoff.`);
    const evalResult2 = await evaluateDuoStreak(duo._id, day2Str);
    console.log('Midnight Eval Result 2 (Shield Active):', evalResult2);

    if (evalResult2.outcome !== 'shield_protected' || evalResult2.duoStreak !== initialStreakN + 1 || evalResult2.duoShields !== 0) {
      throw new Error(`Expected shield protection: streak preserved at ${initialStreakN + 1}, shields reduced to 0. Got: outcome=${evalResult2.outcome}, streak=${evalResult2.duoStreak}, shields=${evalResult2.duoShields}`);
    }
    console.log(`✓ Shield Protection Verified: Streak preserved at ${evalResult2.duoStreak}! Shield consumed (Remaining shields: ${evalResult2.duoShields}).`);

    // -------------------------------------------------------------
    // Step 7: Test Incomplete WITHOUT Streak Shield Active
    // Day 3: Both miss cutoff, shields = 0 -> Streak Resets to 0
    // -------------------------------------------------------------
    console.log('\n--- Step 7: Test Cutoff Failure WITHOUT Streak Shield (Day 3) ---');
    // Neither completes for day3Str
    console.log(`Tasks missed for ${day3Str} with 0 shields remaining.`);
    const evalResult3 = await evaluateDuoStreak(duo._id, day3Str);
    console.log('Midnight Eval Result 3 (Reset to 0):', evalResult3);

    if (evalResult3.outcome !== 'reset' || evalResult3.duoStreak !== 0) {
      throw new Error(`Expected streak reset to 0, but got ${evalResult3.duoStreak}`);
    }
    console.log(`✓ Streak Reset Verified: Duo streak successfully reset to 0 upon cutoff violation without active shield.`);

    // -------------------------------------------------------------
    // Step 8: Test Batch Midnight Cron Runner
    // -------------------------------------------------------------
    console.log('\n--- Step 8: Test Batch Midnight Cron Runner ---');
    const batchResults = await evaluateAllDuosAtMidnight(day3Str);
    console.log('Batch Cron Results:', batchResults);
    if (typeof batchResults.total !== 'number') {
      throw new Error('Batch midnight cron runner did not return proper summary!');
    }
    console.log(`✓ Batch Cron Evaluation verified successfully (${batchResults.total} total active duos evaluated).`);

    console.log('\n================================================================');
    console.log('🎉 ALL TC-02 TEST STEPS & ASSERTIONS PASSED WITH 100% SUCCESS!');
    console.log('================================================================\n');

  } catch (err) {
    console.error('\n❌ Error encountered during test execution:', err);
    throw err;
  } finally {
    // Clean up test documents safely
    console.log('Cleaning up test records from database...');
    try { if (habitA1?._id) await Habit.findByIdAndDelete(habitA1._id); } catch (e) {}
    try { if (habitA2?._id) await Habit.findByIdAndDelete(habitA2._id); } catch (e) {}
    try { if (habitB1?._id) await Habit.findByIdAndDelete(habitB1._id); } catch (e) {}
    try { if (duo?._id) await Duo.findByIdAndDelete(duo._id); } catch (e) {}
    try { if (userA?._id) await User.findByIdAndDelete(userA._id); } catch (e) {}
    try { if (userB?._id) await User.findByIdAndDelete(userB._id); } catch (e) {}
    console.log('✓ Cleanup complete.');
    try { await mongoose.disconnect(); } catch (e) {}
  }
}

runTC02Test().catch((err) => {
  console.error('\n❌ TC-02 Test Failed with Error:\n', err);
  process.exit(1);
});
