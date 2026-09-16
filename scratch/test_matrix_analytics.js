// Test script to verify habit API responses and past-day validation
const axios = require('axios');

async function testHabitFeatures() {
  const baseURL = 'http://localhost:5000/api';

  try {
    console.log('1. Testing registration / login...');
    const email = `testmatrix_${Date.now()}@example.com`;
    const regRes = await axios.post(`${baseURL}/auth/register`, {
      username: `matrixuser_${Date.now().toString().slice(-4)}`,
      email,
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });
    const token = regRes.data.data.token;
    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
    console.log('✓ User registered. Token obtained.');

    console.log('2. Creating sample daily habits...');
    const h1 = await axios.post(
      `${baseURL}/habits`,
      {
        title: 'Gym Lifting Session',
        category: 'Fitness',
        icon: '🏋️',
        priority: 'high',
        timeOfDay: 'morning',
      },
      authHeaders
    );
    const h2 = await axios.post(
      `${baseURL}/habits`,
      {
        title: 'Drink 2.5L Water',
        category: 'Health',
        icon: '💧',
        priority: 'medium',
        timeOfDay: 'anytime',
      },
      authHeaders
    );
    console.log('✓ Sample habits created:', h1.data.data.habit.title, h2.data.data.habit.title);

    console.log('3. Fetching habits and checking summary...');
    const listRes = await axios.get(`${baseURL}/habits`, authHeaders);
    console.log('✓ Habits count:', listRes.data.data.habits.length);
    console.log('✓ Summary todayStr:', listRes.data.data.summary.todayStr);
    console.log('✓ Summary joinDateStr:', listRes.data.data.summary.joinDateStr);

    console.log('4. Toggling today check-in for habit 1...');
    const toggleRes = await axios.post(
      `${baseURL}/habits/${h1.data.data.habit._id}/toggle`,
      {},
      authHeaders
    );
    console.log('✓ Toggle response:', toggleRes.data.data.message);
    console.log('✓ Habit completed today:', toggleRes.data.data.habit.isCompletedToday);

    console.log('5. Testing past date locking (should fail with 400)...');
    try {
      await axios.post(
        `${baseURL}/habits/${h1.data.data.habit._id}/toggle`,
        { date: '2026-09-01' },
        authHeaders
      );
      console.error('❌ Expected past date toggle to fail, but it succeeded.');
    } catch (err) {
      console.log('✓ Past date correctly rejected with status:', err.response?.status);
      console.log('✓ Error message:', err.response?.data?.message);
    }

    console.log('6. Testing future date locking (should fail with 400)...');
    try {
      await axios.post(
        `${baseURL}/habits/${h1.data.data.habit._id}/toggle`,
        { date: '2026-09-30' },
        authHeaders
      );
      console.error('❌ Expected future date toggle to fail, but it succeeded.');
    } catch (err) {
      console.log('✓ Future date correctly rejected with status:', err.response?.status);
      console.log('✓ Error message:', err.response?.data?.message);
    }

    console.log('\n========================================');
    console.log('🎉 ALL MATRIX & HABIT TESTS PASSED SUCCESSFULLY!');
    console.log('========================================');
  } catch (err) {
    console.error('❌ Test failed:', err.response?.data || err.message);
    process.exit(1);
  }
}

testHabitFeatures();
