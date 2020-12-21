const metrics =  new (require('./metrics'))();
module.exports=  function (emitter, reporterOptions, collectionRunOptions) {

    console.log("Starting newman-reporter-pm2 plugin");
    metrics.Init(emitter);
    console.log("reporterOptions",reporterOptions);
    console.log("collectionRunOptions",collectionRunOptions);
};
