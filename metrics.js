const { QrynClient } = require('qryn-client');
const stringify = require('json-stringify-safe');
module.exports=  class metrics {
    constructor(emitter, reporterOptions, collectionRunOptions){
        this.emitter =emitter
        this.reporterOptions =reporterOptions||{}
        this.collectionRunOptions =collectionRunOptions
        this.metricsRepository=[]
        this.logRepository = []
        if(reporterOptions.server.timeout &&reporterOptions.server.timeout.constructor.name==="String"){
            try{
                reporterOptions.server.timeout= Number.parseInt(reporterOptions.server.timeout)
            }catch(e){
                reporterOptions.server.timeout= 60000
            }
        }
        this.qrynClient = new QrynClient(
            reporterOptions.server
        );
    }
    Init(){
        let self = this;
        this.emitter.on('request',(err, summary)=> {
            self.RequestEventHandler(err, summary)
        })
        this.emitter.on('assertion',(err, summary)=> {
            self.AssertionEventHandler(err, summary)
        })
        this.emitter.on('done',(err, summary)=> {
            self.CollectionEventHandler(err, summary)
        })
        this.emitter.on('test',(err, summary)=> {
            self.TestEventHandler(err, summary)
        })
        this.emitter.on('console',(err, summary)=> {
            self.ConsoleEventHandler(err, summary)
        })
        this.emitter.on('exception',(err, summary)=> {
            self.ExceptionEventHandler(err, summary)
        })
    }
    LogEvent(eventType,label,value){
        if( value.response?.stream  && value.response.stream.constructor.name === 'Buffer' ){
            value.response.body =value.response.stream.toString()
            delete  value.response.stream;
        }
        label.eventType = eventType
        const stream = this.qrynClient.createStream(label);
        stream.addEntry(Date.now(), stringify(value, null,2));
        this.logRepository.push(stream)
    }
    LogError(eventType,label,error){
        if(!error)return;
        label.eventType = eventType + 'Error'
        const stream = this.qrynClient.createStream(label);
        stream.addEntry(Date.now(), stringify(error,null,2));
        this.logRepository.push(stream)
    }
    Set(metricName,value,labels ={}){
        const metric  =  this.qrynClient.createMetric({name:metricName,labels})
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
    SendLogs(){
        this.qrynClient.loki.push(Object.values(this.logRepository)).then((lokiResponse)=>{
            console.log(lokiResponse)
        }).catch((err)=>{
            console.error('qrynClient.loki.push error: ',err)
        });
    }
    RequestEventHandler(err, summary){
        const labels = this.GetItemLabels(summary)
        labels.eventType = "RequestSummary"
        this.LogEvent(labels.eventType,labels,summary)
        this.LogError(labels.eventType,labels,err)
        if(summary.response?.responseTime)this.Set(`responseTime`, summary.response.responseTime,labels)
        if(summary.response?.code)this.Set(`responseCode`, summary.response.code,labels)
        if(summary.response?.responseSize)this.Set(`responseSize`, summary.response.responseSize,labels)

    }
    AssertionEventHandler(err, summary){
        const labels = this.GetItemLabels(summary)
        labels.eventType = "AssertionSummary"
        //  console.log('AssertionEventHandler.summary:', summary);
        labels.test = summary.assertion
        this.LogEvent(labels.eventType,labels,summary)
        this.LogError(labels.eventType,labels,err)
        let testStatus= 1
        if(summary.error){
            testStatus= -1
        }
        this.Set(`assertionStatus`,testStatus,labels)
    }
    ExceptionEventHandler(err, summary){
        const labels = this.GetItemLabels(summary)
        labels.eventType = "Exception"
        this.LogEvent(labels.eventType,labels,summary.error)
        this.Set(`Exception`,1,labels)
    }
    ConsoleEventHandler(err, summary){
        const labels = this.GetItemLabels(summary)
        labels.eventType = "Console"
        labels.level = summary.level
        this.LogEvent(labels.eventType,labels,summary.messages.join(", "))
        this.Set(`Exception`,1,labels)
    }
    TestEventHandler(err, summary){
        const labels = this.GetItemLabels(summary)
        labels.eventType = "Test"
        //  console.log('AssertionEventHandler.summary:', summary);
        labels.test = summary.item.name
        this.LogEvent(labels.eventType,labels,summary.executions)
        this.LogError(labels.eventType,labels,err)
        let testStatus= 1
        if(err){
            testStatus= -1
        }
        this.Set(`testStatus`,testStatus,labels)
    }
    CollectionEventHandler(err, summary){
        const labels = this.GetItemLabels(summary)
        labels.eventType = "CollectionSummary"
        this.LogEvent(labels.eventType,labels,summary)
        this.LogError(labels.eventType,labels,err)
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
        this.SendMetrics()
        this.SendLogs()
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
            labels.path=summary.request.url.path.join('/');
            labels.host =summary.request.url.host.join('.')
        }
        if(summary.item){
            labels.itemName=summary.item.name
        }
        if(summary.error){
            labels.errorName=summary.error.name
            labels.errorType=summary.error.type
        }
        return labels;
    }
}
