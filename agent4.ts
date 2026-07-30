//MemorySaver Concept using configurable concept while defining config

import { createAgent, initChatModel, tool } from "langchain";
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

const model = await initChatModel(
    "claude-sonnet-4-6", {
    temperatur: 0.7, timeout: 30, max_tokens: 1000
}
)

const checkpointer = new MemorySaver();

const agent = createAgent({
    model: model,
    tools: [getUserLocation, getWeather],
    systemPrompt,
    responseFormat,
    checkpointer
});


const response = await agent.invoke({
    messages: [{ role: "user", content: "what is weather outside" }]
}, config);

const longMessage = response.messages[response.messages.length - 1].content
console.log(longMessage);

const response2 = await agent.invoke({
    messages: [{ role: "user", content: "what is location did you tell me about?" }]
}, config);

const longMessage2 = response2.messages[response2.messages.length - 1].content
console.log(longMessage2);

const response3 = await agent.invoke({
    messages: [{ role: "user", content: "suggest me good places to have food in that location?" }]
}, config);

const longMessage3 = response3.messages[response3.messages.length - 1].content
console.log(longMessage3);

const response4 = await agent.invoke({
    messages: [{ role: "user", content: "what is weather of the location" }]
}, qaconfig);

const longMessage4 = response4.messages[response4.messages.length - 1].content
console.log(longMessage4);