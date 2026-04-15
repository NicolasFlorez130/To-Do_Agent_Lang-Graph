import z from 'zod';
import { v4 as uuidv4, v4 } from 'uuid';
import { END, type ConditionalEdgeRouter, type GraphNode } from '@langchain/langgraph';
import { model, type AgentState } from '.';
import { MODEL_SYSTEM_MESSAGE, UPDATE_INSTRUCTION } from './message_templates';
import { ProfileSchema, ToDoSchema, UpdateMemory } from './schemas';
import { AIMessage, mergeMessageRuns, SystemMessage, ToolMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';

export enum StoreKeys {
    profile = 'profile',
    todo = 'todo',
    instructions = 'instructions',
}

export enum NodeKeys {
    taskMAIstro = 'task_mAIstro',
    updateProfile = 'update_profile',
    updateTodos = 'update_todos',
    updateInstructions = 'update_instructions',
}

export const taskMAIstro: GraphNode<AgentState> = async (state, config) => {
    const userId = config.configurable?.userId;

    // const [userProfileMemory, todosMemory, instructionsMemory] = await Promise.all(
    //     Object.values(StoreKeys).map(key => config.store?.search([key, userId])),
    // );

    const [userProfileMemory, todosMemory, instructionsMemory] = await Promise.all([
        config.store?.search([StoreKeys.profile, userId]),
        config.store?.search([StoreKeys.todo, userId]),
        config.store?.search([StoreKeys.instructions, userId]),
    ]);

    const userProfile = userProfileMemory?.at(0)?.value.toString() || '';
    const todos = todosMemory?.map(todo => todo.value?.toString())?.join('\n') ?? '';
    const instructions = instructionsMemory?.at(0)?.value.toString() || '';

    const systemMessage = new SystemMessage(MODEL_SYSTEM_MESSAGE(userProfile, todos, instructions));

    const response = await model
        .bindTools([
            tool(data => data, {
                name: 'updateMemory',
                description: 'Decision on what memory type to update',
                schema: UpdateMemory,
            }),
        ])
        .invoke([systemMessage, ...state.messages]);

    return {
        messages: [response],
    };
};

export const routeMessage: ConditionalEdgeRouter<AgentState> = async state => {
    const message = state.messages.at(-1) as AIMessage;

    switch (
        message.tool_calls?.at(0)?.args.update_type as z.infer<typeof UpdateMemory>['update_type']
    ) {
        case 'user':
            return NodeKeys.updateProfile;
        case 'todo':
            return NodeKeys.updateTodos;
        case 'instructions':
            return NodeKeys.updateInstructions;
    }

    return END;
};

export const updateProfile: GraphNode<AgentState> = async (state, config) => {
    const userId = config.configurable?.userId;

    const namespace = [StoreKeys.profile, userId];

    const existingItems = await config.store?.search(namespace);
    const existingProfile =
        existingItems && existingItems.length > 0 ? existingItems.at(-1)!.value : null;

    const instructionFormatted = UPDATE_INSTRUCTION(new Date().toISOString());

    const systemContent = `
        ${instructionFormatted}

        Here is the existing user profile (may be null if no information has been collected yet):
        ${JSON.stringify(existingProfile, null, 2)}
    `;

    const updatedMessages = mergeMessageRuns([
        new SystemMessage(systemContent),
        ...state.messages.slice(0, -1),
    ]);

    const structuredModel = model.withStructuredOutput(ProfileSchema, {
        name: NodeKeys.updateProfile,
    });

    const result = await structuredModel.invoke(updatedMessages);

    const key = existingItems && existingItems.length > 0 ? existingItems.at(-1)!.key : uuidv4();

    await config.store?.put(namespace, key, result);

    const lastMessage = state.messages.at(-1) as AIMessage;

    return {
        messages: [
            new ToolMessage({
                tool_call_id: lastMessage.tool_calls!.at(-1)!.id!,
                content: 'updated profile',
            }),
        ],
    };
};

export const updateTodos: GraphNode<AgentState> = async (state, config) => {
    const userId = config.configurable?.userId;

    const namespace = [StoreKeys.todo, userId];
    const existingItems = await config.store?.search(namespace);

    const instructionFormatted = UPDATE_INSTRUCTION(new Date().toISOString());

    const systemContent = `
        ${instructionFormatted}

        Here is the existing todos (may be null if no todo has been created yet):
        ${existingItems?.join('\n') || null}
    `;

    const updatedMessages = mergeMessageRuns([
        new SystemMessage(systemContent),
        ...state.messages.slice(0, -1),
    ]);

    const structuredModel = model.withStructuredOutput(ToDoSchema, {
        name: NodeKeys.updateTodos,
    });

    const result = await structuredModel.invoke(updatedMessages);

    await Promise.all(
        result.todos.map(todo => {
            const id = todo.id ?? v4();

            return config.store?.put(namespace, id, { ...todo, id });
        }),
    );

    const lastMessage = state.messages.at(-1) as AIMessage;

    return {
        messages: [
            new ToolMessage({
                tool_call_id: lastMessage.tool_calls!.at(-1)!.id!,
                content: result.todos.join('\n'),
            }),
        ],
    };
};

export const updateInstructions: GraphNode<AgentState> = async (state, config) => {
    const userId = config.configurable?.userId;

    const namespace = [StoreKeys.instructions, userId];
    const existingInstructions = await config.store?.search(namespace);

    const instructionFormatted = UPDATE_INSTRUCTION(new Date().toISOString());

    const systemContent = `
        ${instructionFormatted}

        Here is the existing instructions (may be null if no instruction has been created yet):
        ${existingInstructions?.join('\n') || null}
    `;

    const updatedInstructions = mergeMessageRuns([
        new SystemMessage(systemContent),
        ...state.messages.slice(0, -1),
    ]);

    const structuredModel = model.withConfig({
        runName: NodeKeys.updateInstructions,
    });

    const result = await structuredModel.invoke(updatedInstructions);

    const key =
        existingInstructions && existingInstructions.length > 0
            ? existingInstructions.at(-1)!.key
            : uuidv4();

    await config.store?.put(namespace, key, result);

    const lastMessage = state.messages.at(-1) as AIMessage;

    return {
        messages: [
            new ToolMessage({
                tool_call_id: lastMessage.tool_calls!.at(-1)!.id!,
                content: result.content,
            }),
        ],
    };
};
