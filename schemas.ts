import z from 'zod';

export const UpdateMemory = z.object({
    update_type: z.enum(['user', 'todo', 'instructions']),
});

export const ProfileSchema = z.object({
    name: z.string().describe("The user's name"),
    location: z.string().describe("The user's location"),
    job: z.string().describe("The user's job"),
    connections: z
        .array(z.string())
        .nonoptional()
        .describe('Personal connection of the user, such as family members, friends, or coworkers'),
    interests: z.array(z.string()).nonoptional().describe('Interests that the user has'),
});

export const ToDoSchema = z.object({
    todos: z.array(
        z.object({
            id: z.string().describe('The key that will be used to store the ToDo in memory'),
            task: z.string().describe('The task to be completed.'),
            timeToComplete: z.int().describe('Estimated time to complete the task (minutes).'),
            deadline: z
                .string()
                .describe('The date string when the task needs to be completed by (if applicable)'),
            solutions: z
                .array(z.string())
                .default([])
                .describe(
                    'List of specific, actionable solutions (e.g., specific ideas, service providers, or concrete options relevant to completing the task)',
                ),
            status: z
                .literal(['not started', 'in progress', 'done', 'archived'])
                .describe('Current status of the task'),
        }),
    ),
});
