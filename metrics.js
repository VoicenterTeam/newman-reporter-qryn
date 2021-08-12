const  io = require('@pm2/io');
module.exports=  class metrics {
    constructor(){
        this.emitter =null
        this.metricsRepository={}
        //   console.log('process.env:', process.env);
    }
    Init(emitter){
        this.emitter =emitter;
        let self =this;
        emitter.on('request',(err, summary)=> {
            self.RequestEventHandler(err, summary)
        })
        emitter.on('assertion',(err, summary)=> {
            self.AssertionEventHandler(err, summary)
        })
        emitter.on('done',(err, summary)=> {
            self.CollectionEventHandler(err, summary)
        })
    }
    Set(metricName,value){
        this.CreateMetrics(metricName)
        this.metricsRepository[metricName].set(value);
        console.log(" Set(metricName,value)", metricName,value)
    }
    CreateMetrics(metricName){
        if(!this.metricsRepository[metricName]){
            this.metricsRepository[metricName] = io.metric({
                name    : metricName
            })
        }
    }
    RequestEventHandler(err, summary){
        //   console.log('RequestEventHandler.summary:', summary);
        let requestID= this.GetObjectID(summary.item.name)
        if(global.collectionName){
            this.Set(`Request.${global.collectionName}.${requestID}.responseTime`,summary.response.responseTime)
            this.Set(`Request.${global.collectionName}.${requestID}.responseCode`,summary.response.code)
            this.Set(`Request.${global.collectionName}.${requestID}.responseSize`,summary.response.responseSize)
        } else {
            this.Set(`Request.${requestID}.responseTime`, summary.response.responseTime)
            this.Set(`Request.${requestID}.responseCode`, summary.response.code)
            this.Set(`Request.${requestID}.responseSize`, summary.response.responseSize)
        }

    }
    AssertionEventHandler(err, summary){
        //  console.log('AssertionEventHandler.summary:', summary);
        let requestID= this.GetObjectID(summary.item.name)
        let testID= summary.assertion.replace(" ","_")

        let testStatus= "OK"
        if(summary.error){
            testStatus= summary.error.message
        }
        if(global.collectionName){
            this.Set(`Request.${global.collectionName}.${requestID}.Test.${testID}.Status`,testStatus)
        } else {
            this.Set(`Request.${requestID}.Test.${testID}.Status`,testStatus)
        }
    }
    CollectionEventHandler(err, summary){
        // console.log('RequestEventHandler.summary:', summary);
        let collectionName= summary.collection.name
        this.Set(`Collection.${collectionName}.ResponseAverage`,summary.run.timings.responseAverage)
        this.Set(`Collection.${collectionName}.ResponseMin`,summary.run.timings.responseMin)
        this.Set(`Collection.${collectionName}.ResponseMax`,summary.run.timings.responseMax)
        this.Set(`Collection.${collectionName}.DnsAverage`,summary.run.timings.dnsAverage)
        this.Set(`Collection.${collectionName}.items.total`,summary.run.stats.items.total)
        this.Set(`Collection.${collectionName}.items.failed`,summary.run.stats.items.failed)
        this.Set(`Collection.${collectionName}.RequestsTotal`,summary.run.stats.requests.total)
        this.Set(`Collection.${collectionName}.RequestsFailed`,summary.run.stats.requests.failed)
        this.Set(`Collection.${collectionName}.TestsTotal`,summary.run.stats.assertions.total)
        this.Set(`Collection.${collectionName}.TestsFailed`,summary.run.stats.assertions.failed)
    }
    GetObjectID(objectName){
        console.log('GetMetricTag:', objectName);
        if(objectName.indexOf('-')>0){
            return objectName.split('-')[0]
        }else{
            return objectName
        }
    }
}
