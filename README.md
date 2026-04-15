# To-Do Agent

A chatbot designed as a personal companion to help users keep track of their To-Do lists. 

> **Note:** This project is a TypeScript adaptation of the final project from the Langchain Academy course "LangGraph Foundations" in Python. The original implementation can be found here: [`memory_agent.py`](https://github.com/langchain-ai/langchain-academy/blob/main/module-5/studio/memory_agent.py).

This project uses LangGraph and LLMs to manage long-term memory across three main areas:

1. **User Profile**: General information about the user (name, location, job, connections, interests).
2. **To-Do List**: Tasks with details like estimated time, deadlines, actionable solutions, and status.
3. **General Instructions**: User-specified preferences for how their To-Do list should be managed and updated.

## Architecture

The agent is built with LangGraph and features a state graph with the following core nodes:
- `task_mAIstro`: The main conversational interface that retrieves memories, interacts with the user, and decides when to route to update nodes.
- `update_profile`: Extracts personal information from conversations to update the user's profile.
- `update_todos`: Extracts task-related information to update or insert items in the To-Do list.
- `update_instructions`: Learns from user feedback to update preferences on how items should be added or managed.

## Planned Features

- **Spy Integration**: The addition of a `Spy` mechanism (similar to the original Python implementation) is planned. This will inspect tool calls made during memory extraction (e.g., via Trustcall) to provide visibility into exact changes, such as identifying newly created memories versus patches to existing documents.

## Getting Started

Implement the environments from the .env.example in another .env or .env.local

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run config

bun run dev
```

This project was created using `bun init` in bun v1.2.23. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
