// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityHandler, MessageFactory } = require('botbuilder');
const { QnAMaker } = require('botbuilder-ai');
const IntentRecognier = require('./intentrecognizer');

class EchoBot extends ActivityHandler {
    constructor(configuration, qnaOptions) {
        super();
        if (!configuration) throw new Error('[QnAMakerBot]: Missing parameter. Configuration is required');
        
        // Create QnA connector
        this.qnaMaker = new QnAMaker(configuration.QnAConfiguration, qnaOptions);

        // Create a LUIS connector
        this.intentRecognier = new IntentRecognier(configuration.LuisConfiguration);

        // See https://aka.ms/about-bot-activity-message to learn more about the message and other activity types.
        this.onMessage(async (context, next) => {

            // Send user input to QnA maker
            const qnaResults = await this.qnaMaker.getAnswers(context);

            // Send user input to LUIS
            const LuisResult = await this.intentRecognier.executeLuisQuery(context);

            // Determine which service to respond with
            if (LuisResult.luisResult.prediction.topIntent == 'findParking' &&
                LuisResult.intents.findParking.score > .6 &&
                LuisResult.entities.$instance && 
                LuisResult.entities.$instance.location &&
                LuisResult.entities.$instance.location[0]){
                
                    const location = LuisResult.entities.$instance.location[0].text;
                    // call api with location entity info
                    const getLocationOfParking = 'I found parking with a charging station in ' + location;
                    console.log(getLocationOfParking);
                    await context.sendActivity(getLocationOfParking);
                    await next();
                    return;
            }

            if (LuisResult.luisResult.prediction.topIntent == 'findSuperchargers' &&
                LuisResult.intents.findSuperchargers.score > .6 &&
                LuisResult.entities.$instance && 
                LuisResult.entities.$instance.location &&
                LuisResult.entities.$instance.location[0]){
                
                    const location = LuisResult.entities.$instance.location[0].text;
                    // call api with location entity info
                    const getLocationOfParking = 'I found parking with a supercharge support in ' + location;
                    console.log(getLocationOfParking);
                    await context.sendActivity(getLocationOfParking);
                    await next();
                    return;
            }

            // If an answer was received from QnA maker, send it back to the user.
            if(qnaResults[0]){
                console.log(qnaResults[0])
                await context.sendActivity(`${qnaResults[0].answer}`);
            }
            else{
                // If no answer was received from QnA maker, reply with help.
                await context.sendActivity(`I'm not sure`
                + 'I found an answer to your question. '
                + `You can ask me questions about electric vehicales like "how can I charge my car?"`);
            }
            await next();
        });

        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            const welcomeText = 'Welcome to EV Parking Assistant.  I can help you find a charging station and parking.  You can say "find a charging station" or "find parking" or ask a question about electric vehicle charging';
            for (let cnt = 0; cnt < membersAdded.length; ++cnt) {
                if (membersAdded[cnt].id !== context.activity.recipient.id) {
                    await context.sendActivity(MessageFactory.text(welcomeText, welcomeText));
                }
            }
            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
    }
}

module.exports.EchoBot = EchoBot;
