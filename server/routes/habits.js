import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database/supabase.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const supabase = getDb();
    const { data: habits, error } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ habits: habits || [] });
  } catch (error) {
    console.error('Get habits error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const supabase = getDb();
    const { data: habit, error } = await supabase
      .from('habits')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (error || !habit) {
      return res.status(404).json({ error: 'Habit not found' });
    }

    res.json({ habit });
  } catch (error) {
    console.error('Get habit error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, category, color, icon, frequency, reminder_time, goal } = req.body;
    const supabase = getDb();

    if (!name || !category) {
      return res.status(400).json({ error: 'Name and category are required' });
    }

    const habitId = uuidv4();
    const { data: habit, error } = await supabase
      .from('habits')
      .insert([{
        id: habitId,
        user_id: req.user.id,
        name,
        description: description || '',
        category,
        color: color || '#3b82f6',
        icon: icon || 'circle',
        frequency: frequency || 'daily',
        reminder_time: reminder_time || null,
        goal: goal || 1
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ habit });
  } catch (error) {
    console.error('Create habit error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, description, category, color, icon, frequency, reminder_time, goal } = req.body;
    const supabase = getDb();

    const { data: existing, error: checkError } = await supabase
      .from('habits')
      .select('id')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (checkError || !existing) {
      return res.status(404).json({ error: 'Habit not found' });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (color !== undefined) updateData.color = color;
    if (icon !== undefined) updateData.icon = icon;
    if (frequency !== undefined) updateData.frequency = frequency;
    if (reminder_time !== undefined) updateData.reminder_time = reminder_time;
    if (goal !== undefined) updateData.goal = goal;
    updateData.updated_at = new Date().toISOString();

    const { data: habit, error } = await supabase
      .from('habits')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ habit });
  } catch (error) {
    console.error('Update habit error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const supabase = getDb();

    const { data: existing, error: checkError } = await supabase
      .from('habits')
      .select('id')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (checkError || !existing) {
      return res.status(404).json({ error: 'Habit not found' });
    }

    const { error } = await supabase
      .from('habits')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Habit deleted successfully' });
  } catch (error) {
    console.error('Delete habit error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/meta/categories', authenticateToken, (req, res) => {
  const categories = [
    { id: 'health', name: 'Health & Fitness', icon: 'heart', color: '#22c55e' },
    { id: 'productivity', name: 'Productivity', icon: 'trending-up', color: '#3b82f6' },
    { id: 'learning', name: 'Learning', icon: 'book', color: '#a855f7' },
    { id: 'mindfulness', name: 'Mindfulness', icon: 'sun', color: '#14b8a6' },
    { id: 'social', name: 'Social', icon: 'users', color: '#f97316' },
    { id: 'finance', name: 'Finance', icon: 'dollar-sign', color: '#eab308' },
    { id: 'creativity', name: 'Creativity', icon: 'palette', color: '#ec4899' },
    { id: 'other', name: 'Other', icon: 'pin', color: '#6b7280' }
  ];
  res.json({ categories });
});

export default router;
