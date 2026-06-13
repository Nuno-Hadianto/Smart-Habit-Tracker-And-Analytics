import express from 'express';
import { getDb } from '../database/supabase.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/overview', authenticateToken, async (req, res) => {
  try {
    const supabase = getDb();
    const userId = req.user.id;

    // Get all habits
    const { data: habits } = await supabase
      .from('habits')
      .select('id')
      .eq('user_id', userId);

    // Get today's logs
    const today = new Date().toISOString().split('T')[0];
    const { data: todayLogs } = await supabase
      .from('daily_logs')
      .select('completed')
      .eq('user_id', userId)
      .eq('date', today);

    const totalHabits = habits?.length || 0;
    const completedToday = todayLogs?.filter(log => log.completed === 1).length || 0;

    // Get total completions
    const { data: allLogs } = await supabase
      .from('daily_logs')
      .select('completed')
      .eq('user_id', userId)
      .eq('completed', 1);

    const totalCompletions = allLogs?.length || 0;

    // Calculate best streak
    let bestStreak = 0;
    for (const habit of habits || []) {
      const { data: logs } = await supabase
        .from('daily_logs')
        .select('date')
        .eq('habit_id', habit.id)
        .eq('completed', 1)
        .order('date', { ascending: false });

      let currentStreak = 0;
      if (logs && logs.length > 0) {
        const todayObj = new Date();
        todayObj.setHours(0, 0, 0, 0);

        for (let i = 0; i < logs.length; i++) {
          const entryDate = new Date(logs[i].date);
          entryDate.setHours(0, 0, 0, 0);
          
          const expectedDate = new Date(todayObj);
          expectedDate.setDate(expectedDate.getDate() - i);

          if (entryDate.getTime() === expectedDate.getTime()) {
            currentStreak++;
          } else if (i === 0) {
            const yesterday = new Date(todayObj);
            yesterday.setDate(yesterday.getDate() - 1);
            if (entryDate.getTime() === yesterday.getTime()) {
              currentStreak++;
            } else {
              break;
            }
          } else {
            break;
          }
        }
      }
      if (currentStreak > bestStreak) {
        bestStreak = currentStreak;
      }
    }

    // Get badges count
    const { count: badgesCount } = await supabase
      .from('badges')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    res.json({
      totalHabits,
      todayCompletions: completedToday,
      bestStreak,
      completionRate: totalHabits > 0 ? Math.round((completedToday / totalHabits) * 100) : 0,
      totalCompletions,
      badgesCount: badgesCount || 0
    });
  } catch (error) {
    console.error('Get overview error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/streaks', authenticateToken, async (req, res) => {
  try {
    const supabase = getDb();
    const userId = req.user.id;

    const { data: habits } = await supabase
      .from('habits')
      .select('id, name')
      .eq('user_id', userId);

    const streaks = [];
    for (const habit of habits || []) {
      const { data: logs } = await supabase
        .from('daily_logs')
        .select('date, completed')
        .eq('habit_id', habit.id)
        .eq('completed', 1)
        .order('date', { ascending: false });

      let currentStreak = 0;
      if (logs && logs.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < logs.length; i++) {
          const entryDate = new Date(logs[i].date);
          entryDate.setHours(0, 0, 0, 0);
          
          const expectedDate = new Date(today);
          expectedDate.setDate(expectedDate.getDate() - i);

          if (entryDate.getTime() === expectedDate.getTime()) {
            currentStreak++;
          } else if (i === 0) {
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            if (entryDate.getTime() === yesterday.getTime()) {
              currentStreak++;
            } else {
              break;
            }
          } else {
            break;
          }
        }
      }

      if (currentStreak > 0) {
        streaks.push({
          habitId: habit.id,
          habitName: habit.name,
          streak: currentStreak
        });
      }
    }

    streaks.sort((a, b) => b.streak - a.streak);
    res.json({ streaks });
  } catch (error) {
    console.error('Get streaks error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/weekly', authenticateToken, async (req, res) => {
  try {
    const supabase = getDb();
    const userId = req.user.id;

    // Get active habits
    const { data: habits } = await supabase
      .from('habits')
      .select('id')
      .eq('user_id', userId);
    
    const totalHabits = habits?.length || 0;

    const weeklyData = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayName = dayNames[date.getDay()];

      const { data: logs } = await supabase
        .from('daily_logs')
        .select('completed')
        .eq('user_id', userId)
        .eq('date', dateStr)
        .eq('completed', 1);

      const completedCount = logs?.length || 0;
      const rate = totalHabits > 0 ? Math.round((completedCount / totalHabits) * 100) : 0;

      weeklyData.push({
        day: dayName,
        rate
      });
    }

    res.json({ weeklyData });
  } catch (error) {
    console.error('Get weekly error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/monthly', authenticateToken, async (req, res) => {
  try {
    const supabase = getDb();
    const userId = req.user.id;

    const { data: habits } = await supabase
      .from('habits')
      .select('id')
      .eq('user_id', userId);

    const totalHabits = habits?.length || 0;

    const monthlyData = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const { data: logs } = await supabase
        .from('daily_logs')
        .select('completed')
        .eq('user_id', userId)
        .eq('date', dateStr)
        .eq('completed', 1);

      const completedCount = logs?.length || 0;
      const rate = totalHabits > 0 ? Math.round((completedCount / totalHabits) * 100) : 0;

      monthlyData.push({
        date: dateStr,
        rate
      });
    }

    res.json({ monthlyData });
  } catch (error) {
    console.error('Get monthly error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/habits-performance', authenticateToken, async (req, res) => {
  try {
    const supabase = getDb();
    const userId = req.user.id;

    const { data: habits } = await supabase
      .from('habits')
      .select('id, name, icon, color')
      .eq('user_id', userId);

    const { data: logs } = await supabase
      .from('daily_logs')
      .select('habit_id, completed')
      .eq('user_id', userId);

    const performance = (habits || []).map(habit => {
      const habitLogs = logs?.filter(l => l.habit_id === habit.id) || [];
      const total = habitLogs.length;
      const completed = habitLogs.filter(l => l.completed === 1).length;
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        id: habit.id,
        name: habit.name,
        icon: habit.icon,
        color: habit.color,
        completionRate
      };
    });

    res.json({ performance });
  } catch (error) {
    console.error('Get habits performance error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/heatmap', authenticateToken, async (req, res) => {
  try {
    const supabase = getDb();
    const userId = req.user.id;

    const { data: habits } = await supabase
      .from('habits')
      .select('id')
      .eq('user_id', userId);

    const totalHabits = habits?.length || 0;

    const oneYearAgo = new Date();
    oneYearAgo.setDate(oneYearAgo.getDate() - 365);
    const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];

    const { data: logs } = await supabase
      .from('daily_logs')
      .select('date, completed')
      .eq('user_id', userId)
      .gte('date', oneYearAgoStr);

    const logsByDate = {};
    for (const log of logs || []) {
      if (!logsByDate[log.date]) {
        logsByDate[log.date] = 0;
      }
      if (log.completed === 1) {
        logsByDate[log.date]++;
      }
    }

    const heatmap = {};
    for (const [date, completedCount] of Object.entries(logsByDate)) {
      heatmap[date] = {
        rate: totalHabits > 0 ? Math.round((completedCount / totalHabits) * 100) : 0
      };
    }

    res.json({ heatmap });
  } catch (error) {
    console.error('Get heatmap error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const supabase = getDb();
    const userId = req.user.id;

    const { data: habits } = await supabase
      .from('habits')
      .select('id, category')
      .eq('user_id', userId);

    const { data: logs } = await supabase
      .from('daily_logs')
      .select('habit_id, completed')
      .eq('user_id', userId);

    const categoryData = {};
    for (const habit of habits || []) {
      if (!categoryData[habit.category]) {
        categoryData[habit.category] = { habits: [], totalLogs: 0, completedLogs: 0 };
      }
      categoryData[habit.category].habits.push(habit.id);
    }

    for (const log of logs || []) {
      for (const [catName, catInfo] of Object.entries(categoryData)) {
        if (catInfo.habits.includes(log.habit_id)) {
          catInfo.totalLogs++;
          if (log.completed === 1) {
            catInfo.completedLogs++;
          }
        }
      }
    }

    const breakdown = Object.entries(categoryData).map(([category, info]) => {
      const completionRate = info.totalLogs > 0 ? Math.round((info.completedLogs / info.totalLogs) * 100) : 0;
      return {
        category,
        habitCount: info.habits.length,
        completionRate
      };
    });

    res.json({ breakdown });
  } catch (error) {
    console.error('Get categories breakdown error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/insights', authenticateToken, async (req, res) => {
  try {
    const supabase = getDb();
    const userId = req.user.id;

    const { data: habits } = await supabase
      .from('habits')
      .select('id, name, icon')
      .eq('user_id', userId);

    const { data: logs } = await supabase
      .from('daily_logs')
      .select('habit_id, completed')
      .eq('user_id', userId);

    const insights = [];

    if (!habits || habits.length === 0) {
      return res.json({ insights: [] });
    }

    const habitStats = habits.map(h => {
      const hLogs = logs?.filter(l => l.habit_id === h.id) || [];
      const completed = hLogs.filter(l => l.completed === 1).length;
      return {
        name: h.name,
        icon: h.icon,
        rate: hLogs.length > 0 ? Math.round((completed / hLogs.length) * 100) : 0
      };
    });

    const bestHabit = [...habitStats].sort((a, b) => b.rate - a.rate)[0];
    if (bestHabit && bestHabit.rate > 0) {
      insights.push({
        type: 'success',
        icon: bestHabit.icon || '🔥',
        title: 'Top Performing Habit',
        message: `Your habit "${bestHabit.name}" is your best performing habit with a completion rate of ${bestHabit.rate}%. Keep it up!`
      });
    }

    insights.push({
      type: 'info',
      icon: '📊',
      title: 'Habit Diversity',
      message: `You are tracking ${habits.length} different habits across multiple categories. Good job diversifying your goals!`
    });

    insights.push({
      type: 'warning',
      icon: '💡',
      title: 'Consistency Tip',
      message: 'Try to complete your habits at the same time each day to build stronger triggers and lock in the routine.'
    });

    res.json({ insights });
  } catch (error) {
    console.error('Get insights error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
