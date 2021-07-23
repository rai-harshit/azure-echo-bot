const {LuisRecognizer} = require('botbuilder-ai');

class IntentRecognier {
    constructor(config){
        const luisIsConfigured = config && config.applicationId && config.endpointKey && config.endpoint;
        if (luisIsConfigured) {
            const recognizerOptions = {
                apiVersion : 'v3'
            };

            this.recognizer = new LuisRecognizer(config, recognizerOptions);
        }
    }

    get isConfigured(){
        return this.recognizer !== undefined;
    }

    async executeLuisQuery(context){
        return await this.recognizer.recognize(context);
    }

    getLocationEntity(result){
        const locationEntity = result.entities.location;
        if (!locationEntity || !locationEntity[0]) {
            return undefined;
        }
        return locationEntity;
    }

}

module.exports = IntentRecognier