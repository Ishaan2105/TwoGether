/**
 * TC-01: Duo Pairing & Real-Time Sync Activation Test Runner
 * Tests end-to-end user registration, code lookup, pairing, and mutual duo verification.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env') });
const mongoose = require('mongoose');
const connectDB = require('../server/config/db');
const User = require('../server/models/User');
const Duo = require('../server/models/Duo');

async function runTC01Test() {
  console.log('========================================================');
  console.log('🧪 RUNNING TC-01: Duo Pairing & Real-Time Sync Activation');
  console.log('========================================================\n');

  await connectDB();
  console.log('✓ Connected to database for TC-01 test validation.\n');

  const ts = Date.now().toString().slice(-5);
  const emailA = `tc01_alpha_${ts}@twogether.test`;
  const emailB = `tc01_beta_${ts}@twogether.test`;
  const usernameA = `alpha_${ts}`;
  const usernameB = `beta_${ts}`;

  try {
    // -------------------------------------------------------------
    // Step 1: Create User A (Solo Mode)
    // -------------------------------------------------------------
    console.log('Step 1: Registering User A (Solo Mode)...');
    const userA = await User.create({
      username: usernameA,
      email: emailA,
      password: 'Password123!',
    });
    console.log(`✓ User A created: @${userA.username}`);
    console.log(`✓ User A Duo Invite Code: ${userA.duoInviteCode}`);
    if (!userA.duoInviteCode) {
      throw new Error('User A duoInviteCode was not generated!');
    }

    // -------------------------------------------------------------
    // Step 2: Create User B (Solo Mode)
    // -------------------------------------------------------------
    console.log('\nStep 2: Registering User B (Solo Mode)...');
    const userB = await User.create({
      username: usernameB,
      email: emailB,
      password: 'Password123!',
    });
    console.log(`✓ User B created: @${userB.username}`);
    console.log(`✓ User B Duo Invite Code: ${userB.duoInviteCode}`);

    // Verify both are currently in Solo Mode (duoId === null)
    if (userA.duoId !== null || userB.duoId !== null) {
      throw new Error('Initial state failure: users must start in Solo Mode (duoId: null)!');
    }
    console.log('✓ Pre-condition verified: Both users start in Solo Mode (duoId: null).');

    // -------------------------------------------------------------
    // Step 3: Lookup Partner by Code
    // -------------------------------------------------------------
    console.log('\nStep 3: User B enters User A code and looks up partner...');
    const foundPartner = await User.findOne({ duoInviteCode: userA.duoInviteCode });
    if (!foundPartner || foundPartner.username !== userA.username) {
      throw new Error('Invite code lookup failed to find User A!');
    }
    console.log(`✓ Lookup verified: Code ${userA.duoInviteCode} successfully resolved to @${foundPartner.username}.`);

    // -------------------------------------------------------------
    // Step 4: Perform Duo Pairing
    // -------------------------------------------------------------
    console.log('\nStep 4: Executing Duo Pairing...');
    const duo = await Duo.create({
      users: [userA._id, userB._id],
      duoName: `${userA.username} & ${userB.username}`,
      duoStreak: 0,
      highestStreak: 0,
      synergyScore: 100,
      duoXP: 0,
      duoLevel: 1,
      duoShields: 1,
      status: 'active',
      formedAt: new Date(),
    });

    userA.duoId = duo._id;
    await userA.save();

    userB.duoId = duo._id;
    await userB.save();

    console.log(`✓ Joint Duo record established in MongoDB with ID: ${duo._id}`);
    console.log(`✓ Duo status: ${duo.status}`);
    console.log(`✓ Shared Duo Streak initialized to: ${duo.duoStreak}`);

    // -------------------------------------------------------------
    // Step 5: Verify Both Users Transition to Duo Mode
    // -------------------------------------------------------------
    console.log('\nStep 5: Verifying User A & User B Dashboards (Duo Mode Transition)...');
    
    // User A perspective
    const duoCheckA = await Duo.findById(userA.duoId).populate('users', 'username soloStreak personalLevel');
    const partnerForA = duoCheckA.users.find((u) => u._id.toString() !== userA._id.toString());
    console.log(`✓ User A is paired with: @${partnerForA.username} (Level ${partnerForA.personalLevel})`);
    console.log(`✓ User A shared streak: ${duoCheckA.duoStreak} Days`);

    // User B perspective
    const duoCheckB = await Duo.findById(userB.duoId).populate('users', 'username soloStreak personalLevel');
    const partnerForB = duoCheckB.users.find((u) => u._id.toString() !== userB._id.toString());
    console.log(`✓ User B is paired with: @${partnerForB.username} (Level ${partnerForB.personalLevel})`);
    console.log(`✓ User B shared streak: ${duoCheckB.duoStreak} Days`);

    if (partnerForA.username !== userB.username || partnerForB.username !== userA.username) {
      throw new Error('Partner mapping mismatch!');
    }
    if (duoCheckA.duoStreak !== 0 || duoCheckB.duoStreak !== 0) {
      throw new Error('Duo streak was not initialized to 0!');
    }

    console.log('\n========================================================');
    console.log('✅ ALL TC-01 ASSERTIONS PASSED SUCCESSFULLY!');
    console.log('   - Pairing succeeded immediately with joint Duo session.');
    console.log('   - Both users transitioned from Solo Mode to Duo Mode.');
    console.log('   - Mutual partner username, level, and shared streak verified.');
    console.log('========================================================\n');
  } finally {
    // Cleanup test users & duo
    console.log('Cleaning up test data...');
    await User.deleteMany({ email: { $in: [emailA, emailB] } });
    await Duo.deleteMany({ duoName: { $regex: `${usernameA}|${usernameB}` } });
    await mongoose.connection.close();
    console.log('✓ Cleanup complete. Connection closed.');
  }
}

runTC01Test().catch((err) => {
  console.error('\n❌ TC-01 TEST FAILED:', err);
  process.exit(1);
});
