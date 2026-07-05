import {createAgent, tool} from "langchain";
import "dotenv/config" ;
import z from "zod";


const getWeather = tool((input)=>{
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

const getTime = tool((input)=>{
        return `the time in ${input.city} is 12:00 PM`; 
    },
    {
        name:"get_time",
        description: "Get the current time in a given city",
        schema: z.object({
            city: z.string(),
        }),
    }
);


const agent = createAgent({
    model: "claude-sonnet-4-6",
    tools: [getWeather, getTime],
});

const response = await agent.invoke({
    // messages: [{role: "user", content: "what is weather in berlin"}]
    messages: [{role: "user", content: "what is weather and time in berlin"}]
});

console.log(response);

const longMessage = response.messages[response.messages.length-1].content
console.log(longMessage);