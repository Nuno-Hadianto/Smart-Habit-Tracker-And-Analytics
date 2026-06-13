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
    const completedToday = todayLogs?.filter(log => log.completed).length || 0;

    // Get total completions
    const { data: allLogs } = await supabase
      .from('daily_logs')
      .select('completed')
      .eq('user_id', userId)
      .eq('completed', 1);

    const totalCompletions = allLogs?.length || 0;

    res.json({
      totalHabits,
      completedToday,
      completionRate: totalHabits > 0 ? Math.round((completedToday / totalHabits) * 100) : 0,
      totalCompletions
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

    const weekData = {};
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const { data: logs } = await supabase
        .from('daily_logs')
        .select('completed')
        .eq('user_id', userId)
        .eq('date', dateStr)
        .eq('completed', 1);

      weekData[dateStr] = logs?.length || 0;
    }

    res.json({ weekData });
  } catch (error) {
    console.error('Get weekly error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
