const Metrics  = require('./metrics')
module.exports=  function (emitter, reporterOptions, collectionRunOptions) {
    const metrics =  new Metrics(emitter, reporterOptions, collectionRunOptions);
    console.log("Starting newman-reporter-qryn plugin");
    metrics.Init();
};
