// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityHandler, MessageFactory } = require('botbuilder');
const { QnAMaker } = require('botbuilder-ai');
const IntentRecognier = require('./intentrecognizer');
const { TextAnalyticsClient, AzureKeyCredential} = require('@azure/ai-text-analytics');

class EchoBot extends ActivityHandler {
    constructor(configuration, qnaOptions) {
        super();
        const key = 'cb52b2d2cc974a34a577734a0b18b41e';
        const endpoint = 'https://ev-parking-assistant-text-analytics.cognitiveservices.azure.com/';

        const textAnalyticsClient = new TextAnalyticsClient(endpoint, new AzureKeyCredential(key));

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

            var answeredByLuis = 0;
            // Determine which service to respond with
            if (LuisResult.luisResult.prediction.topIntent == 'findParking' &&
                LuisResult.intents.findParking.score > .6 &&
                LuisResult.entities.$instance && 
                LuisResult.entities.$instance.location &&
                LuisResult.entities.$instance.location[0]){
                    answeredByLuis = 1;
                    const location = LuisResult.entities.$instance.location[0].text;
                    // call api with location entity info
                    const getLocationOfParking = 'I found parking with a charging station in ' + location;
                    console.log(getLocationOfParking);
                    await context.sendActivity(getLocationOfParking);
            }

            if (LuisResult.luisResult.prediction.topIntent == 'findSuperchargers' &&
                LuisResult.intents.findSuperchargers.score > .6 &&
                LuisResult.entities.$instance && 
                LuisResult.entities.$instance.location &&
                LuisResult.entities.$instance.location[0]){
                
                    answeredByLuis = 1;
                    const location = LuisResult.entities.$instance.location[0].text;
                    // call api with location entity info
                    const getLocationOfParking = 'I found parking with a supercharge support in ' + location;
                    console.log(getLocationOfParking);
                    await context.sendActivity(getLocationOfParking);
            }

            // If an answer was received from QnA maker, send it back to the user.
            if (answeredByLuis == 0){

                if(qnaResults[0]){
                    console.log(qnaResults[0])
                    await context.sendActivity(`${qnaResults[0].answer}`);
                }
                else{
                    // If no answer was received from QnA maker, reply with help.
                    await context.sendActivity(`I'm not sure `
                    + 'I found an answer to your question. '
                    + `You can ask me questions about electric vehicales like "how can I charge my car?"`);
                }
            }

            // Call the sentiment analysis function on the context text
            await sentimentAnalysis(textAnalyticsClient, context.activity.text);

            // Call the entity recognition function on the context text
            await entityRecognition(textAnalyticsClient, context.activity.text);

            // Call the key phrase extraction function on the context text
            await keyPhraseExtraction(textAnalyticsClient, context.activity.text);

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

        async function sentimentAnalysis(client,userText){
            console.log("Running sentiment analysis on: " + userText);
            const sentimentInput = [ userText ];
            const sentimentResult = await client.analyzeSentiment(sentimentInput);
            console.log("Got sentiment result");
            // This is where you send the sentimentInput and sentimentResults to a database or storage instead of the console
            sentimentResult.forEach(document => {
                  console.log(`ID: ${document.id}`);
                  console.log(`\tDocument Sentiment: ${document.sentiment}`);
                  console.log(`\tDocument Scores:`);
                  console.log(`\t\tPositive: ${document.confidenceScores.positive.toFixed(2)} \tNegative: ${document.confidenceScores.negative.toFixed(2)} \tNeutral: ${document.confidenceScores.neutral.toFixed(2)}`);
                  console.log(`\tSentences Sentiment(${document.sentences.length}):`);
                  document.sentences.forEach(sentence => {
                        console.log(`\t\tSentence sentiment: ${sentence.sentiment}`)
                        console.log(`\t\tSentences Scores:`);
                        console.log(`\t\tPositive: ${sentence.confidenceScores.positive.toFixed(2)} \tNegative: ${sentence.confidenceScores.negative.toFixed(2)} \tNeutral: ${sentence.confidenceScores.neutral.toFixed(2)}`);
                      });
             });
       }

       async function entityRecognition(client, userText){
            console.log('Running entity recognition on: ' + userText);
            const inputText = [ userText ];
            const entityResult = await client.recognizeEntities(inputText);
            console.log(entityResult[0]);
        }
        
        async function keyPhraseExtraction(client, userText){
            console.log('Running key phrase extraction on: ' + userText);
            const inputText = [ userText ];
            const keyPhrases = await client.extractKeyPhrases(inputText);
            console.log(keyPhrases[0]);
        }  

    }
}

module.exports.EchoBot = EchoBot;
