import { ChatGoogle } from '@langchain/google';
import {
    END,
    MessagesValue,
    START,
    StateGraph,
    StateSchema,
    MemorySaver,
} from '@langchain/langgraph';
import {
    NodeKeys,
    routeMessage,
    taskMAIstro,
    updateInstructions,
    updateProfile,
    updateTodos,
} from './nodes';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const state = new StateSchema({
    messages: MessagesValue,
});

export type AgentState = typeof state;

export const model = new ChatGoogle({ model: 'gemini-2.5-flash' });

const builder = new StateGraph(state)
    .addNode(NodeKeys.taskMAIstro, taskMAIstro)
    .addNode(NodeKeys.updateProfile, updateProfile)
    .addNode(NodeKeys.updateTodos, updateTodos)
    .addNode(NodeKeys.updateInstructions, updateInstructions)
    .addEdge(START, NodeKeys.taskMAIstro)
    .addConditionalEdges(NodeKeys.taskMAIstro, routeMessage)
    .addEdge(NodeKeys.updateProfile, NodeKeys.taskMAIstro)
    .addEdge(NodeKeys.updateTodos, NodeKeys.taskMAIstro)
    .addEdge(NodeKeys.updateInstructions, NodeKeys.taskMAIstro);

export const graph = builder.compile({ checkpointer: new MemorySaver(), name: 'ToDo Agent' });
