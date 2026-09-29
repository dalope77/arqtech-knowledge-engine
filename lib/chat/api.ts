import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
export const supabase = createClient(supabaseUrl, supabaseKey);

export interface Thread {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  thread_id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  agent_id?: string;
  metadata?: any;
  created_at: string;
}

// ---------------------------------------------
// THREADS
// ---------------------------------------------

export async function createThread(title: string = "Nueva Conversación"): Promise<Thread | null> {
  const { data, error } = await supabase
    .from('threads')
    .insert([{ title }])
    .select()
    .single();

  if (error) {
    console.error('Error creating thread:', error);
    return null;
  }
  return data;
}

export async function getThreads(): Promise<Thread[]> {
  const { data, error } = await supabase
    .from('threads')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching threads:', error);
    return [];
  }
  return data || [];
}

export async function updateThreadTitle(threadId: string, title: string): Promise<boolean> {
  const { error } = await supabase
    .from('threads')
    .update({ title, updated_at: new Date().toISOString() })
    .eq('id', threadId);

  return !error;
}

// ---------------------------------------------
// MESSAGES
// ---------------------------------------------

export async function getMessages(threadId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
  return data || [];
}

export async function addMessage(
  threadId: string,
  role: 'user' | 'assistant' | 'system' | 'tool',
  content: string,
  agentId?: string,
  metadata?: any
): Promise<Message | null> {
  const { data, error } = await supabase
    .from('messages')
    .insert([{ 
      thread_id: threadId, 
      role, 
      content, 
      agent_id: agentId, 
      metadata 
    }])
    .select()
    .single();

  if (error) {
    console.error('Error adding message:', error);
    return null;
  }

  // Update thread's updated_at timestamp
  await supabase
    .from('threads')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', threadId);

  return data;
}
