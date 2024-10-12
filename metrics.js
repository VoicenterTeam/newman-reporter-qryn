const { QrynClient } = require('qryn-client');


module.exports=  class metrics {
    constructor(emitter, reporterOptions, collectionRunOptions){
        this.emitter =emitter
        this.reporterOptions =reporterOptions||{}
        this.collectionRunOptions =collectionRunOptions
        this.metricsRepository=[]
        this.qrynClient = new QrynClient(
            reporterOptions.server
        );
    }
    Init(){
        this.emitter.on('request',(err, summary)=> {
            self.RequestEventHandler(err, summary)
        })
        this.emitter.on('assertion',(err, summary)=> {
            self.AssertionEventHandler(err, summary)
        })
        this.emitter.on('done',(err, summary)=> {
            self.CollectionEventHandler(err, summary)
        })
    }
    Set(metricName,value,labels ={}){
        const metric  =  this.qrynClient.createMetric(metricName,labels)
        metric.addSample(value);
        this.metricsRepository.push(metric)
    }
    SendMetrics(){
        this.qrynClient.prom.push(Object.values(this.metricsRepository)).then((promResponse)=>{
            console.log(promResponse)
        }).catch((err)=>{
            console.error('qrynClient.prom.push error: ',err)
        });
    }
    RequestEventHandler(err, summary){
        const labels = this.GetItemLabels(summary)
        let requestID= this.GetObjectID(summary.item.name)
        this.Set(`responseTime`, summary.response.responseTime,labels)
        this.Set(`responseCode`, summary.response.code,labels)
        this.Set(`responseSize`, summary.response.responseSize,labels)

    }
    AssertionEventHandler(err, summary){
        const labels = this.GetItemLabels(summary)
        //  console.log('AssertionEventHandler.summary:', summary);
        let requestID= this.GetObjectID(summary.item.name)
        let testID= summary.assertion.replace(" ","_")

        let testStatus= "OK"
        if(summary.error){
            testStatus= summary.error.message
        }
        if(global.collectionName){
            this.Set(`Request.${global.collectionName}.${requestID}.Test.${testID}.Status`,testStatus,labels)
        } else {
            this.Set(`Test.${testID}.Status`,testStatus,labels)
        }
    }
    CollectionEventHandler(err, summary){
        // console.log('RequestEventHandler.summary:', summary);
        let collectionName= summary.collection.name
        const labels = this.GetItemLabels(summary)
        this.Set(`ResponseAverage`,summary.run.timings.responseAverage,labels)
        this.Set(`ResponseMin`,summary.run.timings.responseMin , labels)
        this.Set(`ResponseMax`,summary.run.timings.responseMax , labels)
        this.Set(`DnsAverage`,summary.run.timings.dnsAverage , labels)
        this.Set(`itemstotal`,summary.run.stats.items.total , labels)
        this.Set(`itemsfailed`,summary.run.stats.items.failed , labels)
        this.Set(`RequestsTotal`,summary.run.stats.requests.total , labels)
        this.Set(`RequestsFailed`,summary.run.stats.requests.failed , labels)
        this.Set(`TestsTotal`,summary.run.stats.assertions.total , labels)
        this.Set(`TestsFailed`,summary.run.stats.assertions.failed , labels)
        this.SendMetrics();
    }
    GetObjectID(objectName){
        console.log('GetMetricTag:', objectName);
        if(objectName.indexOf('-')>0){
            return objectName.split('-')[0]
        }else{
            return objectName
        }
    }
    GetItemLabels(summary){
        if(!this.reporterOptions.labels)this.reporterOptions.labels={}
        const labels = {...this.reporterOptions.labels}
        labels.collection = this.collectionRunOptions.collection.name ;
        labels.collectionID = this.collectionRunOptions.collection.id ;
        if(summary?.request){
            labels.method=summary.request.method;
            labels.path=summary.request.path;
            labels.host =summary.request.url.host.join('.')
        }
        if(summary.item){
            labels.itemName=summary.item.name
        }
        return labels;
    }
}
