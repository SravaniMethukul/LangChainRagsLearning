//middleware concept

import { createAgent, createMiddleware, initChatModel, tool } from "langchain";
import "dotenv/config";
import z from "zod";
import { MemorySaver } from "@langchain/langgraph";

const systemPrompt = `You are expert weather forcaster who also speaks in humour way.
You have access to a tool called get_user_location which can retrieve the location of the user based on their userId.
You have access to a tool called get_Weather which can retrieve the current weather in a given city.
If user asks make sure you have location first, then use the location to get the weather and respond to user with the weather information.`;

const getUserLocation = tool((_, config) => {
    const user_Id = config.context.user_id
    // fire database to get location of user based on userId/API
    return user_Id === "1" ? "berlin" : "london";
},
    {
        name: "get_user_location",
        description: "Retrieve user information based on userId",
        schema: z.object({}),
    });

const getWeather = tool((input) => {
    // ${input.city} - by getting weather - returned sunny
    return `its sunny in ${input.city}`;
},
    {
        name: "get_Weather",
        description: "Get the current weather in a given city",
        schema: z.object({
            city: z.string(),
        }),
    }
);

const advancedModel = await initChatModel(
    "claude-sonnet-4-6", {
    temperature: 0.7, timeout: 30000, maxTokens: 1000
}
);

const basicModel = await initChatModel("claude-sonnet-4-6", {
    temperature: 0.7,
    timeout: 30000,
    maxTokens: 1000,
});

const dynamicModelSelection = createMiddleware({
    name: "DynamicModelSelection",
    wrapModelCall: async (request, handler) => {
        const messageCount = request.messages.length;
        return handler({
            ...request,
            model: messageCount > 3 ? advancedModel : basicModel
        });
    }
})

const config = {
    configurable: { thread_id: "1" },
    context: { user_id: "1" }
}

const qaconfig = {
    configurable: { thread_id: "2" },
    context: { user_id: "3" }
}

const responseFormat = z.object({
    humour_response: z.string(),
    weather_response: z.string(),
    time_response: z.string(),
    location_response: z.string(),
    additional_info: z.string().optional()
});

const checkpointer = new MemorySaver();

const agent = createAgent({
    model: advancedModel,
    tools: [getUserLocation, getWeather],
    systemPrompt,
    checkpointer,
    middleware: [dynamicModelSelection] as const
});


const response = await agent.invoke({
    messages: [{ role: "user", content: "what is weather outside" }]
}, config);
console.log("Response 1:", response.messages[response.messages.length - 1].content);

const response2 = await agent.invoke({
    messages: [{ role: "user", content: "what is location did you tell me about?" }]
}, config);
console.log("Response 2:", response2.messages[response2.messages.length - 1].content);

const response3 = await agent.invoke({
    messages: [{ role: "user", content: "suggest me good places to have food in that location?" }]
}, config);
console.log("Response 3:", response3.messages[response3.messages.length - 1].content);

const response4 = await agent.invoke({
    messages: [{ role: "user", content: "what is weather of the location" }]
}, qaconfig);
console.log("Response 4:", response4.messages[response4.messages.length - 1].content);
