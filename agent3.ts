import { createAgent, tool } from "langchain";
import "dotenv/config" ;
import z from "zod";

const systemPrompt = `You are expert weather forcaster who also speaks in humour way.
You have access to a tool called get_user_location which can retrieve the location of the user based on their userId.
You have access to a tool called get_Weather which can retrieve the current weather in a given city.
If user asks make sure you have location first, then use the location to get the weather and respond to user with the weather information.`;

const getUserLocation = tool((_,config)=>{
    const user_Id = config.context.user_id
    // fire database to get location of user based on userId/API
    return user_Id === "1" ? "berlin" : "london";
},
{
    name: "get_user_location",
    description: "Retrieve user information based on userId",
    schema: z.object({}),
});

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

const config = {
    context : {user_id: "1"}
}

const qaconfig = {
    context : {user_id: "3"}
}

const responseFormat = z.object({
    humour_response: z.string(),
    weather_response: z.string(),
    time_response: z.string(),
    location_response: z.string(),
    additional_info: z.string().optional()
});

const agent = createAgent({
    model: "claude-sonnet-4-6",
    tools: [getUserLocation, getWeather],
    systemPrompt,
    responseFormat
});


const response= await agent.invoke({
    messages: [{ role: "user", content: "what is weather outside" }]
}, config);

console.log(response);
console.log(response.structuredResponse);