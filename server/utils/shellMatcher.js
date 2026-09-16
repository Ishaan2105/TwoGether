/**
 * Semantic Shell Matcher & Clustering Engine for DuoHabit
 * Identifies common domains/shells between two users' distinct tasks
 * (e.g. User A: "Gym / Heavy lifting" & User B: "Calisthenics" -> "🏋️ Exercise & Fitness" Shell)
 */

const PREDEFINED_SHELLS = [
  {
    id: 'exercise',
    name: 'Exercise & Fitness',
    icon: '🏋️',
    description: 'Strength, cardio, movement, and physical training',
    keywords: [
      'gym',
      'calisthenics',
      'workout',
      'work out',
      'working out',
      'run',
      'running',
      'jog',
      'jogging',
      'pushup',
      'pushups',
      'push up',
      'pullup',
      'pullups',
      'pull up',
      'squat',
      'squats',
      'lift',
      'lifting',
      'weight',
      'weights',
      'weightlifting',
      'yoga',
      'pilates',
      'stretch',
      'stretching',
      'cardio',
      'swim',
      'swimming',
      'cycle',
      'cycling',
      'bike',
      'biking',
      'walk',
      'walking',
      'steps',
      'sport',
      'train',
      'training',
      'fitness',
      'hiit',
      'abs',
      'chest',
      'legs',
      'arms',
      'crossfit',
      'exercise',
      'treadmill',
      'athletic',
    ],
    categories: ['Fitness'],
  },
  {
    id: 'nutrition',
    name: 'Hydration & Nutrition',
    icon: '💧',
    description: 'Clean eating, hydration, vitamins, and physical wellness',
    keywords: [
      'water',
      'drink',
      'hydration',
      'hydrate',
      'diet',
      'salad',
      'vegetables',
      'fruit',
      'protein',
      'vitamin',
      'vitamins',
      'supplement',
      'supplements',
      'meal',
      'eating',
      'healthy',
      'fasting',
      'intermittent',
      'sugar',
      'calories',
      'cook',
      'cooking',
      'greens',
      'nutrition',
      'detox',
    ],
    categories: ['Health'],
  },
  {
    id: 'learning',
    name: 'Reading & Learning',
    icon: '📚',
    description: 'Knowledge intake, books, languages, and study habits',
    keywords: [
      'read',
      'reading',
      'book',
      'books',
      'page',
      'pages',
      'chapter',
      'study',
      'studying',
      'learn',
      'learning',
      'course',
      'audiobook',
      'podcast',
      'article',
      'research',
      'language',
      'duolingo',
      'vocab',
      'lesson',
      'tutorial',
      'lecture',
    ],
    categories: ['Focus'],
  },
  {
    id: 'mindfulness',
    name: 'Mindfulness & Mental Peace',
    icon: '🧘',
    description: 'Meditation, journaling, reflection, and inner calm',
    keywords: [
      'meditation',
      'meditate',
      'journal',
      'journaling',
      'diary',
      'gratitude',
      'reflection',
      'reflect',
      'breathe',
      'breathing',
      'pranayama',
      'prayer',
      'pray',
      'mindful',
      'mindfulness',
      'relax',
      'calm',
      'peace',
      'affirmation',
      'affirmations',
      'therapy',
      'mental',
    ],
    categories: ['Mindset'],
  },
  {
    id: 'productivity',
    name: 'Deep Work & Productivity',
    icon: '⚡',
    description: 'Coding, focused deep work, writing, and milestone execution',
    keywords: [
      'code',
      'coding',
      'program',
      'programming',
      'dev',
      'developer',
      'work',
      'deep work',
      'task',
      'project',
      'write',
      'writing',
      'blog',
      'essay',
      'presentation',
      'email',
      'inbox',
      'client',
      'homework',
      'assignment',
      'pomodoro',
      'focus',
      'build',
      'ship',
      'plan',
      'planning',
    ],
    categories: ['Productivity'],
  },
  {
    id: 'routine',
    name: 'Sleep & Daily Routine',
    icon: '🛌',
    description: 'Consistent sleep, morning rituals, and circadian rhythm',
    keywords: [
      'sleep',
      'bedtime',
      'wake',
      'wake up',
      'morning routine',
      'evening routine',
      'early',
      'night routine',
      'rest',
      'nap',
      'circadian',
      '8 hours',
    ],
    categories: [],
  },
];

/**
 * Classifies a habit into a Shell based on keyword matching and category fallback
 */
function identifyShell(habit) {
  const text = `${habit.title || ''} ${habit.description || ''}`.toLowerCase();

  // 1. Keyword search
  for (const shell of PREDEFINED_SHELLS) {
    for (const kw of shell.keywords) {
      const regex = new RegExp(`\\b${kw.replace(' ', '\\s+')}`, 'i');
      if (regex.test(text)) {
        return {
          id: shell.id,
          name: shell.name,
          icon: shell.icon,
          description: shell.description,
        };
      }
    }
  }

  // 2. Category match fallback
  for (const shell of PREDEFINED_SHELLS) {
    if (shell.categories.includes(habit.category)) {
      return {
        id: shell.id,
        name: shell.name,
        icon: shell.icon,
        description: shell.description,
      };
    }
  }

  // 3. Custom / General fallback
  const cat = habit.category || 'Custom';
  return {
    id: `custom-${cat.toLowerCase()}`,
    name: `${cat} Focus`,
    icon: habit.icon || '✨',
    description: `Personal ${cat} habits`,
  };
}

/**
 * Clusters habits from User A and User B into common shared shells
 */
function clusterDuoHabitsIntoShells(userAHabits, userBHabits, userA, userB, dateStr) {
  const shellMap = new Map();

  const processHabit = (habit, userRole, userObj) => {
    const shell = identifyShell(habit);
    const isCompleted = habit.completedDates && habit.completedDates.includes(dateStr);

    if (!shellMap.has(shell.id)) {
      shellMap.set(shell.id, {
        shellId: shell.id,
        shellName: shell.name,
        shellIcon: shell.icon,
        shellDescription: shell.description,
        userATasks: [],
        userBTasks: [],
      });
    }

    const group = shellMap.get(shell.id);
    const taskItem = {
      _id: habit._id,
      title: habit.title,
      description: habit.description,
      category: habit.category,
      icon: habit.icon,
      priority: habit.priority,
      currentStreak: habit.currentStreak || 0,
      isCompletedToday: isCompleted,
    };

    if (userRole === 'userA') {
      group.userATasks.push(taskItem);
    } else {
      group.userBTasks.push(taskItem);
    }
  };

  userAHabits.forEach((h) => processHabit(h, 'userA', userA));
  userBHabits.forEach((h) => processHabit(h, 'userB', userB));

  const sharedShells = [];
  const soloShells = [];

  for (const [id, shellGroup] of shellMap.entries()) {
    const hasUserA = shellGroup.userATasks.length > 0;
    const hasUserB = shellGroup.userBTasks.length > 0;

    const totalTasks = shellGroup.userATasks.length + shellGroup.userBTasks.length;
    const completedA = shellGroup.userATasks.filter((t) => t.isCompletedToday).length;
    const completedB = shellGroup.userBTasks.filter((t) => t.isCompletedToday).length;
    const totalCompleted = completedA + completedB;

    const isUserADone = hasUserA && completedA === shellGroup.userATasks.length;
    const isUserBDone = hasUserB && completedB === shellGroup.userBTasks.length;
    const isSynergyAchieved = hasUserA && hasUserB && isUserADone && isUserBDone;

    const enrichedShell = {
      ...shellGroup,
      totalTasks,
      totalCompleted,
      isUserADone,
      isUserBDone,
      isSynergyAchieved,
      synergyScore:
        totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0,
      status: isSynergyAchieved
        ? 'perfect_synergy'
        : totalCompleted > 0
        ? 'in_progress'
        : 'pending',
    };

    if (hasUserA && hasUserB) {
      sharedShells.push(enrichedShell);
    } else {
      soloShells.push(enrichedShell);
    }
  }

  // Calculate overall duo shell synergy metrics
  const totalSharedTasks = sharedShells.reduce((acc, s) => acc + s.totalTasks, 0);
  const totalSharedCompleted = sharedShells.reduce((acc, s) => acc + s.totalCompleted, 0);
  const overallSynergy =
    totalSharedTasks > 0
      ? Math.round((totalSharedCompleted / totalSharedTasks) * 100)
      : 100;

  return {
    sharedShells,
    soloShells,
    stats: {
      sharedShellCount: sharedShells.length,
      perfectSynergyShells: sharedShells.filter((s) => s.isSynergyAchieved).length,
      overallSynergy,
      totalSharedTasks,
      totalSharedCompleted,
    },
  };
}

module.exports = {
  PREDEFINED_SHELLS,
  identifyShell,
  clusterDuoHabitsIntoShells,
};
