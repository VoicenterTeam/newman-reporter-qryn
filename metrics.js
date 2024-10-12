const { QrynClient } = require('qryn-client');


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
    }
    LogEvent(eventType,label,value){
        label.eventType = eventType
        const stream = this.qrynClient.createStream(label);
        stream.addEntry(Date.now(), JSON.stringify(value));
        this.logRepository.push(stream)
    }
    LogError(eventType,label,error){
        if(!error)return;
        label.eventType = eventType + 'Error'
        const stream = this.qrynClient.createStream(label);
        stream.addEntry(Date.now(), JSON.stringify(error));
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
        this.Set(`responseTime`, summary.response.responseTime,labels)
        this.Set(`responseCode`, summary.response.code,labels)
        this.Set(`responseSize`, summary.response.responseSize,labels)

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
        this.Set(`TestStatus`,testStatus,labels)

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
        return labels;
    }
}
