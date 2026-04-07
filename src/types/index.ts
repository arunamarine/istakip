export type Role = 'manager' | 'staff'
export type TaskStatus = 'todo' | 'doing' | 'done' | 'cancelled'
export type Priority = 'low' | 'mid' | 'high'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  avatar_color: string
  created_at: string
}

export interface Task {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: Priority
  assignee_id: string | null
  created_by: string
  start_date: string | null
  due_date: string | null
  created_at: string
  updated_at: string
  assignee?: User
  creator?: User
  comments?: Comment[]
task_assignees?: { user_id: string; user?: { id: string; name: string; avatar_color: string } }[]
}



export interface Comment {
  id: string
  task_id: string
  user_id: string
  content: string
  created_at: string
  user?: User
}

export interface Notification {
  id: string
  user_id: string
  title: string
  body: string
  task_id: string | null
  is_read: boolean
  created_at: string
}
export interface TaskRequest {
  id: string
  task_id: string
  requester_id: string
  manager_id: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  task?: Task
  requester?: User
  manager?: User
}
