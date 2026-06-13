import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database/supabase.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

async function calculateStreak(habitId, userId) {
  const supabase = getDb();
  const { data: entries, error } = await supabase
    .from('daily_logs')
    .select('date, completed')
    .eq('habit_id', habitId)
    .eq('user_id', userId)
    .eq('completed', 1)
    .order('date', { ascending: false });

  if (error || !entries || entries.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < entries.length; i++) {
    const entryDate = new Date(entries[i].date);
    entryDate.setHours(0, 0, 0, 0);
    
    const expectedDate = new Date(today);
    expectedDate.setDate(expectedDate.getDate() - i);

    if (entryDate.getTime() === expectedDate.getTime()) {
      streak++;
    } else if (i === 0) {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      if (entryDate.getTime() === yesterday.getTime()) {
        streak++;
      } else {
        break;
      }
    } else {
      break;
    }
  }

  return streak;
}

const allBadges = [
  { id: 'streak-3', name: '3-Day Streak', description: 'Maintain a 3-day completion streak on any habit', icon: '🔥', requirement_type: 'streak', requirement_value: 3 },
  { id: 'streak-7', name: '7-Day Streak', description: 'Maintain a 7-day completion streak on any habit', icon: '⚡', requirement_type: 'streak', requirement_value: 7 },
  { id: 'streak-30', name: '30-Day Streak', description: 'Maintain a 30-day completion streak on any habit', icon: '👑', requirement_type: 'streak', requirement_value: 30 },
  { id: 'completions-10', name: 'Habit Enthusiast', description: 'Complete habit check-ins 10 times in total', icon: '🌟', requirement_type: 'total_completions', requirement_value: 10 },
  { id: 'completions-50', name: 'Habit Master', description: 'Complete habit check-ins 50 times in total', icon: '🏆', requirement_type: 'total_completions', requirement_value: 50 },
  { id: 'habits-5', name: 'Habit Builder', description: 'Create 5 active habits in your list', icon: '📋', requirement_type: 'habits_created', requirement_value: 5 }
];

async function checkAndAwardBadges(userId, streak, habitsCount, totalCompletions) {
  const supabase = getDb();
  
  // Get already earned badges
  const { data: earned } = await supabase
    .from('badges')
    .select('name')
    .eq('user_id', userId);

  const earnedNames = new Set((earned || []).map(b => b.name));
  const newBadges = [];

  for (const badge of allBadges) {
    if (earnedNames.has(badge.name)) continue;

    let qualified = false;
    if (badge.requirement_type === 'streak' && streak >= badge.requirement_value) {
      qualified = true;
    } else if (badge.requirement_type === 'total_completions' && totalCompletions >= badge.requirement_value) {
      qualified = true;
    } else if (badge.requirement_type === 'habits_created' && habitsCount >= badge.requirement_value) {
      qualified = true;
    }

    if (qualified) {
      // Insert into badges table
      const { data: inserted, error } = await supabase
        .from('badges')
        .insert([{
          user_id: userId,
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
          requirement_type: badge.requirement_type,
          requirement_value: badge.requirement_value
        }])
        .select()
        .single();
      
      if (!error && inserted) {
        newBadges.push(inserted);
      }
    }
  }

  return newBadges;
}


router.get('/habit/:habitId', authenticateToken, async (req, res) => {
  try {
    const supabase = getDb();
    const { startDate, endDate } = req.query;
    
    let query = supabase
      .from('daily_logs')
      .select('*')
      .eq('habit_id', req.params.habitId)
      .eq('user_id', req.user.id)
      .order('date', { ascending: false });

    if (startDate && endDate) {
      query = query
        .gte('date', startDate)
        .lte('date', endDate);
    }

    const { data: entries, error } = await query;
    if (error) throw error;

    const streak = await calculateStreak(req.params.habitId, req.user.id);
    res.json({ entries: entries || [], streak });
  } catch (error) {
    console.error('Get tracking entries error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/date/:date', authenticateToken, async (req, res) => {
  try {
    const supabase = getDb();
    
    const { data: entries, error: entriesError } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('date', req.params.date);

    if (entriesError) throw entriesError;

    const { data: habits, error: habitsError } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (habitsError) throw habitsError;

    const entriesWithHabits = (habits || []).map(habit => {
      const entry = entries?.find(e => e.habit_id === habit.id);
      if (entry) {
        return {
          ...entry,
          habit_name: habit.name,
          habit_icon: habit.icon,
          habit_color: habit.color,
          category: habit.category
        };
      }
      return {
        habit_id: habit.id,
        habit_name: habit.name,
        habit_icon: habit.icon,
        habit_color: habit.color,
        category: habit.category,
        date: req.params.date,
        completed: 0,
        notes: ''
      };
    });

    res.json({ entries: entriesWithHabits });
  } catch (error) {
    console.error('Get date entries error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { habit_id, date, completed, notes } = req.body;
    const supabase = getDb();

    if (!habit_id || !date) {
      return res.status(400).json({ error: 'habit_id and date are required' });
    }

    const { data: habit, error: habitError } = await supabase
      .from('habits')
      .select('id')
      .eq('id', habit_id)
      .eq('user_id', req.user.id)
      .single();

    if (habitError || !habit) {
      return res.status(404).json({ error: 'Habit not found' });
    }

    const { data: existing } = await supabase
      .from('daily_logs')
      .select('id')
      .eq('habit_id', habit_id)
      .eq('date', date)
      .single();

    let entry;
    if (existing) {
      const { data: updated, error } = await supabase
        .from('daily_logs')
        .update({
          completed: completed ? 1 : 0,
          notes: notes || '',
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      entry = updated;
    } else {
      const { data: created, error } = await supabase
        .from('daily_logs')
        .insert([{
          id: uuidv4(),
          habit_id,
          user_id: req.user.id,
          date,
          completed: completed ? 1 : 0,
          notes: notes || ''
        }])
        .select()
        .single();

      if (error) throw error;
      entry = created;
    }

    const streak = await calculateStreak(habit_id, req.user.id);
    
    // Check and award badges
    const { count: habitsCount } = await supabase
      .from('habits')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', req.user.id);

    const { count: totalCompletions } = await supabase
      .from('daily_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .eq('completed', 1);

    const newBadges = await checkAndAwardBadges(req.user.id, streak, habitsCount || 0, totalCompletions || 0);

    res.json({ entry, streak, newBadges });
  } catch (error) {
    console.error('Track habit error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/badges', authenticateToken, async (req, res) => {
  try {
    const supabase = getDb();
    
    const { data: earnedBadges, error } = await supabase
      .from('badges')
      .select('*')
      .eq('user_id', req.user.id)
      .order('achieved_at', { ascending: false });

    if (error) throw error;

    res.json({ earnedBadges: earnedBadges || [], allBadges });
  } catch (error) {
    console.error('Get badges error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/calendar/:year/:month', authenticateToken, async (req, res) => {
  try {
    const supabase = getDb();
    const { year, month } = req.params;
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const endDate = `${year}-${month.padStart(2, '0')}-31`;

    const { data: entries, error } = await supabase
      .from('daily_logs')
      .select('date, completed, habits(id, name, color, icon)')
      .eq('user_id', req.user.id)
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) throw error;

    const calendar = {};
    for (const entry of entries || []) {
      if (!calendar[entry.date]) {
        calendar[entry.date] = { total: 0, completed: 0, habits: [] };
      }
      calendar[entry.date].total++;
      if (entry.completed) {
        calendar[entry.date].completed++;
      }
      
      const habitInfo = Array.isArray(entry.habits) ? entry.habits[0] : entry.habits;
      if (habitInfo) {
        calendar[entry.date].habits.push({
          id: habitInfo.id,
          name: habitInfo.name,
          color: habitInfo.color,
          icon: habitInfo.icon,
          completed: entry.completed === 1
        });
      }
    }

    res.json({ calendar });
  } catch (error) {
    console.error('Get calendar error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
